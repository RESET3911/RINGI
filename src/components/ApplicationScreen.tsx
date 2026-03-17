import { useState, useCallback } from 'react';
import { User, Settings, Application } from '../types';
import { calcAlert, formatCurrency } from '../utils/alert';
import AlertBadge from './AlertBadge';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  currentUser: User;
  settings: Settings;
  onSubmit: (app: Application) => void;
  initialValues?: { item: string; amount: number; reason?: string; reapplyFromId?: string };
};

export default function ApplicationScreen({ currentUser, settings, onSubmit, initialValues }: Props) {
  const [item, setItem] = useState(initialValues?.item ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [reason, setReason] = useState(initialValues?.reason ?? '');
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
    };
    onSubmit(app);
    setSubmitted(app);
    setShowConfirm(false);
    setItem('');
    setAmount('');
    setReason('');
    setToast('申請を送信しました！');
  }, [currentUser, item, numAmount, reason, onSubmit, initialValues]);

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-bold text-gray-900">📝 {isReapply ? '再申請' : '新規申請'}</h2>
        {isReapply && (
          <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-full">
            再申請
          </span>
        )}
      </div>

      {submitted ? (
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">申請を送信しました</h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">品目</span>
              <span className="font-medium">{submitted.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-medium">{formatCurrency(submitted.amount)}</span>
            </div>
          </div>
          {settings.ntfyTopic && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl p-3 mb-3">
              🔔 {otherUser.name}にプッシュ通知を送りました
            </p>
          )}
          <button onClick={() => setSubmitted(null)} className="btn-secondary w-full">
            続けて申請する
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">品目名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="例: AirPods Pro"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">金額 <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="input-field pl-8"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">理由・コメント（任意）</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="購入理由や用途を記入..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {alert && <AlertBadge alert={alert} />}

          <button
            type="submit"
            disabled={!item.trim() || numAmount <= 0}
            className="btn-primary w-full"
          >
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
