import { Settings, Application, Status, STATUS_CONFIG, REQUEST_TYPE_CONFIG, otherUser, userMeta } from '../types';
import { yen } from './format';
import { writeNotification } from '../shared/notify';
import { ntfyPush } from '../shared/notify';

export { ntfyPush };

const APP_URL = 'https://RESET3911.github.io/RINGI/';

// ── Public API ────────────────────────────────────────────────────
export async function notifyApplication(app: Application, settings: Settings): Promise<void> {
  const applicantName = userMeta(settings, app.applicant).name;
  const typeLabel     = app.requestType ? `【${REQUEST_TYPE_CONFIG[app.requestType].label}】` : '';
  const title         = `📝 稟議申請 ${typeLabel}${app.item}`;
  const body          = `${applicantName}が申請しました`
    + (app.amount > 0 ? `\n金額: ${yen(app.amount)}` : '')
    + (app.reason ? `\n理由: ${app.reason}` : '');

  await Promise.allSettled([
    writeNotification({ toUser: otherUser(app.applicant), fromApp: 'ringi', type: 'ringi_new_request', title, body, linkedUrl: APP_URL, linkedId: app.id }),
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
  const decider    = userMeta(settings, otherUser(app.applicant));
  const applicant  = userMeta(settings, app.applicant);
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
    writeNotification({ toUser: app.applicant, fromApp: 'ringi', type: `ringi_${status}`, title, body, linkedUrl: APP_URL, linkedId: app.id }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}
