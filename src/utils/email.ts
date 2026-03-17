import emailjs from '@emailjs/browser';
import { Settings, Application } from '../types';
import { formatCurrency } from './alert';

const SERVICE_ID = 'service_lipkqik';
const TEMPLATE_APPLY = 'template_y6araoi';
const TEMPLATE_DECISION = 'template_jyhvu1t';
const PUBLIC_KEY = 'O6hr4eVLu7EjvHbEq';

async function send(template: string, to: string, params: Record<string, string>): Promise<void> {
  await emailjs.send(SERVICE_ID, template, { to_email: to, ...params }, PUBLIC_KEY);
}

export async function sendApplicationEmail(app: Application, settings: Settings): Promise<void> {
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;
  const receiver = app.applicant === 'A' ? settings.userB : settings.userA;

  const params = {
    applicant_name: applicant.name,
    item: app.item,
    amount: formatCurrency(app.amount),
    reason: app.reason ?? 'なし',
  };

  const sends: Promise<void>[] = [];
  if (receiver.email) sends.push(send(TEMPLATE_APPLY, receiver.email, params));
  if (applicant.email) sends.push(send(TEMPLATE_APPLY, applicant.email, params));
  await Promise.allSettled(sends);
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

  const sends: Promise<void>[] = [];
  if (applicant.email) sends.push(send(TEMPLATE_DECISION, applicant.email, params));
  if (decider.email) sends.push(send(TEMPLATE_DECISION, decider.email, params));
  await Promise.allSettled(sends);
}
