export type User = 'A' | 'B';

export type Settings = {
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  monthlyIncome: number;
  extraIncome: number;
  fixedCosts: { id: string; label: string; amount: number }[];
  alertThresholdWarning: number;  // デフォルト 0.30
  alertThresholdDanger: number;   // デフォルト 0.50
};

export type Application = {
  id: string;
  applicant: User;
  item: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  createdAt: string;
  decidedAt?: string;
};

export type AlertLevel = 'none' | 'warning' | 'danger';

export type AlertInfo = {
  level: AlertLevel;
  surplus: number;
  percentage: number;
  message: string;
};
