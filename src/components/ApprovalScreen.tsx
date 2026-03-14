import { useState } from 'react';
import { User, Settings, Application } from '../types';
import { calcAlert, formatCurrency } from '../utils/alert';
import AlertBadge from './AlertBadge';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

type Props = {
  currentUser: User;
  settings: Settings;
  applications: Application[];
  onDecide: (id: string, status: 'approved' | 'rejected', comment?: string) => void;
};

const REJECT_REASONS = [
  '予算オーバー',
  '今は時期じゃない',
  '必要性が低い',
  '代替案がある',
  'その他',
];

export default function ApprovalScreen({ currentUser, settings, applications, onDecide }: Props) {
  const [deciding, setDeciding] = useState<{ app: Application; action: 'approved' | 'rejected' } | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [decidedIds, setDecidedIds] = useState<Set<string>>(new Set());
  const [decided, setDecided] = useState<{ app: Application; status: 'approved' | 'rejected'; comment?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 自分が決裁者 = 相手が申請者。楽観的にdecidedIdsで除外
  const pending = applications.filter(
    a => a.status === 'pending' && a.applicant !== currentUser && !decidedIds.has(a.id)
  );

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;

  const finalComment = selectedReason === 'その他'
    ? customComment.trim()
    : selectedReason || customComment.trim();

  const handleDecide = () => {
    if (!deciding) return;
    onDecide(deciding.app.id, deciding.action, finalComment || undefined);
    setDecidedIds(prev => new Set(prev).add(deciding.app.id));
    setDecided({ app: deciding.app, status: deciding.action, comment: finalComment });
    setDeciding(null);
    setSelectedReason('');
    setCustomComment('');
    setToast(deciding.action === 'approved' ? '✅ 承認しました' : '❌ 否決しました');
  };


  if (decided) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">決裁完了</h2>
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">{decided.status === 'approved' ? '✅' : '❌'}</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {decided.status === 'approved' ? '承認しました' : '否決しました'}
          </h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">品目</span>
              <span className="font-medium">{decided.app.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-medium">{formatCurrency(decided.app.amount)}</span>
            </div>
            {decided.comment && (
              <div className="flex justify-between">
                <span className="text-gray-500">理由</span>
                <span className="font-medium text-red-600">{decided.comment}</span>
              </div>
            )}
          </div>
          {otherUser.email && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl p-3 mb-3">
              📧 {otherUser.name}に自動でメールを送りました
            </p>
          )}
          <button onClick={() => setDecided(null)} className="btn-secondary w-full">
            決裁一覧に戻る
          </button>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">🔖 決裁</h2>
      <p className="text-gray-500 text-sm mb-6">{otherUser.name}からの申請</p>

      {pending.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">決裁待ちの申請はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(app => {
            const alert = calcAlert(app.amount, settings);
            return (
              <div key={app.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-base">{app.item}</h3>
                    {app.reapplyFromId && (
                      <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                        再申請
                      </span>
                    )}
                  </div>
                  <span className="text-primary-500 font-bold text-lg ml-2 whitespace-nowrap">
                    {formatCurrency(app.amount)}
                  </span>
                </div>
                {app.reason && (
                  <p className="text-sm text-gray-600 mb-2 bg-gray-50 rounded-lg p-2">{app.reason}</p>
                )}
                <p className="text-xs text-gray-400 mb-3">
                  {new Date(app.createdAt).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {alert.level !== 'none' && <AlertBadge alert={alert} />}
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => { setDeciding({ app, action: 'rejected' }); setSelectedReason(''); setCustomComment(''); }}
                    className="flex-1 btn-danger"
                  >
                    否決
                  </button>
                  <button
                    onClick={() => { setDeciding({ app, action: 'approved' }); setSelectedReason(''); setCustomComment(''); }}
                    className="flex-1 btn-primary"
                  >
                    承認
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deciding && (
        <ConfirmModal
          title={deciding.action === 'approved' ? '承認の確認' : '否決の確認'}
          message={`「${deciding.app.item}」(${formatCurrency(deciding.app.amount)})を${deciding.action === 'approved' ? '承認' : '否決'}しますか？`}
          confirmLabel={deciding.action === 'approved' ? '承認する' : '否決する'}
          isDanger={deciding.action === 'rejected'}
          onConfirm={handleDecide}
          onCancel={() => setDeciding(null)}
        >
          {deciding.action === 'rejected' && (
            <div className="space-y-2">
              <label className="label">否決理由</label>
              <select
                value={selectedReason}
                onChange={e => setSelectedReason(e.target.value)}
                className="input-field"
              >
                <option value="">選択してください（任意）</option>
                {REJECT_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {selectedReason === 'その他' && (
                <textarea
                  value={customComment}
                  onChange={e => setCustomComment(e.target.value)}
                  placeholder="理由を記入..."
                  rows={2}
                  className="input-field resize-none"
                />
              )}
            </div>
          )}
        </ConfirmModal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
