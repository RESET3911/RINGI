import { useState, useEffect } from 'react';
import { subscribeCashflowSummary, type CashflowSummary } from '../utils/cashflow';

function fmt(n: number) {
  return '¥' + n.toLocaleString('ja-JP');
}

export default function CashflowBudgetWidget() {
  const [summary, setSummary] = useState<CashflowSummary | null>(null);

  useEffect(() => {
    return subscribeCashflowSummary(setSummary);
  }, []);

  if (!summary) return null;

  const { monthlyIncome, monthlyExpense, balance } = summary;
  if (monthlyIncome === 0 && monthlyExpense === 0) return null;

  return (
    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">💰</span>
        <span className="text-xs font-semibold text-violet-700">CASHFLOW 今月の状況</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-400">収入</div>
          <div className="text-sm font-bold text-emerald-700">{fmt(monthlyIncome)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">支出</div>
          <div className="text-sm font-bold text-rose-600">{fmt(monthlyExpense)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">残り</div>
          <div className={`text-sm font-bold ${balance >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
            {fmt(balance)}
          </div>
        </div>
      </div>
    </div>
  );
}
