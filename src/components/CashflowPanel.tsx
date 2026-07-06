import { useCashflowBalance } from '../lib/cashflow';
import { yen } from '../lib/format';

function pctTone(pct: number) {
  if (pct >= 50) return 'text-shu';
  if (pct >= 20) return 'text-karashi';
  return 'text-matsu';
}

type Props = {
  /** 申請額。指定すると貯蓄予測に対する占有率を表示 */
  amount?: number;
  /** ホーム用の大きい表示 */
  large?: boolean;
};

/** CASHFLOW連携の今月の収支サマリー + 貯蓄予測 */
export default function CashflowPanel({ amount = 0, large = false }: Props) {
  const summary = useCashflowBalance();

  if (!summary) return null;
  const { monthlyIncome, livingExpense, businessFixedExpense, monthlyExpense, balance, savingsBalance } = summary;
  if (monthlyIncome === 0 && monthlyExpense === 0) return null;

  return (
    <div className="document">
      <div className="flex items-baseline justify-between mb-2">
        <p className="heading-note">今月の収支 · CASHFLOW</p>
      </div>

      {large ? (
        <>
          <p className={`font-mincho font-extrabold text-4xl tracking-tight ${balance < 0 ? 'text-shu' : 'text-ink'}`}>
            {yen(balance)}
            <span className="text-sm font-gothic font-medium text-ink-faint ml-1.5 tracking-normal">/ 月次余剰</span>
          </p>
          <p className="text-xs text-ink-faint mt-1.5 mb-3">
            純収入 {yen(monthlyIncome)} − 生活費 {yen(livingExpense)} − 固定経費 {yen(businessFixedExpense)}
          </p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-sm">
          <div className="flex justify-between"><span className="text-ink-faint text-xs pt-0.5">純収入</span><span className="font-bold text-matsu">{yen(monthlyIncome)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint text-xs pt-0.5">月次余剰</span><span className={`font-bold ${balance >= 0 ? 'text-ink' : 'text-shu'}`}>{yen(balance)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint text-xs pt-0.5">生活費</span><span className="font-bold text-ink-soft">{yen(livingExpense)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint text-xs pt-0.5">固定経費</span><span className="font-bold text-ink-soft">{yen(businessFixedExpense)}</span></div>
        </div>
      )}

      {/* 1 / 3 / 6 ヶ月貯蓄予測 */}
      <div className="border-t border-dashed border-ink-line pt-2.5">
        <p className="text-[11px] text-ink-faint mb-1.5 tracking-wide">
          貯蓄予測
          {savingsBalance > 0 && <span className="ml-1">（残高 {yen(savingsBalance)} +）</span>}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {([1, 3, 6] as const).map(months => {
            const projected = savingsBalance + balance * months;
            const pct = amount > 0 && projected > 0 ? Math.round((amount / projected) * 100) : null;
            return (
              <div key={months} className="bg-paper rounded-md border border-ink-line/70 py-1.5 px-1">
                <div className="text-[10px] text-ink-faint">{months}ヶ月後</div>
                <div className={`text-[13px] font-bold ${projected >= 0 ? 'text-ink' : 'text-shu'}`}>
                  {yen(projected)}
                </div>
                {pct !== null && (
                  <div className={`text-[10px] font-bold ${pctTone(pct)}`}>{pct}%消費</div>
                )}
              </div>
            );
          })}
        </div>
        {amount > 0 && (
          <p className="text-[10px] text-ink-faint mt-1.5 text-center">↑ 申請額 {yen(amount)} が占める割合</p>
        )}
      </div>
    </div>
  );
}
