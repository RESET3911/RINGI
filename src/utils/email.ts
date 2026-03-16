import emailjs from '@emailjs/browser';
import { Settings, Application } from '../types';
import { formatCurrency } from './alert';

const SERVICE_ID = 'service_lipkqik';
const TEMPLATE_APPLY = 'template_y6araoi';
const TEMPLATE_DECISION = 'template_jyhvu1t';
const PUBLIC_KEY = 'O6hr4eVLu7EjvHbEq';

export async function sendApplicationEmail(app: Application, settings: Settings): Promise<void> {
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;
  const receiver = app.applicant === 'A' ? settings.userB : settings.userA;

  const params = {
    applicant_name: applicant.name,
    item: app.item,
    amount: formatCurrency(app.amount),
    reason: app.reason ?? 'なし',
  };

  // 相手に申請通知
  if (receiver.email) {
    await emailjs.send(SERVICE_ID, TEMPLATE_APPLY, {
      ...params,
      to_email: receiver.email,
    }, PUBLIC_KEY);
  }

  // 申請者自身にも確認メール
  if (applicant.email) {
    await emailjs.send(SERVICE_ID, TEMPLATE_APPLY, {
      ...params,
      to_email: applicant.email,
    }, PUBLIC_KEY);
  }
}

export async function sendDecisionEmail(
  app: Application,
  status: 'approved' | 'rejected' | 'cancelled',
  comment: string | undefined,
  settings: Settings
): Promise<void> {
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;
  const decider = app.applicant === 'A' ? settings.userB : settings.userA;

  const statusLabel =
    status === 'approved' ? '✅ 承認' :
    status === 'rejected' ? '❌ 否決' :
    '🚫 取り消し';

  const params = {
    decider_name: status === 'cancelled' ? applicant.name : decider.name,
    status_label: statusLabel,
    item: app.item,
    amount: formatCurrency(app.amount),
    comment: comment ?? 'なし',
  };

  // 申請者に通知（取り消し時も自分に届く）
  if (applicant.email) {
    await emailjs.send(SERVICE_ID, TEMPLATE_DECISION, {
      ...params,
      to_email: applicant.email,
    }, PUBLIC_KEY);
  }

  // 決裁者にも通知（取り消し時は相手に通知）
  if (status !== 'cancelled' && decider.email) {
    await emailjs.send(SERVICE_ID, TEMPLATE_DECISION, {
      ...params,
      to_email: decider.email,
    }, PUBLIC_KEY);
  } else if (status === 'cancelled' && decider.email) {
    await emailjs.send(SERVICE_ID, TEMPLATE_DECISION, {
      ...params,
      to_email: decider.email,
    }, PUBLIC_KEY);
  }
}
