import { useCashflowBalance } from '../utils/cashflow';

function fmt(n: number) {
  return '¥' + n.toLocaleString('ja-JP');
}

function pctColor(pct: number) {
  if (pct >= 50) return 'text-red-500';
  if (pct >= 20) return 'text-amber-500';
  return 'text-emerald-600';
}

type Props = {
  amount?: number;
};

export default function CashflowBudgetWidget({ amount = 0 }: Props) {
  const summary = useCashflowBalance();

  if (!summary) return null;
  const { monthlyIncome, monthlyExpense, balance } = summary;
  if (monthlyIncome === 0 && monthlyExpense === 0) return null;

  return (
    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">💰</span>
        <span className="text-xs font-semibold text-violet-700">CASHFLOW 今月の状況</span>
      </div>

      {/* 収入 / 支出 / 月次収支 */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <div className="text-xs text-gray-400">純収入</div>
          <div className="text-sm font-bold text-emerald-700">{fmt(monthlyIncome)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">生活費</div>
          <div className="text-sm font-bold text-rose-600">{fmt(monthlyExpense)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">月次余剰</div>
          <div className={`text-sm font-bold ${balance >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
            {fmt(balance)}
          </div>
        </div>
      </div>

      {/* 1 / 3 / 6 ヶ月貯蓄予測 */}
      <div className="border-t border-violet-100 pt-2">
        <div className="text-xs text-gray-400 mb-1.5">貯蓄予測（生活費を引いた残り）</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {([1, 3, 6] as const).map(months => {
            const saving = balance * months;
            const pct = amount > 0 && saving > 0 ? Math.round((amount / saving) * 100) : null;
            return (
              <div key={months} className="bg-white rounded-lg p-1.5">
                <div className="text-xs text-gray-400">{months}ヶ月後</div>
                <div className={`text-sm font-bold ${saving >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
                  {fmt(saving)}
                </div>
                {pct !== null && (
                  <div className={`text-xs font-semibold ${pctColor(pct)}`}>
                    {pct}%消費
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {amount > 0 && balance > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-center">↑ 申請額 {fmt(amount)} の占有率</p>
        )}
      </div>
    </div>
  );
}
