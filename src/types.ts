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

// Feature A: 申請タイプ
export type RequestType = 'purchase' | 'dining' | 'travel' | 'present' | 'investment' | 'schedule' | 'rule_change';

export const REQUEST_TYPE_CONFIG: Record<RequestType, { label: string; icon: string; amountRequired: boolean }> = {
  purchase:    { label: '購入申請',       icon: '🛒', amountRequired: true  },
  dining:      { label: '外食申請',       icon: '🍽️', amountRequired: true  },
  travel:      { label: '旅行申請',       icon: '✈️', amountRequired: true  },
  present:     { label: 'プレゼント申請',  icon: '🎁', amountRequired: true  },
  investment:  { label: '投資・高額判断',  icon: '💹', amountRequired: true  },
  schedule:    { label: '予定相談',        icon: '📅', amountRequired: false },
  rule_change: { label: '家計ルール変更',  icon: '📋', amountRequired: false },
};

// Feature C: 購入後レビュー
export type ReviewData = {
  satisfactionScore: number;       // 1-5
  usageFrequency: 'high' | 'mid' | 'low';
  wouldBuyAgain: 'yes' | 'neutral' | 'no';
  actualAmount?: number | null;
  note?: string | null;
  reviewedAt: string;
  reviewedBy: string;
};

export type Application = {
  id: string;
  applicant: User;
  item: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hold' | 'conditional' | 'discuss';
  comment?: string;
  createdAt: string;
  decidedAt?: string;
  reapplyFromId?: string;
  // CASHFLOW連携
  cashflowCategory?: CashflowCategory;
  cashflowSubCategory?: BusinessExpenseCategory;
  // Feature A: 申請タイプ
  requestType?: RequestType;
  travelDates?: { start: string; end: string } | null;
  scheduleDate?: string | null;
  ruleChangeDetail?: string | null;
  // Feature B: 条件付き承認
  conditionType?: string | null;
  conditionText?: string | null;
  conditionAmount?: number | null;
  // Feature C: 購入後レビュー
  isPurchased?: boolean;
  purchasedAt?: string | null;
  review?: ReviewData | null;
};

export type AlertLevel = 'none' | 'warning' | 'danger';

export type AlertInfo = {
  level: AlertLevel;
  surplus: number;
  percentage: number;
  message: string;
};
