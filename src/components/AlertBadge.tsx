import { AlertInfo } from '../types';
import { formatCurrency } from '../utils/alert';

type Props = {
  alert: AlertInfo;
};

export default function AlertBadge({ alert }: Props) {
  if (alert.level === 'none') return null;

  const isDanger = alert.level === 'danger';
  return (
    <div className={`rounded-xl p-3 flex items-start gap-2 ${isDanger ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <span className="text-lg">{isDanger ? '🔴' : '🟡'}</span>
      <div className="text-sm">
        <p className={`font-semibold ${isDanger ? 'text-red-700' : 'text-yellow-700'}`}>
          {isDanger ? '危険アラート' : '警戒アラート'}
        </p>
        <p className={isDanger ? 'text-red-600' : 'text-yellow-600'}>{alert.message}</p>
        <p className="text-gray-500 mt-0.5">余剰資金: {formatCurrency(alert.surplus)}</p>
      </div>
    </div>
  );
}
