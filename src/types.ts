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

export type CashflowCategory = 'none' | 'business' | 'variable';

export type BusinessExpenseCategory =
  | 'outsourcing' | 'supplies' | 'travel' | 'communication'
  | 'books' | 'training' | 'entertainment' | 'misc';

export const BUSINESS_EXPENSE_LABELS: Record<BusinessExpenseCategory, string> = {
  outsourcing: '外注費',
  supplies: '消耗品費',
  travel: '旅費交通費',
  communication: '通信費',
  books: '新聞図書費',
  training: '研修費',
  entertainment: '交際費',
  misc: '雑費',
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
  // CASHFLOW連携
  cashflowCategory?: CashflowCategory;
  cashflowSubCategory?: BusinessExpenseCategory;
};

export type AlertLevel = 'none' | 'warning' | 'danger';

export type AlertInfo = {
  level: AlertLevel;
  surplus: number;
  percentage: number;
  message: string;
};
