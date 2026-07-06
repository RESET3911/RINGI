import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings, Application, Status, STATUS_CONFIG, REQUEST_TYPE_CONFIG } from '../types';
import { yen } from './format';

// ── ntfy push ─────────────────────────────────────────────────────
export async function ntfyPush(topic: string, title: string, body: string): Promise<void> {
  if (!topic.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim(), title, message: body, priority: 3, tags: ['bell'] }),
  });
}

// ── RINGI user → ST APPS共通 userId マッピング ─────────────────────
type FirestoreUserId = 'saku' | 'takahashi';

function ringiToFsId(ringiUser: 'A' | 'B', settings: Settings): FirestoreUserId {
  const name = (ringiUser === 'A' ? settings.userA.name : settings.userB.name).toLowerCase();
  if (/たかはし|けんしん|kenshin|takahashi/.test(name)) return 'takahashi';
  return 'saku';
}

// ── HUB通知（notificationsコレクション） ──────────────────────────
async function writeNotification(params: {
  toUser: FirestoreUserId | 'both';
  type: string;
  title: string;
  body: string;
  linkedId?: string | null;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    toUser: params.toUser,
    fromApp: 'ringi',
    type: params.type,
    title: params.title,
    body: params.body,
    isRead: false,
    linkedUrl: 'https://RESET3911.github.io/RINGI/',
    linkedId: params.linkedId ?? null,
    createdAt: Date.now(),
  });
}

// ── Public API ────────────────────────────────────────────────────
export async function notifyApplication(app: Application, settings: Settings): Promise<void> {
  const applicantName = app.applicant === 'A' ? settings.userA.name : settings.userB.name;
  const approverUser  = app.applicant === 'A' ? 'B' : 'A';
  const toUser        = ringiToFsId(approverUser, settings);
  const typeLabel     = app.requestType ? `【${REQUEST_TYPE_CONFIG[app.requestType].label}】` : '';
  const title         = `📝 稟議申請 ${typeLabel}${app.item}`;
  const body          = `${applicantName}が申請しました`
    + (app.amount > 0 ? `\n金額: ${yen(app.amount)}` : '')
    + (app.reason ? `\n理由: ${app.reason}` : '');

  await Promise.allSettled([
    writeNotification({ toUser, type: 'ringi_new_request', title, body, linkedId: app.id }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}

const DECISION_EMOJI: Partial<Record<Status, string>> = {
  approved: '✅', rejected: '❌', cancelled: '🚫',
  hold: '⏸️', conditional: '🟠', discuss: '💬',
};

export async function notifyDecision(
  app: Application,
  status: Exclude<Status, 'pending'>,
  comment: string | undefined,
  settings: Settings,
): Promise<void> {
  const decider    = app.applicant === 'A' ? settings.userB : settings.userA;
  const applicant  = app.applicant === 'A' ? settings.userA : settings.userB;
  const toUser     = ringiToFsId(app.applicant, settings);
  const actorName  = status === 'cancelled' ? applicant.name : decider.name;
  const label      = status === 'cancelled' ? '取り消し' : STATUS_CONFIG[status].label;

  const conditionLine = status === 'conditional' && app.conditionText
    ? `\n条件: ${app.conditionText}` : '';

  const title = `${DECISION_EMOJI[status] ?? ''} 稟議${label}：${app.item}`;
  const body  = `${actorName}が${label}しました`
    + (app.amount > 0 ? `\n金額: ${yen(app.amount)}` : '')
    + (comment ? `\nコメント: ${comment}` : '')
    + conditionLine;

  await Promise.allSettled([
    writeNotification({ toUser, type: `ringi_${status}`, title, body, linkedId: app.id }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}
