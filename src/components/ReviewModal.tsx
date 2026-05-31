import { useState } from 'react';
import type { ReviewData, User } from '../types';

type Props = {
  itemName: string;
  currentUser: User;
  onSubmit: (review: ReviewData) => void;
  onSkip: () => void;       // 購入完了のみ（レビューなし）
  onClose: () => void;
};

const STARS = [1, 2, 3, 4, 5];

export default function ReviewModal({ itemName, currentUser, onSubmit, onSkip, onClose }: Props) {
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [frequency, setFrequency] = useState<'high' | 'mid' | 'low' | ''>('');
  const [wouldBuy, setWouldBuy] = useState<'yes' | 'neutral' | 'no' | ''>('');
  const [actualAmount, setActualAmount] = useState('');
  const [note, setNote] = useState('');

  const isValid = score > 0 && frequency !== '' && wouldBuy !== '';

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      satisfactionScore: score,
      usageFrequency: frequency as 'high' | 'mid' | 'low',
      wouldBuyAgain: wouldBuy as 'yes' | 'neutral' | 'no',
      actualAmount: actualAmount ? parseFloat(actualAmount) : null,
      note: note.trim() || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900">📦 購入後レビュー</p>
            <p className="text-sm text-gray-500 mt-0.5">{itemName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl p-1">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* 満足度 */}
          <div>
            <label className="label">満足度 <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mt-1">
              {STARS.map(s => (
                <button
                  key={s}
                  onMouseEnter={() => setHoverScore(s)}
                  onMouseLeave={() => setHoverScore(0)}
                  onClick={() => setScore(s)}
                  className="text-3xl transition-transform active:scale-90"
                >
                  {s <= (hoverScore || score) ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            {score > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {['', '不満', 'やや不満', '普通', '満足', '大満足'][score]}
              </p>
            )}
          </div>

          {/* 使用頻度 */}
          <div>
            <label className="label">使用頻度 <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mt-1">
              {([
                { v: 'high', label: '高い' },
                { v: 'mid',  label: '普通' },
                { v: 'low',  label: '低い' },
              ] as { v: 'high' | 'mid' | 'low'; label: string }[]).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setFrequency(opt.v)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    frequency === opt.v
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 買ってよかったか */}
          <div>
            <label className="label">買ってよかったか <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mt-1">
              {([
                { v: 'yes',     label: 'はい',       cls: 'border-green-400 bg-green-50 text-green-700' },
                { v: 'neutral', label: 'どちらでも', cls: 'border-gray-400 bg-gray-100 text-gray-700' },
                { v: 'no',      label: 'いいえ',     cls: 'border-red-400 bg-red-50 text-red-700' },
              ] as { v: 'yes' | 'neutral' | 'no'; label: string; cls: string }[]).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setWouldBuy(opt.v)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    wouldBuy === opt.v ? opt.cls : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 実際の金額（任意） */}
          <div>
            <label className="label">実際の金額 <span className="text-gray-400 text-xs">（任意・予定と違った場合）</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input
                type="number"
                value={actualAmount}
                onChange={e => setActualAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="input-field pl-8"
              />
            </div>
          </div>

          {/* メモ（任意） */}
          <div>
            <label className="label">メモ <span className="text-gray-400 text-xs">（任意）</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例: もっと早く買えばよかった / 安物でよかったかも"
              rows={2}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-0 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="btn-primary w-full disabled:opacity-40"
          >
            レビューを記録する
          </button>
          <button onClick={onSkip} className="btn-secondary w-full text-sm">
            後で記録する（購入完了のみ）
          </button>
        </div>
      </div>
    </div>
  );
}
