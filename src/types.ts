export type User = 'A' | 'B';

export type Settings = {
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  monthlyIncome: number;
  extraIncome: number;
  fixedCosts: { id: string; label: string; amount: number }[];
  alertThresholdWarning: number;
  alertThresholdDanger: number;
  appIcon: string;
  ntfyTopic: string;
};

export type Application = {
  id: string;
  applicant: User;
  item: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment?: string;
  createdAt: string;
  decidedAt?: string;
  reapplyFromId?: string;
};

export type AlertLevel = 'none' | 'warning' | 'danger';

export type AlertInfo = {
  level: AlertLevel;
  surplus: number;
  percentage: number;
  message: string;
};
