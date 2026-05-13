import { useState, useCallback } from 'react';
import type { User, Settings, Application, CashflowCategory, BusinessExpenseCategory } from '../types';
import { BUSINESS_EXPENSE_LABELS } from '../types';
import { calcAlert, formatCurrency } from '../utils/alert';
import AlertBadge from './AlertBadge';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import CashflowBudgetWidget from './CashflowBudgetWidget';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  currentUser: User;
  settings: Settings;
  onSubmit: (app: Application) => void;
  initialValues?: { item: string; amount: number; reason?: string; reapplyFromId?: string };
};

const BIZ_CATEGORIES = Object.keys(BUSINESS_EXPENSE_LABELS) as BusinessExpenseCategory[];

export default function ApplicationScreen({ currentUser, settings, onSubmit, initialValues }: Props) {
  const [item, setItem] = useState(initialValues?.item ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [reason, setReason] = useState(initialValues?.reason ?? '');
  const [cashflowCategory, setCashflowCategory] = useState<CashflowCategory>('none');
  const [cashflowSubCategory, setCashflowSubCategory] = useState<BusinessExpenseCategory>('supplies');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const alert = numAmount > 0 ? calcAlert(numAmount, settings) : null;
  const isReapply = !!initialValues?.reapplyFromId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || numAmount <= 0) return;
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
    };
    onSubmit(app);
    setSubmitted(app);
    setShowConfirm(false);
    setItem('');
    setAmount('');
    setReason('');
    setCashflowCategory('none');
    setToast('申請を送信しました！');
  }, [currentUser, item, numAmount, reason, cashflowCategory, cashflowSubCategory, onSubmit, initialValues]);

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-gray-900">📝 {isReapply ? '再申請' : '新規申請'}</h2>
        {isReapply && (
          <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-full">再申請</span>
        )}
      </div>

      {/* 案B: CASHFLOW予算ウィジェット */}
      <CashflowBudgetWidget />

      {submitted ? (
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">申請を送信しました</h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">品目</span>
              <span className="font-medium">{submitted.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-medium">{formatCurrency(submitted.amount)}</span>
            </div>
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
          <button onClick={() => setSubmitted(null)} className="btn-secondary w-full">続けて申請する</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">品目名 <span className="text-red-500">*</span></label>
            <input type="text" value={item} onChange={e => setItem(e.target.value)}
              placeholder="例: AirPods Pro" className="input-field" required />
          </div>
          <div>
            <label className="label">金額 <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0" min="1" className="input-field pl-8" required />
            </div>
          </div>
          <div>
            <label className="label">理由・コメント（任意）</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="購入理由や用途を記入..." rows={3} className="input-field resize-none" />
          </div>

          {alert && <AlertBadge alert={alert} />}

          {/* 案A: CASHFLOW連携 */}
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

          <button type="submit" disabled={!item.trim() || numAmount <= 0} className="btn-primary w-full">
            申請する
          </button>
        </form>
      )}

      {showConfirm && (
        <ConfirmModal
          title={isReapply ? '再申請の確認' : '申請の確認'}
          message={`「${item}」を ${formatCurrency(numAmount)} で申請しますか？`}
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
