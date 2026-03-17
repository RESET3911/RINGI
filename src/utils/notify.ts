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
  await push(
    ntfyTopic,
    `📝 稟議申請：${app.item}`,
    `${applicant.name}が申請しました\n金額: ${formatCurrency(app.amount)}${app.reason ? `\n理由: ${app.reason}` : ''}`
  );
}

export async function notifyDecision(
  app: Application,
  status: 'approved' | 'rejected' | 'cancelled',
  comment: string | undefined,
  settings: Settings
): Promise<void> {
  const { ntfyTopic } = settings;
  if (!ntfyTopic) return;
  const decider = app.applicant === 'A' ? settings.userB : settings.userA;
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;

  const emoji = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '🚫';
  const label = status === 'approved' ? '承認' : status === 'rejected' ? '否決' : '取り消し';
  const actor = status === 'cancelled' ? applicant.name : decider.name;

  await push(
    ntfyTopic,
    `${emoji} 稟議${label}：${app.item}`,
    `${actor}が${label}しました\n金額: ${formatCurrency(app.amount)}${comment ? `\n理由: ${comment}` : ''}`
  );
}
