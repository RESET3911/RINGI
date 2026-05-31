import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings, Application } from '../types';
import { formatCurrency } from './alert';

// ── ntfy push ─────────────────────────────────────────────────────
async function ntfyPush(topic: string, title: string, body: string): Promise<void> {
  if (!topic.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim(), title, message: body, priority: 3, tags: ['bell'] }),
  });
}

// ── RINGI user → Firestore userId mapping ─────────────────────────
type FirestoreUserId = 'saku' | 'takahashi';

function ringiToFsId(ringiUser: 'A' | 'B', settings: Settings): FirestoreUserId {
  const name = (ringiUser === 'A' ? settings.userA.name : settings.userB.name).toLowerCase();
  if (/たかはし|けんしん|kenshin|takahashi/.test(name)) return 'takahashi';
  return 'saku';
}

// ── Firestore notification write ──────────────────────────────────
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
  const typeLabel     = app.requestType ? ` [${app.requestType}]` : '';
  const title         = `📝 稟議申請：${app.item}${typeLabel}`;
  const body          = `${applicantName}が申請しました${app.amount > 0 ? `\n金額: ${formatCurrency(app.amount)}` : ''}${app.reason ? `\n理由: ${app.reason}` : ''}`;

  await Promise.allSettled([
    writeNotification({ toUser, type: 'ringi_new_request', title, body, linkedId: app.id }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}

export async function notifyDecision(
  app: Application,
  status: 'approved' | 'rejected' | 'cancelled' | 'hold' | 'conditional' | 'discuss',
  comment: string | undefined,
  settings: Settings,
): Promise<void> {
  const decider    = app.applicant === 'A' ? settings.userB : settings.userA;
  const applicant  = app.applicant === 'A' ? settings.userA : settings.userB;
  const toUser     = ringiToFsId(app.applicant, settings);
  const actorName  = status === 'cancelled' ? applicant.name : decider.name;

  const emojiMap: Record<string, string> = {
    approved:'✅', rejected:'❌', cancelled:'🚫', hold:'⏸️', conditional:'🟠', discuss:'💬',
  };
  const labelMap: Record<string, string> = {
    approved:'承認', rejected:'否決', cancelled:'取り消し', hold:'保留', conditional:'条件付き承認', discuss:'要相談',
  };
  const typeMap: Record<string, string> = {
    approved:'ringi_approved', rejected:'ringi_rejected', cancelled:'ringi_cancelled',
    hold:'ringi_hold', conditional:'ringi_conditional', discuss:'ringi_discuss',
  };

  const conditionLine = status === 'conditional' && (app as any).conditionText
    ? `\n条件: ${(app as any).conditionText}` : '';

  const emoji = emojiMap[status];
  const label = labelMap[status];
  const title = `${emoji} 稟議${label}：${app.item}`;
  const body  = `${actorName}が${label}しました${app.amount > 0 ? `\n金額: ${formatCurrency(app.amount)}` : ''}${comment ? `\nコメント: ${comment}` : ''}${conditionLine}`;

  await Promise.allSettled([
    writeNotification({ toUser, type: typeMap[status] ?? `ringi_${status}`, title, body, linkedId: app.id }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}
