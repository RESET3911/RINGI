import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ── 型定義 ───────────────────────────────────────────────────────

interface RingiSettings {
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  ntfyTopic?: string;
}

interface UserSettings {
  ntfyTopic?: string;
  hobbyLedgerUser?: string; // 'けんしん' | 'れな' etc.
  cashflowUserId?: string;  // 'saku' | 'takahashi'
}

interface Application {
  applicant: "A" | "B";
  status: string;
  amount?: number;
  item: string;
  createdAt?: string;
  decidedAt?: string;
}

interface Income {
  userId?: string;
  invoiceDate: string;
  paidDate?: string;
  isPaid: boolean;
  amount: number;
  outsourcingCost?: number;
  incomeType?: string;
}

interface Expense {
  isActive?: boolean;
  amount: number;
  expenseType?: string;
  name?: string;
}

interface WishItem {
  status: string;
  name: string;
  createdAt?: string;
}

interface HobbyLog {
  user: string;
  date: string;
  duration: number;
  amount?: number;
  hobbyId?: string;
}

interface HobbyGoal {
  id: string;
  title: string;
  status?: string;
  progress?: number;
  targetValue?: number;
  currentValue?: number;
}

// ── ユーティリティ ────────────────────────────────────────────────

function fmtYen(n: number): string {
  return `¥${Math.abs(n).toLocaleString("ja-JP")}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 今週の範囲（日曜実行 → 月〜日の7日間）
function getWeekRange(now: Date): { start: string; end: string } {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: toDateStr(start), end: toDateStr(end) };
}

// 今月の範囲
function getMonthStart(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ストリーク計算
function calcCurrentStreak(logs: HobbyLog[], now: Date): number {
  if (logs.length === 0) return 0;
  const dateSet = new Set(logs.map((l) => l.date));
  let count = 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (!dateSet.has(toDateStr(d))) d.setDate(d.getDate() - 1);
  while (dateSet.has(toDateStr(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// ntfy送信
async function sendNtfy(topic: string, title: string, message: string): Promise<void> {
  if (!topic?.trim()) return;
  const res = await fetch("https://ntfy.sh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: topic.trim(),
      title,
      message,
      priority: 3,
      tags: ["chart_with_upwards_trend"],
    }),
  });
  if (!res.ok) {
    throw new Error(`ntfy HTTP ${res.status}: ${await res.text()}`);
  }
}

// エラーログをFirestoreに記録
async function logError(context: string, error: unknown): Promise<void> {
  try {
    await db.collection("notification_logs").add({
      type: "weekly_summary",
      status: "error",
      context,
      error: error instanceof Error ? error.message : String(error),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to write error log:", e);
  }
}

// ── メインの通知関数 ──────────────────────────────────────────────

export const weeklySummaryNotification = onSchedule(
  {
    schedule: "every sunday 09:00",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async () => {
    // JST 09:00 Sunday として動作（スケジューラーがTZ変換済み）
    const now = new Date();
    const weekRange = getWeekRange(now);
    const thisYM = getMonthStart(now);
    const todayStr = toDateStr(now);
    const in7DaysStr = toDateStr(new Date(now.getTime() + 7 * 86_400_000));
    const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

    console.log(`[weeklySummary] Running for week ${weekRange.start}〜${weekRange.end}, month ${thisYM}`);

    try {
      // ── 1. 設定を読み込む ──────────────────────────────────────

      const [ringiSettingsSnap, userASettingsSnap, userBSettingsSnap] = await Promise.all([
        db.doc("ringi/settings").get(),
        db.doc("settings/userA").get(),
        db.doc("settings/userB").get(),
      ]);

      const ringiSettings = ringiSettingsSnap.data() as RingiSettings | undefined;
      const userASettings = (userASettingsSnap.data() ?? {}) as UserSettings;
      const userBSettings = (userBSettingsSnap.data() ?? {}) as UserSettings;

      const userAName = ringiSettings?.userA?.name ?? "さく";
      const userBName = ringiSettings?.userB?.name ?? "たかはし";
      const userANtfy = userASettings.ntfyTopic ?? ringiSettings?.ntfyTopic ?? "";
      const userBNtfy = userBSettings.ntfyTopic ?? ringiSettings?.ntfyTopic ?? "";
      const userAHobby = userASettings.hobbyLedgerUser ?? "れな";
      const userBHobby = userBSettings.hobbyLedgerUser ?? "けんしん";

      // ntfyトピックが両方ないなら何もしない
      if (!userANtfy && !userBNtfy) {
        console.log("[weeklySummary] No ntfy topics configured, skipping.");
        return;
      }

      // ── 2. データを並列取得 ────────────────────────────────────

      const [
        applicationsSnap,
        incomesSnap,
        expensesSnap,
        wishlistSnap,
        hobbyLogsSnap,
        goalsSnap,
      ] = await Promise.all([
        db.collection("applications").get(),
        db.collection("cashflow_incomes").get(),
        db.collection("cashflow_expenses").get(),
        db.collection("wishlist").get(),
        db.collection("hobby_ledger_logs").get(),
        // ST GOALSは未実装の場合もあるためエラーを無視
        db.collection("goals").get().catch(() => null),
      ]);

      // ── 3. RINGI 集計 ─────────────────────────────────────────

      const allApps = applicationsSnap.docs.map((d) => d.data() as Application);

      // 今週の決裁済み（承認/否決は decidedAt, それ以外は createdAt で判定）
      const weekApproved = allApps.filter((a) => {
        const dt = (a.decidedAt ?? a.createdAt ?? "").slice(0, 10);
        return a.status === "approved" && dt >= weekRange.start && dt <= weekRange.end;
      });
      const weekRejected = allApps.filter((a) => {
        const dt = (a.decidedAt ?? a.createdAt ?? "").slice(0, 10);
        return a.status === "rejected" && dt >= weekRange.start && dt <= weekRange.end;
      });

      const pendingApps = allApps.filter((a) => a.status === "pending");
      const approvedAmount = weekApproved.reduce((s, a) => s + (a.amount ?? 0), 0);

      // 個別：自分が決裁すべき件数（相手の申請が pending）
      const userANeedReview = pendingApps.filter((a) => a.applicant === "B").length;
      const userBNeedReview = pendingApps.filter((a) => a.applicant === "A").length;

      // ── 4. CASHFLOW 集計 ──────────────────────────────────────

      const allIncomes = incomesSnap.docs.map((d) => d.data() as Income);
      const allExpenses = expensesSnap.docs.map((d) => d.data() as Expense);

      // 今月の請求ベースで集計
      const monthIncomes = allIncomes.filter((i) => i.invoiceDate.startsWith(thisYM));
      const confirmedIncome = monthIncomes
        .filter((i) => i.isPaid)
        .reduce((s, i) => s + i.amount - (i.outsourcingCost ?? 0), 0);
      const expectedIncome = monthIncomes
        .reduce((s, i) => s + i.amount - (i.outsourcingCost ?? 0), 0);

      // 月次固定費合計（アクティブな全費目）
      const monthlyBudget = allExpenses
        .filter((e) => e.isActive !== false)
        .reduce((s, e) => s + e.amount, 0);

      const spendingRate = expectedIncome > 0
        ? Math.round((monthlyBudget / expectedIncome) * 100)
        : 0;
      const surplus = confirmedIncome - monthlyBudget;

      // 7日以内の入金予定（未入金）
      const upcomingTotal = allIncomes
        .filter((i) => {
          if (i.isPaid) return false;
          const d = i.paidDate ?? i.invoiceDate;
          return d >= todayStr && d <= in7DaysStr;
        })
        .reduce((s, i) => s + i.amount - (i.outsourcingCost ?? 0), 0);

      // ── 5. WISHLIST 集計 ──────────────────────────────────────

      const allWishes = wishlistSnap.docs.map((d) => d.data() as WishItem);
      const unsubmittedCount = allWishes.filter((w) => w.status === "wishlist").length;
      const weekNewWishes = allWishes
        .filter((w) => {
          const dt = (w.createdAt ?? "").slice(0, 10);
          return dt >= weekRange.start && dt <= weekRange.end;
        })
        .map((w) => w.name)
        .slice(0, 3);

      // ── 6. HOBBY LEDGER 集計 ──────────────────────────────────

      const allLogs = hobbyLogsSnap.docs.map((d) => d.data() as HobbyLog);

      const weekLogs = allLogs.filter((l) => l.date >= weekRange.start && l.date <= weekRange.end);
      const monthLogs = allLogs.filter((l) => l.date.startsWith(thisYM));

      const userAWeekLogs = weekLogs.filter((l) => l.user === userAHobby);
      const userBWeekLogs = weekLogs.filter((l) => l.user === userBHobby);
      const userAWeekHours = Math.round(userAWeekLogs.reduce((s, l) => s + (l.duration ?? 0), 0) * 10) / 10;
      const userBWeekHours = Math.round(userBWeekLogs.reduce((s, l) => s + (l.duration ?? 0), 0) * 10) / 10;
      const monthHobbyCost = monthLogs.reduce((s, l) => s + (l.amount ?? 0), 0);

      // ストリーク（個別）
      const userAStreak = calcCurrentStreak(allLogs.filter((l) => l.user === userAHobby), now);
      const userBStreak = calcCurrentStreak(allLogs.filter((l) => l.user === userBHobby), now);

      // ── 7. ST GOALS（任意）────────────────────────────────────

      let goalsSummary = "";
      if (goalsSnap && !goalsSnap.empty) {
        const activeGoals = goalsSnap.docs
          .map((d) => d.data() as HobbyGoal)
          .filter((g) => !g.status || g.status === "active" || g.status === "in_progress");
        if (activeGoals.length > 0) {
          const lines = activeGoals.slice(0, 3).map((g) => {
            if (g.targetValue && g.currentValue !== undefined) {
              const pct = Math.round((g.currentValue / g.targetValue) * 100);
              return `  ${g.title}: ${pct}%（${g.currentValue}/${g.targetValue}）`;
            }
            if (g.progress !== undefined) {
              return `  ${g.title}: ${g.progress}%`;
            }
            return `  ${g.title}`;
          });
          goalsSummary = "\n\n【🎯 ST GOALS】\n進行中ゴール\n" + lines.join("\n");
        }
      }

      // ── 8. テキスト組み立て ───────────────────────────────────

      const sharedLines = [
        "【📋 RINGI 週次】",
        `承認 ${weekApproved.length}件 / 否決 ${weekRejected.length}件`,
        `未処理 ${pendingApps.length}件 | 今週承認額 ${fmtYen(approvedAmount)}`,
        "",
        "【💰 CASHFLOW 月次進捗】",
        `入金: ${fmtYen(confirmedIncome)} / ${fmtYen(expectedIncome)}（見込み）`,
        `支出消化率: ${spendingRate}% | 残余: ${surplus >= 0 ? fmtYen(surplus) : "-" + fmtYen(surplus)}`,
        upcomingTotal > 0
          ? `7日以内の入金予定: ${fmtYen(upcomingTotal)}`
          : "7日以内の入金予定: なし",
        "",
        "【🎁 ST WISHLIST】",
        `未申請: ${unsubmittedCount}件`,
        weekNewWishes.length > 0
          ? `今週追加: ${weekNewWishes.join(" / ")}`
          : "今週の追加: なし",
        "",
        "【🎮 Hobby Ledger】",
        `${userAName}: ${userAWeekLogs.length}回 ${userAWeekHours}h`,
        `${userBName}: ${userBWeekLogs.length}回 ${userBWeekHours}h`,
        `今月趣味支出: ${fmtYen(monthHobbyCost)}`,
      ];

      const sharedMessage = sharedLines.join("\n") + goalsSummary;
      const title = `📊 ST APPS 週次サマリー（${mmdd}）`;

      const userAPersonal = [
        "【👤 個別（" + userAName + "）】",
        `あなたが決裁すべきRINGI: ${userANeedReview}件`,
        `趣味ストリーク: ${userAStreak}日連続`,
      ].join("\n");

      const userBPersonal = [
        "【👤 個別（" + userBName + "）】",
        `あなたが決裁すべきRINGI: ${userBNeedReview}件`,
        `趣味ストリーク: ${userBStreak}日連続`,
      ].join("\n");

      // ── 9. ntfy 送信 ──────────────────────────────────────────

      const results = await Promise.allSettled([
        userANtfy ? sendNtfy(userANtfy, title, `${sharedMessage}\n\n${userAPersonal}`) : Promise.resolve(),
        userBNtfy ? sendNtfy(userBNtfy, title, `${sharedMessage}\n\n${userBPersonal}`) : Promise.resolve(),
      ]);

      const failed: string[] = [];
      for (const [i, result] of results.entries()) {
        if (result.status === "rejected") {
          const user = i === 0 ? userAName : userBName;
          console.error(`[weeklySummary] ntfy failed for ${user}:`, result.reason);
          failed.push(user);
          await logError(`sendNtfy:${user}`, result.reason);
        }
      }

      // ── 10. 完了ログ ──────────────────────────────────────────

      await db.collection("notification_logs").add({
        type: "weekly_summary",
        status: failed.length === 0 ? "success" : "partial",
        weekRange,
        sentTo: [userAName, userBName].filter((_, i) => results[i].status === "fulfilled"),
        failedTo: failed,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[weeklySummary] Done. failed=${failed.length}`);
    } catch (error) {
      console.error("[weeklySummary] Fatal error:", error);
      await logError("weeklySummaryNotification:fatal", error);
      throw error;
    }
  }
);

