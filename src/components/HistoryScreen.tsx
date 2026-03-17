import { useState } from 'react';
import { Application, Settings, User } from '../types';
import { formatCurrency } from '../utils/alert';
import ConfirmModal from './ConfirmModal';

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

type Props = {
  settings: Settings;
  applications: Application[];
  currentUser: User;
  onReapply: (app: Application) => void;
  onCancel: (id: string) => void;
};

const statusLabel: Record<Application['status'], string> = {
  pending: '申請中',
  approved: '承認',
  rejected: '否決',
  cancelled: '取り消し',
};

const statusColor: Record<Application['status'], string> = {
  pending: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HistoryScreen({ settings, applications, currentUser, onReapply, onCancel }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);

  const filtered = applications
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 月別サマリー（申請数・金額・承認数・否決数）
  type MonthStat = { total: number; amount: number; approved: number; rejected: number };
  const monthlyStats = applications.reduce((acc, a) => {
    const key = a.createdAt.slice(0, 7);
    if (!acc[key]) acc[key] = { total: 0, amount: 0, approved: 0, rejected: 0 };
    acc[key].total += 1;
    if (a.status === 'approved') { acc[key].approved += 1; acc[key].amount += a.amount; }
    if (a.status === 'rejected') acc[key].rejected += 1;
    return acc;
  }, {} as Record<string, MonthStat>);

  const sortedMonths = Object.keys(monthlyStats).sort().reverse().slice(0, 3);

  const getName = (user: 'A' | 'B') => user === 'A' ? settings.userA.name : settings.userB.name;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全件' },
    { key: 'pending', label: '申請中' },
    { key: 'approved', label: '承認' },
    { key: 'rejected', label: '否決' },
    { key: 'cancelled', label: '取消' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">📋 申請履歴</h2>

      {/* Monthly summary */}
      {sortedMonths.length > 0 && (
        <div className="card mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">月別サマリー</p>
          <div className="space-y-4">
            {sortedMonths.map(month => {
              const s = monthlyStats[month];
              return (
                <div key={month}>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    {month.replace('-', '年')}月
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">申請数</p>
                      <p className="text-base font-bold text-gray-700">{s.total}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">承認</p>
                      <p className="text-base font-bold text-green-600">{s.approved}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">否決</p>
                      <p className="text-base font-bold text-red-500">{s.rejected}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">承認額</p>
                      <p className="text-xs font-bold text-primary-500">{formatCurrency(s.amount)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{app.item}</h3>
                  {app.reapplyFromId && (
                    <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                      再申請
                    </span>
                  )}
                </div>
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
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {new Date(app.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {app.decidedAt && ` → ${new Date(app.decidedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`}
                </p>
                <div className="flex gap-2">
                  {app.status === 'pending' && app.applicant === currentUser && (
                    <button
                      onClick={() => setCancelTarget(app)}
                      className="text-xs bg-gray-100 text-gray-600 font-semibold px-3 py-1.5 rounded-full active:bg-gray-200"
                    >
                      取り消す
                    </button>
                  )}
                  {app.status === 'rejected' && app.applicant === currentUser && (
                    <button
                      onClick={() => onReapply(app)}
                      className="text-xs bg-primary-100 text-primary-600 font-semibold px-3 py-1.5 rounded-full active:bg-primary-200"
                    >
                      再申請する
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {cancelTarget && (
        <ConfirmModal
          title="申請の取り消し"
          message={`「${cancelTarget.item}」の申請を取り消しますか？`}
          confirmLabel="取り消す"
          isDanger
          onConfirm={() => {
            const id = cancelTarget.id;
            setCancelTarget(null);
            onCancel(id);
          }}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
