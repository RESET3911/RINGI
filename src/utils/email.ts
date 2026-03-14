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

  if (!receiver.email) return;

  await emailjs.send(SERVICE_ID, TEMPLATE_APPLY, {
    to_email: receiver.email,
    applicant_name: applicant.name,
    item: app.item,
    amount: formatCurrency(app.amount),
    reason: app.reason ?? 'なし',
  }, PUBLIC_KEY);
}

export async function sendDecisionEmail(
  app: Application,
  status: 'approved' | 'rejected',
  comment: string | undefined,
  settings: Settings
): Promise<void> {
  const applicant = app.applicant === 'A' ? settings.userA : settings.userB;
  const decider = app.applicant === 'A' ? settings.userB : settings.userA;

  if (!applicant.email) return;

  await emailjs.send(SERVICE_ID, TEMPLATE_DECISION, {
    to_email: applicant.email,
    decider_name: decider.name,
    status_label: status === 'approved' ? '✅ 承認' : '❌ 否決',
    item: app.item,
    amount: formatCurrency(app.amount),
    comment: comment ?? 'なし',
  }, PUBLIC_KEY);
}
