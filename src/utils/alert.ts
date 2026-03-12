import { Settings, AlertInfo } from '../types';

export function calcSurplus(settings: Settings): number {
  const totalFixed = settings.fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  return settings.monthlyIncome + settings.extraIncome - totalFixed;
}

export function calcAlert(amount: number, settings: Settings): AlertInfo {
  const surplus = calcSurplus(settings);
  if (surplus <= 0) {
    return {
      level: 'danger',
      surplus,
      percentage: 100,
      message: '余剰資金がありません。慎重に検討してください。',
    };
  }
  const ratio = amount / surplus;
  const percentage = Math.round(ratio * 100);

  if (ratio >= settings.alertThresholdDanger) {
    return {
      level: 'danger',
      surplus,
      percentage,
      message: `余剰資金の${percentage}%にあたります。慎重に検討してください。`,
    };
  }
  if (ratio >= settings.alertThresholdWarning) {
    return {
      level: 'warning',
      surplus,
      percentage,
      message: `余剰資金の${percentage}%にあたります。`,
    };
  }
  return {
    level: 'none',
    surplus,
    percentage,
    message: '',
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
}