// ── 初期設定セットアップ（初回デプロイ後に一度だけ呼ぶ） ──────────
// GET https://asia-northeast1-ringi-1b31a.cloudfunctions.net/initUserSettings
// 実行後はこの関数を削除してデプロイし直してください
export const initUserSettings = onRequest(
  {
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // ringi/settings から現在の共有ntfyTopicとユーザー名を読む
    const ringiSnap = await db.doc("ringi/settings").get();
    const ringi = ringiSnap.data() as {
      userA?: { name?: string };
      userB?: { name?: string };
      ntfyTopic?: string;
    } | undefined;

    const sharedTopic = ringi?.ntfyTopic ?? "";
    const userAName   = ringi?.userA?.name ?? "さく";
    const userBName   = ringi?.userB?.name ?? "たかはし";

    // URLパラメータで上書き可能: ?topicA=xxx&topicB=yyy
    const topicA = (req.query["topicA"] as string | undefined) ?? sharedTopic;
    const topicB = (req.query["topicB"] as string | undefined) ?? sharedTopic;

    // Hobby Ledger のユーザー名（URLパラメータで変更可）
    const hobbyA = (req.query["hobbyA"] as string | undefined) ?? "れな";
    const hobbyB = (req.query["hobbyB"] as string | undefined) ?? "けんしん";

    await Promise.all([
      db.doc("settings/userA").set({
        name: userAName,
        ntfyTopic: topicA,
        hobbyLedgerUser: hobbyA,
        cashflowUserId: "saku",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      db.doc("settings/userB").set({
        name: userBName,
        ntfyTopic: topicB,
        hobbyLedgerUser: hobbyB,
        cashflowUserId: "takahashi",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ]);

    res.json({
      ok: true,
      message: "settings/userA と settings/userB を作成しました。",
      created: {
        "settings/userA": { name: userAName, ntfyTopic: topicA, hobbyLedgerUser: hobbyA },
        "settings/userB": { name: userBName, ntfyTopic: topicB, hobbyLedgerUser: hobbyB },
      },
      next: "個人ntfyトピックを設定するにはFirestoreコンソールか、topicA/topicBクエリパラメータで再実行してください。",
    });
  }
);
