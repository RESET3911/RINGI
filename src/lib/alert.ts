import { Settings, AlertInfo } from '../types';

/** 手動設定ベースの余剰資金（CASHFLOW未連携時のフォールバック） */
export function calcSurplus(settings: Settings): number {
  const totalFixed = settings.fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  return settings.monthlyIncome + settings.extraIncome - totalFixed;
}

/** 申請額が余剰資金の何%かでアラート判定 */
export function calcAlert(amount: number, surplus: number, settings: Settings): AlertInfo {
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
      message: `月次余剰の${percentage}%にあたります。慎重に。`,
    };
  }
  if (ratio >= settings.alertThresholdWarning) {
    return {
      level: 'warning',
      surplus,
      percentage,
      message: `月次余剰の${percentage}%にあたります。`,
    };
  }
  return { level: 'none', surplus, percentage, message: '' };
}
