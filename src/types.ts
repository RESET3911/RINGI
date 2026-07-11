export type User = 'kenshin' | 'rena';
export const USER_IDS: readonly User[] = ['kenshin', 'rena'];
export function otherUser(u: User): User { return u === 'kenshin' ? 'rena' : 'kenshin'; }

export type Settings = {
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  users?: Record<User, { name: string; email: string }>;
  monthlyIncome: number;
  extraIncome: number;
  fixedCosts: { id: string; label: string; amount: number }[];
  alertThresholdWarning: number;
  alertThresholdDanger: number;
  appIcon: string;
  ntfyTopic: string;
};

// ── CASHFLOW連携 ────────────────────────────────────────────────
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

// ── 申請タイプ ──────────────────────────────────────────────────
export type RequestType =
  | 'purchase' | 'dining' | 'travel' | 'present'
  | 'investment' | 'schedule' | 'rule_change';

export const REQUEST_TYPE_CONFIG: Record<RequestType, {
  label: string;       // 表示名
  kanji: string;       // メダリオン用の一文字
  hint: string;        // タイプ選択時の補足
  placeholder: string; // 品目名のプレースホルダ
  amountRequired: boolean;
}> = {
  purchase:    { label: '購入',   kanji: '購', hint: 'モノを買いたい',       placeholder: '例: AirPods Pro',      amountRequired: true },
  dining:      { label: '外食',   kanji: '食', hint: '外食・ごちそう',       placeholder: '例: 記念日ディナー',    amountRequired: true },
  travel:      { label: '旅行',   kanji: '旅', hint: '旅・おでかけ',         placeholder: '例: 京都旅行',          amountRequired: true },
  present:     { label: '贈り物', kanji: '贈', hint: 'プレゼント',           placeholder: '例: 母の日ギフト',      amountRequired: true },
  investment:  { label: '投資',   kanji: '投', hint: '投資・高額な判断',     placeholder: '例: 新NISA積立増額',    amountRequired: true },
  schedule:    { label: '予定',   kanji: '予', hint: '予定の相談',           placeholder: '例: 土曜に友人と飲み',  amountRequired: false },
  rule_change: { label: '規約',   kanji: '規', hint: '家計ルールの変更',     placeholder: '例: 食費予算の変更',    amountRequired: false },
};

export const ALL_REQUEST_TYPES = Object.keys(REQUEST_TYPE_CONFIG) as RequestType[];

// ── ステータス ──────────────────────────────────────────────────
export type Status =
  | 'pending' | 'approved' | 'rejected' | 'cancelled'
  | 'hold' | 'conditional' | 'discuss';

export type DecisionStatus = 'approved' | 'rejected' | 'hold' | 'conditional' | 'discuss';

/** 色トーン（Seal / Stamp コンポーネントが解釈する） */
export type Tone = 'shu' | 'ink' | 'ai' | 'karashi' | 'nezu' | 'matsu';

export const STATUS_CONFIG: Record<Status, { label: string; seal: string; tone: Tone }> = {
  pending:     { label: '申請中',     seal: '未決', tone: 'ai' },
  approved:    { label: '承認',       seal: '承認', tone: 'shu' },
  conditional: { label: '条件付き',   seal: '条件', tone: 'karashi' },
  hold:        { label: '保留',       seal: '保留', tone: 'nezu' },
  discuss:     { label: '要相談',     seal: '相談', tone: 'ai' },
  rejected:    { label: '否決',       seal: '否決', tone: 'ink' },
  cancelled:   { label: '取り下げ',   seal: '取下', tone: 'nezu' },
};

// ── 購入後レビュー ──────────────────────────────────────────────
export type ReviewData = {
  satisfactionScore: number;       // 1-5
  usageFrequency: 'high' | 'mid' | 'low';
  wouldBuyAgain: 'yes' | 'neutral' | 'no';
  actualAmount?: number | null;
  note?: string | null;
  reviewedAt: string;
  reviewedBy: string;
};

// ── 申請本体 ────────────────────────────────────────────────────
export type Application = {
  id: string;
  applicant: User;
  item: string;
  amount: number;
  reason?: string;
  status: Status;
  comment?: string;
  createdAt: string;
  decidedAt?: string;
  reapplyFromId?: string;
  // CASHFLOW連携
  cashflowCategory?: CashflowCategory;
  cashflowSubCategory?: BusinessExpenseCategory;
  // 申請タイプ
  requestType?: RequestType;
  travelDates?: { start: string; end: string } | null;
  scheduleDate?: string | null;
  ruleChangeDetail?: string | null;
  // 条件付き承認
  conditionType?: string | null;
  conditionText?: string | null;
  conditionAmount?: number | null;
  // 購入後レビュー
  isPurchased?: boolean;
  purchasedAt?: string | null;
  review?: ReviewData | null;
};

// ── アラート ────────────────────────────────────────────────────
export function userMeta(s: Settings, u: User): { name: string; email: string } {
  return s.users?.[u] ?? (u === 'kenshin' ? s.userA : s.userB);
}

export type AlertLevel = 'none' | 'warning' | 'danger';

export type AlertInfo = {
  level: AlertLevel;
  surplus: number;
  percentage: number;
  message: string;
};
