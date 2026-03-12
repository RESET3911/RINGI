import { useState } from 'react';
import { Application, Settings } from '../types';
import { formatCurrency } from '../utils/alert';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

type Props = {
  settings: Settings;
  applications: Application[];
};

const statusLabel: Record<Application['status'], string> = {
  pending: '申請中',
  approved: '承認',
  rejected: '否決',
};

const statusColor: Record<Application['status'], string> = {
  pending: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function HistoryScreen({ settings, applications }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = applications
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Monthly summary
  const monthlySummary = applications
    .filter(a => a.status === 'approved')
    .reduce((acc, a) => {
      const key = a.createdAt.slice(0, 7); // YYYY-MM
      acc[key] = (acc[key] || 0) + a.amount;
      return acc;
    }, {} as Record<string, number>);

  const sortedMonths = Object.keys(monthlySummary).sort().reverse().slice(0, 3);

  const getName = (user: 'A' | 'B') => user === 'A' ? settings.userA.name : settings.userB.name;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全件' },
    { key: 'pending', label: '申請中' },
    { key: 'approved', label: '承認' },
    { key: 'rejected', label: '否決' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">📋 申請履歴</h2>

      {/* Monthly summary */}
      {sortedMonths.length > 0 && (
        <div className="card mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">月別承認金額サマリー</p>
          <div className="space-y-2">
            {sortedMonths.map(month => (
              <div key={month} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {month.replace('-', '年')}月
                </span>
                <span className="font-semibold text-primary-500">
                  {formatCurrency(monthlySummary[month])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
              filter === key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Application list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">該当する申請はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="card">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{app.item}</h3>
                <span className="font-bold text-primary-500 ml-2 whitespace-nowrap">
                  {formatCurrency(app.amount)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[app.status]}`}>
                  {statusLabel[app.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {getName(app.applicant)}が申請
                </span>
              </div>
              {app.reason && (
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">{app.reason}</p>
              )}
              {app.comment && (
                <p className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-1">💬 {app.comment}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(app.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                {app.decidedAt && ` → 決裁: ${new Date(app.decidedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
