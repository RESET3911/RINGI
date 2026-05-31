import { useState } from 'react';
import { Application, Settings, User, REQUEST_TYPE_CONFIG, RequestType, ReviewData } from '../types';
import { formatCurrency } from '../utils/alert';
import ConfirmModal from './ConfirmModal';
import ReviewModal from './ReviewModal';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hold' | 'conditional' | 'discuss';
type ViewTab = 'list' | 'stats';

type Props = {
  settings: Settings;
  applications: Application[];
  currentUser: User;
  onReapply: (app: Application) => void;
  onCancel: (id: string) => void;
  onMarkPurchased: (id: string) => void;
  onSubmitReview: (id: string, review: ReviewData) => void;
};

const STATUS_LABEL: Record<Application['status'], string> = {
  pending:     '申請中',
  approved:    '承認',
  rejected:    '否決',
  cancelled:   '取り消し',
  hold:        '保留',
  conditional: '条件付き',
  discuss:     '要相談',
};

const STATUS_COLOR: Record<Application['status'], string> = {
  pending:     'bg-blue-100 text-blue-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  cancelled:   'bg-gray-100 text-gray-500',
  hold:        'bg-gray-200 text-gray-600',
  conditional: 'bg-orange-100 text-orange-700',
  discuss:     'bg-blue-100 text-blue-600',
};

function StarBadge({ score }: { score: number }) {
  return (
    <span className="text-xs bg-yellow-50 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
      {'⭐'.repeat(score)}{'☆'.repeat(5 - score)} {score}/5
    </span>
  );
}

