import { useState } from 'react';
import type { ReviewData, User } from '../types';
import Sheet from './ui/Sheet';

type Props = {
  itemName: string;
  currentUser: User;
  onSubmit: (review: ReviewData) => void;
  onSkip: () => void;       // 購入完了のみ（レビューなし）
  onClose: () => void;
};

const STARS = [1, 2, 3, 4, 5];
const SCORE_LABEL = ['', '不満', 'やや不満', '普通', '満足', '大満足'];

export default function ReviewSheet({ itemName, currentUser, onSubmit, onSkip, onClose }: Props) {
  const [score, setScore] = useState(0);
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

  const optBtn = (selected: boolean) =>
    `flex-1 py-2.5 rounded-md border text-sm font-bold transition-colors ${
      selected ? 'border-shu bg-shu-pale text-shu' : 'border-ink-line text-ink-soft bg-paper-card'
    }`;

  return (
    <Sheet title={`購入後レビュー — ${itemName}`} onClose={onClose}>
      <div className="space-y-5">
        {/* 満足度 */}
        <div>
          <label className="label">満足度<span className="text-shu">*</span></label>
          <div className="flex gap-1.5 mt-1">
            {STARS.map(s => (
              <button
                key={s}
                onClick={() => setScore(s)}
                aria-label={`${s}点`}
                className={`text-3xl transition-transform active:scale-90 ${s <= score ? '' : 'grayscale opacity-35'}`}
              >
                ★
              </button>
            ))}
          </div>
          {score > 0 && <p className="text-xs text-ink-faint mt-1">{SCORE_LABEL[score]}</p>}
        </div>

        {/* 使用頻度 */}
        <div>
          <label className="label">使用頻度<span className="text-shu">*</span></label>
          <div className="flex gap-2 mt-1">
            {([
              { v: 'high', label: '高い' },
              { v: 'mid',  label: '普通' },
              { v: 'low',  label: '低い' },
            ] as const).map(opt => (
              <button key={opt.v} onClick={() => setFrequency(opt.v)} className={optBtn(frequency === opt.v)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 買ってよかったか */}
        <div>
          <label className="label">買ってよかった？<span className="text-shu">*</span></label>
          <div className="flex gap-2 mt-1">
            {([
              { v: 'yes',     label: 'はい' },
              { v: 'neutral', label: 'どちらでも' },
              { v: 'no',      label: 'いいえ' },
            ] as const).map(opt => (
              <button key={opt.v} onClick={() => setWouldBuy(opt.v)} className={optBtn(wouldBuy === opt.v)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 実際の金額 */}
        <div>
          <label className="label">実際の金額<span className="text-ink-faint text-[11px] font-normal">（任意・予定と違った場合）</span></label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">¥</span>
            <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)}
              placeholder="0" min="0" inputMode="numeric" className="field pl-9" />
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="label">メモ<span className="text-ink-faint text-[11px] font-normal">（任意）</span></label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="例: もっと早く買えばよかった / 安物でよかったかも"
            rows={2} className="field resize-none" />
        </div>
      </div>

      <div className="space-y-2 mt-5">
        <button onClick={handleSubmit} disabled={!isValid} className="btn-primary w-full">
          レビューを記録する
        </button>
        <button onClick={onSkip} className="btn-secondary w-full text-sm">
          後で記録する（購入完了のみ）
        </button>
      </div>
    </Sheet>
  );
}
