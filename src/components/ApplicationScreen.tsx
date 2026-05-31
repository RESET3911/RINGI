import { useState, useCallback } from 'react';
import type { User, Settings, Application, CashflowCategory, BusinessExpenseCategory, RequestType } from '../types';
import { BUSINESS_EXPENSE_LABELS, REQUEST_TYPE_CONFIG } from '../types';
import { calcAlert, calcSurplus, formatCurrency } from '../utils/alert';
import { useCashflowBalance } from '../utils/cashflow';
import AlertBadge from './AlertBadge';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import CashflowBudgetWidget from './CashflowBudgetWidget';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  currentUser: User;
  settings: Settings;
  onSubmit: (app: Application) => void;
  initialValues?: { item: string; amount: number; reason?: string; reapplyFromId?: string; requestType?: RequestType };
};

const BIZ_CATEGORIES = Object.keys(BUSINESS_EXPENSE_LABELS) as BusinessExpenseCategory[];
const ALL_TYPES = Object.keys(REQUEST_TYPE_CONFIG) as RequestType[];

export default function ApplicationScreen({ currentUser, settings, onSubmit, initialValues }: Props) {
  const [selectedType, setSelectedType] = useState<RequestType | null>(initialValues?.requestType ?? null);
  const [item, setItem] = useState(initialValues?.item ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [reason, setReason] = useState(initialValues?.reason ?? '');
  const [cashflowCategory, setCashflowCategory] = useState<CashflowCategory>('none');
  const [cashflowSubCategory, setCashflowSubCategory] = useState<BusinessExpenseCategory>('supplies');
  // Feature A: タイプ別追加フィールド
  const [travelStart, setTravelStart] = useState('');
  const [travelEnd, setTravelEnd] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [ruleChangeDetail, setRuleChangeDetail] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cashflow = useCashflowBalance();
  const numAmount = parseFloat(amount) || 0;
  const surplus = cashflow ? cashflow.balance : calcSurplus(settings);
  const alert = numAmount > 0 ? calcAlert(numAmount, surplus, settings) : null;
  const isReapply = !!initialValues?.reapplyFromId;

  const typeConfig = selectedType ? REQUEST_TYPE_CONFIG[selectedType] : null;
  const amountRequired = typeConfig?.amountRequired ?? true;

  const isFormValid = () => {
    if (!selectedType) return false;
    if (!item.trim()) return false;
    if (amountRequired && numAmount <= 0) return false;
    if (selectedType === 'travel' && (!travelStart || !travelEnd)) return false;
    if (selectedType === 'rule_change' && !ruleChangeDetail.trim()) return false;
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setShowConfirm(true);
  };

  const confirmSubmit = useCallback(() => {
    const app: Application = {
      id: uuidv4(),
      applicant: currentUser,
      item: item.trim(),
      amount: numAmount,
      reason: reason.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reapplyFromId: initialValues?.reapplyFromId,
      cashflowCategory,
      cashflowSubCategory: cashflowCategory === 'business' ? cashflowSubCategory : undefined,
      requestType: selectedType ?? undefined,
      travelDates: selectedType === 'travel' && travelStart && travelEnd
        ? { start: travelStart, end: travelEnd } : undefined,
      scheduleDate: selectedType === 'schedule' && scheduleDate ? scheduleDate : undefined,
      ruleChangeDetail: selectedType === 'rule_change' && ruleChangeDetail.trim()
        ? ruleChangeDetail.trim() : undefined,
    };
    onSubmit(app);
    setSubmitted(app);
    setShowConfirm(false);
    setItem('');
    setAmount('');
    setReason('');
    setCashflowCategory('none');
    setTravelStart('');
    setTravelEnd('');
    setScheduleDate('');
    setRuleChangeDetail('');
    setToast('申請を送信しました！');
  }, [currentUser, item, numAmount, reason, cashflowCategory, cashflowSubCategory, selectedType,
      travelStart, travelEnd, scheduleDate, ruleChangeDetail, onSubmit, initialValues]);

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;

  // ── Step 1: タイプ選択 ──────────────────────────────────────
  if (!selectedType) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">📝 申請タイプを選択</h2>
        <p className="text-gray-500 text-sm mb-5">どんな申請ですか？</p>
        <div className="grid grid-cols-2 gap-3">
          {ALL_TYPES.map(type => {
            const { icon, label } = REQUEST_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="bg-white rounded-2xl shadow-sm border-2 border-transparent active:border-primary-300 p-5 flex flex-col items-center gap-2 transition-all text-left"
              >
                <span className="text-4xl">{icon}</span>
                <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: 申請フォーム ────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">申請を送信しました</h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-2">
            {submitted.requestType && (
              <div className="flex justify-between">
                <span className="text-gray-500">申請タイプ</span>
                <span className="font-medium">
                  {REQUEST_TYPE_CONFIG[submitted.requestType].icon} {REQUEST_TYPE_CONFIG[submitted.requestType].label}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">品目</span>
              <span className="font-medium">{submitted.item}</span>
            </div>
            {submitted.amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">金額</span>
                <span className="font-medium">{formatCurrency(submitted.amount)}</span>
              </div>
            )}
            {submitted.cashflowCategory !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-500">CASHFLOW連携</span>
                <span className="text-violet-600 font-medium text-xs">
                  {submitted.cashflowCategory === 'business'
                    ? `💼 ${BUSINESS_EXPENSE_LABELS[submitted.cashflowSubCategory!]}`
                    : '🔄 変動費'}
                </span>
              </div>
            )}
          </div>
          {settings.ntfyTopic && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl p-3 mb-3">
              🔔 {otherUser.name}にプッシュ通知を送りました
            </p>
          )}
          <button onClick={() => { setSubmitted(null); setSelectedType(null); }} className="btn-secondary w-full">
            続けて申請する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        {!isReapply && (
          <button
            onClick={() => setSelectedType(null)}
            className="text-gray-400 p-1 -ml-1 text-sm"
          >
            ←
          </button>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl">{typeConfig!.icon}</span>
          <h2 className="text-xl font-bold text-gray-900">
            {isReapply ? '再申請' : typeConfig!.label}
          </h2>
          {isReapply && (
            <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-full">再申請</span>
          )}
        </div>
      </div>

      <CashflowBudgetWidget amount={numAmount > 0 ? numAmount : undefined} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">
            {selectedType === 'rule_change' ? '変更内容の概要' : '品目名'}
            {' '}<span className="text-red-500">*</span>
          </label>
          <input type="text" value={item} onChange={e => setItem(e.target.value)}
            placeholder={selectedType === 'rule_change' ? '例: 食費予算の変更' : selectedType === 'dining' ? '例: 記念日ディナー' : selectedType === 'travel' ? '例: 京都旅行' : '例: AirPods Pro'}
            className="input-field" required />
        </div>

        {/* 金額フィールド */}
        <div>
          <label className="label">
            金額{amountRequired ? <span className="text-red-500"> *</span> : <span className="text-gray-400 text-xs"> （任意）</span>}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" min="1" className="input-field pl-8"
              required={amountRequired} />
          </div>
        </div>

        {/* travel: 旅行日程 */}
        {selectedType === 'travel' && (
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-sky-700">✈️ 旅行日程</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">出発日 <span className="text-red-500">*</span></label>
                <input type="date" value={travelStart} onChange={e => setTravelStart(e.target.value)}
                  className="input-field text-sm" required />
              </div>
              <div>
                <label className="label text-xs">帰宅日 <span className="text-red-500">*</span></label>
                <input type="date" value={travelEnd} onChange={e => setTravelEnd(e.target.value)}
                  min={travelStart} className="input-field text-sm" required />
              </div>
            </div>
          </div>
        )}

        {/* schedule: 希望日時 */}
        {selectedType === 'schedule' && (
          <div>
            <label className="label">希望日時 <span className="text-gray-400 text-xs">（任意）</span></label>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              className="input-field" />
          </div>
        )}

        {/* rule_change: 変更内容詳細 */}
        {selectedType === 'rule_change' && (
          <div>
            <label className="label">変更内容の詳細 <span className="text-red-500">*</span></label>
            <textarea value={ruleChangeDetail} onChange={e => setRuleChangeDetail(e.target.value)}
              placeholder="例: 食費を月3万→4万に変更したい。理由は物価高騰のため。"
              rows={3} className="input-field resize-none" required />
          </div>
        )}

        <div>
          <label className="label">理由・コメント（任意）</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="購入理由や用途を記入..." rows={3} className="input-field resize-none" />
        </div>

        {alert && <AlertBadge alert={alert} />}

        {/* CASHFLOW連携（金額ありタイプのみ） */}
        {numAmount > 0 && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span>💰</span>
              <span className="text-sm font-semibold text-violet-700">CASHFLOWに連携する</span>
            </div>
            <div className="flex flex-col gap-2">
              {([
                { value: 'none',     label: '連携しない' },
                { value: 'business', label: '💼 仕事の経費として登録' },
                { value: 'variable', label: '🔄 変動費・サブスクとして登録' },
              ] as { value: CashflowCategory; label: string }[]).map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cashflowCategory"
                    value={opt.value}
                    checked={cashflowCategory === opt.value}
                    onChange={() => setCashflowCategory(opt.value)}
                    className="accent-violet-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {cashflowCategory === 'business' && (
              <div className="mt-3">
                <label className="label text-xs">勘定科目</label>
                <select
                  value={cashflowSubCategory}
                  onChange={e => setCashflowSubCategory(e.target.value as BusinessExpenseCategory)}
                  className="input-field text-sm"
                >
                  {BIZ_CATEGORIES.map(c => (
                    <option key={c} value={c}>{BUSINESS_EXPENSE_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!isFormValid()} className="btn-primary w-full">
          申請する
        </button>
      </form>

      {showConfirm && (
        <ConfirmModal
          title={isReapply ? '再申請の確認' : '申請の確認'}
          message={`「${item}」${numAmount > 0 ? ` を ${formatCurrency(numAmount)} で` : 'を'}申請しますか？`}
          confirmLabel="申請する"
          onConfirm={confirmSubmit}
          onCancel={() => setShowConfirm(false)}
        >
          {alert && alert.level !== 'none' && <AlertBadge alert={alert} />}
        </ConfirmModal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
