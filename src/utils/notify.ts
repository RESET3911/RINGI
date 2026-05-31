import { Settings, Application } from '../types';
import { formatCurrency } from './alert';

async function push(topic: string, title: string, body: string): Promise<void> {
  if (!topic.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic.trim(),
      title,
      message: body,
      priority: 3,
      tags: ['bell'],
    }),
  });
}

export async function notifyApplication(app: Application, settings: Settings): Promise<void> {
  const { ntfyTopic } = settings;
  if (!ntfyTopic) return;
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;
  const typeLabel = app.requestType ? ` [${app.requestType}]` : '';
  await push(
    ntfyTopic,
    `📝 稟議申請：${app.item}${typeLabel}`,
    `${applicant.name}が申請しました${app.amount > 0 ? `\n金額: ${formatCurrency(app.amount)}` : ''}${app.reason ? `\n理由: ${app.reason}` : ''}`
  );
}

export async function notifyDecision(
  app: Application,
  status: 'approved' | 'rejected' | 'cancelled' | 'hold' | 'conditional' | 'discuss',
  comment: string | undefined,
  settings: Settings
): Promise<void> {
  const { ntfyTopic } = settings;
  if (!ntfyTopic) return;
  const decider = app.applicant === 'A' ? settings.userB : settings.userA;
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;

  const emojiMap = { approved: '✅', rejected: '❌', cancelled: '🚫', hold: '⏸️', conditional: '🟠', discuss: '💬' };
  const labelMap = { approved: '承認', rejected: '否決', cancelled: '取り消し', hold: '保留', conditional: '条件付き承認', discuss: '要相談' };
  const emoji = emojiMap[status];
  const label = labelMap[status];
  const actor = status === 'cancelled' ? applicant.name : decider.name;

  const conditionLine = status === 'conditional' && app.conditionText ? `\n条件: ${app.conditionText}` : '';

  await push(
    ntfyTopic,
    `${emoji} 稟議${label}：${app.item}`,
    `${actor}が${label}しました${app.amount > 0 ? `\n金額: ${formatCurrency(app.amount)}` : ''}${comment ? `\nコメント: ${comment}` : ''}${conditionLine}`
  );
}
