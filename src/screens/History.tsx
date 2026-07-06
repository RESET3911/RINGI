import { useMemo, useState } from 'react';
import {
  Application, Settings, User, Status, RequestType, ReviewData,
  REQUEST_TYPE_CONFIG,
} from '../types';
import { yen, shortDate, monthLabel } from '../lib/format';
import Seal from '../components/ui/Seal';
import Medallion from '../components/ui/Medallion';
import ConfirmSheet from '../components/ui/ConfirmSheet';
import ReviewSheet from '../components/ReviewSheet';

type StatusFilter = 'all' | Status;
type ViewTab = 'list' | 'stats';

type Props = {
  settings: Settings;
  applications: Application[];
  currentUser: User;
  onReapply: (app: Application) => void;
  onCancel: (app: Application) => void;
  onMarkPurchased: (id: string) => void;
  onSubmitReview: (id: string, review: ReviewData) => void;
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全件' },
  { key: 'pending', label: '申請中' },
  { key: 'approved', label: '承認' },
  { key: 'conditional', label: '条件付き' },
  { key: 'hold', label: '保留' },
  { key: 'discuss', label: '要相談' },
  { key: 'rejected', label: '否決' },
  { key: 'cancelled', label: '取下' },
];

export default function History({
  settings, applications, currentUser,
  onReapply, onCancel, onMarkPurchased, onSubmitReview,
}: Props) {
  const [viewTab, setViewTab] = useState<ViewTab>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);

  const getName = (user: User) => user === 'A' ? settings.userA.name : settings.userB.name;

  // ── フィルタ + 月別グルーピング ─────────────────────────────
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = applications
      .filter(a => statusFilter === 'all' || a.status === statusFilter)
      .filter(a => typeFilter === 'all' || a.requestType === typeFilter)
      .filter(a => !q
        || a.item.toLowerCase().includes(q)
        || (a.reason ?? '').toLowerCase().includes(q)
        || (a.comment ?? '').toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const groups = new Map<string, Application[]>();
    for (const a of filtered) {
      const key = a.createdAt.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return [...groups.entries()];
  }, [applications, statusFilter, typeFilter, search]);

  // ── 月別サマリー ────────────────────────────────────────────
  type MonthStat = { total: number; amount: number; approved: number; rejected: number };
  const monthlyStats = useMemo(() => {
    const acc: Record<string, MonthStat> = {};
    for (const a of applications) {
      const key = a.createdAt.slice(0, 7);
      if (!acc[key]) acc[key] = { total: 0, amount: 0, approved: 0, rejected: 0 };
      acc[key].total += 1;
      if (a.status === 'approved') { acc[key].approved += 1; acc[key].amount += a.amount; }
      if (a.status === 'rejected') acc[key].rejected += 1;
    }
    return acc;
  }, [applications]);
  const sortedMonths = Object.keys(monthlyStats).sort().reverse().slice(0, 6);

  // ── レビュー統計 ────────────────────────────────────────────
  const reviewStats = useMemo(() => {
    const reviewed = applications.filter(a => a.review);
    if (reviewed.length === 0) return null;
    type TypeStat = { count: number; scoreSum: number; yesCount: number };
    const byType: Record<string, TypeStat> = {};
    for (const a of reviewed) {
      const key = a.requestType ?? 'purchase';
      if (!byType[key]) byType[key] = { count: 0, scoreSum: 0, yesCount: 0 };
      byType[key].count += 1;
      byType[key].scoreSum += a.review!.satisfactionScore;
      if (a.review!.wouldBuyAgain === 'yes') byType[key].yesCount += 1;
    }
    const totalYes = reviewed.filter(a => a.review!.wouldBuyAgain === 'yes').length;
    const avgScore = reviewed.reduce((s, a) => s + a.review!.satisfactionScore, 0) / reviewed.length;
    return { byType, avgScore, totalYes, total: reviewed.length };
  }, [applications]);

  return (
    <div className="px-4 py-5">
      <h2 className="heading mb-4">履歴</h2>

      {/* 一覧 / 統計 切替 */}
      <div className="flex bg-paper-deep rounded-md p-1 mb-4 border border-ink-line/60">
        {([['list', '一覧'], ['stats', '統計']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setViewTab(key)}
            className={`flex-1 py-2 rounded text-sm font-bold tracking-widest transition-colors ${
              viewTab === key ? 'bg-paper-card text-ink shadow-card' : 'text-ink-faint'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ 統計 ══ */}
      {viewTab === 'stats' && (
        <div className="space-y-4">
          {sortedMonths.length > 0 ? (
            <div className="card">
              <p className="heading-note mb-3">月別サマリー</p>
              <div className="space-y-4">
                {sortedMonths.map(month => {
                  const s = monthlyStats[month];
                  return (
                    <div key={month}>
                      <p className="font-mincho font-bold text-sm text-ink mb-2">{monthLabel(month)}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '申請', value: String(s.total), cls: 'text-ink' },
                          { label: '承認', value: String(s.approved), cls: 'text-shu' },
                          { label: '否決', value: String(s.rejected), cls: 'text-ink-soft' },
                          { label: '承認額', value: yen(s.amount), cls: 'text-ink', small: true },
                        ].map(({ label, value, cls, small }) => (
                          <div key={label} className="bg-paper rounded-md border border-ink-line/70 p-2 text-center">
                            <p className="text-[10px] text-ink-faint">{label}</p>
                            <p className={`font-mincho font-extrabold ${small ? 'text-[11px] pt-1' : 'text-lg'} ${cls}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card text-center py-10 text-sm text-ink-faint">まだ申請がありません</div>
          )}

          {reviewStats ? (
            <div className="card">
              <p className="heading-note mb-3">購入後レビュー</p>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-paper rounded-md border border-ink-line/70 p-3 text-center">
                  <p className="text-[10px] text-ink-faint mb-1">平均満足度</p>
                  <p className="font-mincho font-extrabold text-2xl text-karashi">{reviewStats.avgScore.toFixed(1)}<span className="text-xs text-ink-faint font-gothic"> / 5</span></p>
                </div>
                <div className="bg-paper rounded-md border border-ink-line/70 p-3 text-center">
                  <p className="text-[10px] text-ink-faint mb-1">また買う率</p>
                  <p className="font-mincho font-extrabold text-2xl text-matsu">
                    {Math.round((reviewStats.totalYes / reviewStats.total) * 100)}%
                  </p>
                  <p className="text-[10px] text-ink-faint">{reviewStats.totalYes}/{reviewStats.total}件</p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(reviewStats.byType).map(([typeKey, stat]) => {
                  const cfg = REQUEST_TYPE_CONFIG[typeKey as RequestType];
                  if (!cfg) return null;
                  return (
                    <div key={typeKey} className="flex items-center gap-3 bg-paper rounded-md border border-ink-line/70 px-3 py-2">
                      <Medallion kanji={cfg.kanji} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink">{cfg.label}</p>
                        <p className="text-[10px] text-ink-faint">{stat.count}件</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-karashi">★ {(stat.scoreSum / stat.count).toFixed(1)}</p>
                        <p className="text-[10px] text-matsu">{Math.round((stat.yesCount / stat.count) * 100)}% また買う</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8 text-sm text-ink-faint">
              レビューを記録するとここに統計が表示されます
            </div>
          )}
        </div>
      )}

      {/* ══ 一覧 ══ */}
      {viewTab === 'list' && (
        <>
          {/* 検索 */}
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="品目・理由・コメントを検索"
            className="field mb-3"
          />

          {/* タイプフィルタ */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as RequestType | 'all')}
            className="field text-sm py-2.5 mb-3"
          >
            <option value="all">タイプ: すべて</option>
            {Object.entries(REQUEST_TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.kanji} {v.label}</option>
            ))}
          </select>

          {/* ステータスフィルタ */}
          <div className="overflow-x-auto no-scrollbar pb-1 mb-4 -mx-4 px-4">
            <div className="flex gap-1.5 w-max">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`chip ${statusFilter === key ? 'chip-on' : 'chip-off'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="card text-center py-12 text-sm text-ink-faint">該当する申請はありません</div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([month, apps]) => (
                <section key={month}>
                  <h3 className="font-mincho font-bold text-sm text-ink-soft tracking-[0.2em] mb-2 flex items-baseline gap-2">
                    {monthLabel(month)}
                    <span className="text-[10px] text-ink-faint font-gothic tracking-normal">{apps.length}件</span>
                  </h3>
                  <div className="space-y-2.5">
                    {apps.map(app => {
                      const typeCfg = app.requestType ? REQUEST_TYPE_CONFIG[app.requestType] : null;
                      const isMyApp = app.applicant === currentUser;
                      const canPurchase = app.status === 'approved' && isMyApp && !app.isPurchased;
                      const canReview = app.isPurchased && isMyApp && !app.review;

                      return (
                        <article key={app.id} className="card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <Seal status={app.status} />
                              <h4 className="font-bold text-ink text-sm break-words">{app.item}</h4>
                              {app.reapplyFromId && (
                                <span className="seal border-karashi text-karashi bg-karashi-pale">再</span>
                              )}
                            </div>
                            {app.amount > 0 && (
                              <span className="font-mincho font-bold text-ink whitespace-nowrap">{yen(app.amount)}</span>
                            )}
                          </div>

                          <p className="text-[11px] text-ink-faint mt-1">
                            {typeCfg && `${typeCfg.label} · `}
                            {getName(app.applicant)}が申請 · {shortDate(app.createdAt)}
                            {app.decidedAt && ` → ${shortDate(app.decidedAt)}`}
                            {app.isPurchased && !app.review && <span className="text-matsu font-bold"> · 購入済</span>}
                            {app.review && (
                              <span className="text-karashi font-bold"> · ★{app.review.satisfactionScore}</span>
                            )}
                          </p>

                          {/* 条件付き承認の条件 */}
                          {app.status === 'conditional' && app.conditionText && (
                            <div className="border border-karashi/50 bg-karashi-pale rounded-md px-3 py-2 mt-2">
                              <p className="text-xs text-karashi font-bold">承認条件: {app.conditionText}</p>
                            </div>
                          )}

                          {app.ruleChangeDetail && (
                            <p className="text-xs text-ink-soft mt-1.5 bg-paper rounded px-2 py-1.5 whitespace-pre-wrap">{app.ruleChangeDetail}</p>
                          )}
                          {app.travelDates && (
                            <p className="text-xs text-ai mt-1.5">{app.travelDates.start} 〜 {app.travelDates.end}</p>
                          )}
                          {app.reason && (
                            <p className="text-xs text-ink-soft mt-1.5 bg-paper rounded px-2 py-1.5 whitespace-pre-wrap">{app.reason}</p>
                          )}
                          {app.comment && (
                            <p className="text-xs text-shu-deep mt-1.5 bg-shu-pale rounded px-2 py-1.5">決裁コメント: {app.comment}</p>
                          )}
                          {app.review?.note && (
                            <p className="text-xs text-karashi mt-1.5 bg-karashi-pale rounded px-2 py-1.5">レビュー: {app.review.note}</p>
                          )}

                          {/* アクション */}
                          {(isMyApp && (app.status === 'pending' || app.status === 'rejected' || app.status === 'conditional' || canPurchase || canReview)) && (
                            <div className="flex gap-2 flex-wrap justify-end mt-2.5">
                              {app.status === 'pending' && (
                                <button onClick={() => setCancelTarget(app)}
                                  className="chip chip-off">取り下げる</button>
                              )}
                              {app.status === 'rejected' && (
                                <button onClick={() => onReapply(app)}
                                  className="chip border-shu/60 text-shu bg-shu-pale">再申請する</button>
                              )}
                              {app.status === 'conditional' && (
                                <button onClick={() => onReapply(app)}
                                  className="chip border-karashi/60 text-karashi bg-karashi-pale">条件を反映して再申請</button>
                              )}
                              {canPurchase && (
                                <button onClick={() => setReviewTarget(app)}
                                  className="chip border-matsu/60 text-matsu bg-matsu-pale">購入完了にする</button>
                              )}
                              {canReview && (
                                <button onClick={() => setReviewTarget(app)}
                                  className="chip border-karashi/60 text-karashi bg-karashi-pale">レビューを記録</button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {cancelTarget && (
        <ConfirmSheet
          title="申請の取り下げ"
          message={`「${cancelTarget.item}」の申請を取り下げますか？`}
          confirmLabel="取り下げる"
          isDanger
          onConfirm={() => {
            const app = cancelTarget;
            setCancelTarget(null);
            onCancel(app);
          }}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {reviewTarget && (
        <ReviewSheet
          itemName={reviewTarget.item}
          currentUser={currentUser}
          onSubmit={(review) => {
            if (!reviewTarget.isPurchased) onMarkPurchased(reviewTarget.id);
            onSubmitReview(reviewTarget.id, review);
            setReviewTarget(null);
          }}
          onSkip={() => {
            if (!reviewTarget.isPurchased) onMarkPurchased(reviewTarget.id);
            setReviewTarget(null);
          }}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