export default function HistoryScreen({ settings, applications, currentUser, onReapply, onCancel, onMarkPurchased, onSubmitReview }: Props) {
  const [viewTab, setViewTab] = useState<ViewTab>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);

  const filtered = applications
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => typeFilter === 'all' || a.requestType === typeFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 月別サマリー
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

  // 統計: レビュー済みデータ集計
  const reviewed = applications.filter(a => a.review);
  const reviewStats = (() => {
    if (reviewed.length === 0) return null;
    type TypeStat = { count: number; scoreSum: number; yesCount: number };
    const byType: Record<string, TypeStat> = {};
    for (const a of reviewed) {
      const key = a.requestType ?? 'purchase';
      if (!byType[key]) byType[key] = { count: 0, scoreSum: 0, yesCount: 0 };
      byType[key].count += 1;
      byType[key].scoreSum += a.review!.satisfactionScore;
      if (a.review!.wouldBuyAgain === 'yes') byType[key].yesCount += 1;
    }
    const totalYes = reviewed.filter(a => a.review!.wouldBuyAgain === 'yes').length;
    const avgScore = reviewed.reduce((s, a) => s + a.review!.satisfactionScore, 0) / reviewed.length;
    return { byType, avgScore, totalYes, total: reviewed.length };
  })();

  const getName = (user: 'A' | 'B') => user === 'A' ? settings.userA.name : settings.userB.name;

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all',         label: '全件' },
    { key: 'pending',     label: '申請中' },
    { key: 'approved',    label: '承認' },
    { key: 'conditional', label: '条件付き' },
    { key: 'hold',        label: '保留' },
    { key: 'discuss',     label: '要相談' },
    { key: 'rejected',    label: '否決' },
    { key: 'cancelled',   label: '取消' },
  ];

  const typeOptions = ([
    { value: 'all', label: 'タイプ: すべて' },
    ...Object.entries(REQUEST_TYPE_CONFIG).map(([k, v]) => ({
      value: k,
      label: `${v.icon} ${v.label}`,
    })),
  ] as { value: string; label: string }[]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">📋 申請履歴</h2>

      {/* 一覧 / 統計タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setViewTab('list')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${viewTab === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
        >
          📋 一覧
        </button>
        <button
          onClick={() => setViewTab('stats')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${viewTab === 'stats' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
        >
          📊 統計
        </button>
      </div>

      {/* ── 統計タブ ── */}
      {viewTab === 'stats' && (
        <div className="space-y-4">
          {/* 月別サマリー */}
          {sortedMonths.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-gray-700 mb-3">月別サマリー</p>
              <div className="space-y-4">
                {sortedMonths.map(month => {
                  const s = monthlyStats[month];
                  return (
                    <div key={month}>
                      <p className="text-sm font-semibold text-gray-600 mb-2">{month.replace('-', '年')}月</p>
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

          {/* レビュー統計 */}
          {reviewStats ? (
            <div className="card">
              <p className="text-sm font-semibold text-gray-700 mb-3">購入後レビュー統計</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">平均満足度</p>
                  <p className="text-2xl font-bold text-yellow-600">{reviewStats.avgScore.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">/ 5.0</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">もう一度買う率</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round((reviewStats.totalYes / reviewStats.total) * 100)}%
                  </p>
                  <p className="text-xs text-gray-400">{reviewStats.totalYes}/{reviewStats.total}件</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-600 mb-2">申請タイプ別</p>
              <div className="space-y-2">
                {Object.entries(reviewStats.byType).map(([typeKey, stat]) => {
                  const cfg = REQUEST_TYPE_CONFIG[typeKey as RequestType];
                  if (!cfg) return null;
                  const avg = (stat.scoreSum / stat.count).toFixed(1);
                  const yesRate = Math.round((stat.yesCount / stat.count) * 100);
                  return (
                    <div key={typeKey} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                      <span className="text-xl">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{cfg.label}</p>
                        <p className="text-xs text-gray-400">{stat.count}件</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-600">⭐ {avg}</p>
                        <p className="text-xs text-green-600">{yesRate}% また買う</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-500 text-sm">レビューを記録するとここに統計が表示されます</p>
            </div>
          )}
        </div>
      )}

      {/* ── 一覧タブ ── */}
      {viewTab === 'list' && (
        <>
          {/* タイプフィルター */}
          <div className="mb-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as RequestType | 'all')}
              className="input-field text-sm py-2"
            >
              {typeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ステータスフィルター（横スクロール） */}
          <div className="overflow-x-auto pb-1 mb-4">
            <div className="flex gap-1.5 w-max">
              {statusFilters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                    statusFilter === key
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 申請リスト */}
          {filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">該当する申請はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(app => {
                const typeCfg = app.requestType ? REQUEST_TYPE_CONFIG[app.requestType] : null;
                const isMyApp = app.applicant === currentUser;
                const canPurchase = app.status === 'approved' && isMyApp && !app.isPurchased;
                const canReview = app.isPurchased && isMyApp && !app.review;

                return (
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
                      {app.amount > 0 && (
                        <span className="font-bold text-primary-500 ml-2 whitespace-nowrap">
                          {formatCurrency(app.amount)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[app.status]}`}>
                        {STATUS_LABEL[app.status]}
                      </span>
                      {typeCfg && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                      )}
                      {app.isPurchased && !app.review && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">購入済</span>
                      )}
                      {app.review && <StarBadge score={app.review.satisfactionScore} />}
                      <span className="text-xs text-gray-400">{getName(app.applicant)}が申請</span>
                    </div>

                    {/* 条件付き承認: 条件テキストを目立つ表示 */}
                    {app.status === 'conditional' && app.conditionText && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                        <p className="text-xs font-semibold text-orange-700 mb-1">🟠 承認条件</p>
                        <p className="text-sm text-orange-800 font-medium">{app.conditionText}</p>
                      </div>
                    )}

                    {app.ruleChangeDetail && (
                      <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded-lg px-2 py-1">
                        📋 {app.ruleChangeDetail}
                      </p>
                    )}
                    {app.travelDates && (
                      <p className="text-xs text-sky-600 mt-1">
                        ✈️ {app.travelDates.start} 〜 {app.travelDates.end}
                      </p>
                    )}
                    {app.reason && (
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">{app.reason}</p>
                    )}
                    {app.comment && (
                      <p className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-1">💬 {app.comment}</p>
                    )}
                    {app.review?.note && (
                      <p className="text-xs text-yellow-700 mt-1 bg-yellow-50 rounded-lg px-2 py-1">
                        📝 {app.review.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <p className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {app.decidedAt && ` → ${new Date(app.decidedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {app.status === 'pending' && isMyApp && (
                          <button
                            onClick={() => setCancelTarget(app)}
                            className="text-xs bg-gray-100 text-gray-600 font-semibold px-3 py-1.5 rounded-full active:bg-gray-200"
                          >
                            取り消す
                          </button>
                        )}
                        {app.status === 'rejected' && isMyApp && (
                          <button
                            onClick={() => onReapply(app)}
                            className="text-xs bg-primary-100 text-primary-600 font-semibold px-3 py-1.5 rounded-full active:bg-primary-200"
                          >
                            再申請する
                          </button>
                        )}
                        {/* Feature B: 条件付き承認 → 条件確認 → 再申請 */}
                        {app.status === 'conditional' && isMyApp && (
                          <button
                            onClick={() => onReapply(app)}
                            className="text-xs bg-orange-100 text-orange-600 font-semibold px-3 py-1.5 rounded-full active:bg-orange-200"
                          >
                            条件を反映して再申請
                          </button>
                        )}
                        {/* Feature C: 購入完了ボタン */}
                        {canPurchase && (
                          <button
                            onClick={() => setReviewTarget(app)}
                            className="text-xs bg-teal-100 text-teal-700 font-semibold px-3 py-1.5 rounded-full active:bg-teal-200"
                          >
                            購入完了にする
                          </button>
                        )}
                        {/* Feature C: レビュー追加 */}
                        {canReview && (
                          <button
                            onClick={() => setReviewTarget(app)}
                            className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-3 py-1.5 rounded-full active:bg-yellow-200"
                          >
                            レビューを記録
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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

      {/* Feature C: レビューモーダル */}
      {reviewTarget && (
        <ReviewModal
          itemName={reviewTarget.item}
          currentUser={currentUser}
          onSubmit={(review) => {
            onMarkPurchased(reviewTarget.id);
            onSubmitReview(reviewTarget.id, review);
            setReviewTarget(null);
          }}
          onSkip={() => {
            onMarkPurchased(reviewTarget.id);
            setReviewTarget(null);
          }}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
