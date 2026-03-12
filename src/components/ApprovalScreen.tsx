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

export default function ApprovalScreen({ currentUser, settings, applications, onDecide }: Props) {
  const [deciding, setDeciding] = useState<{ app: Application; action: 'approved' | 'rejected' } | null>(null);
  const [comment, setComment] = useState('');
  const [decided, setDecided] = useState<{ app: Application; status: 'approved' | 'rejected' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 自分が決裁者 = 相手が申請者
  const pending = applications.filter(
    a => a.status === 'pending' && a.applicant !== currentUser
  );

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;
  const selfUser = currentUser === 'A' ? settings.userA : settings.userB;

  const handleDecide = () => {
    if (!deciding) return;
    onDecide(deciding.app.id, deciding.action, comment.trim() || undefined);
    setDecided({ app: deciding.app, status: deciding.action });
    setDeciding(null);
    setComment('');
    setToast(deciding.action === 'approved' ? '✅ 承認しました' : '❌ 否決しました');
  };

  const mailtoLink = decided ? (() => {
    const isApproved = decided.status === 'approved';
    const subject = encodeURIComponent(`【稟議${isApproved ? '承認' : '否決'}】${decided.app.item}`);
    const body = encodeURIComponent(
      `${selfUser.name}が稟議を${isApproved ? '承認' : '否決'}しました。\n\n` +
      `■ 品目: ${decided.app.item}\n` +
      `■ 金額: ${formatCurrency(decided.app.amount)}\n` +
      `■ 結果: ${isApproved ? '✅ 承認' : '❌ 否決'}\n` +
      (comment ? `■ コメント: ${comment}\n` : '')
    );
    return `mailto:${otherUser.email}?subject=${subject}&body=${body}`;
  })() : '';

  if (decided) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">✅ 決裁完了</h2>
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">{decided.status === 'approved' ? '✅' : '❌'}</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {decided.status === 'approved' ? '承認しました' : '否決しました'}
          </h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">品目</span>
              <span className="font-medium">{decided.app.item}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-medium">{formatCurrency(decided.app.amount)}</span>
            </div>
          </div>
          {otherUser.email && (
            <a href={mailtoLink} className="btn-primary block text-center mb-3">
              📧 {otherUser.name}にメールを送る
            </a>
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
                  <h3 className="font-bold text-gray-900 text-base">{app.item}</h3>
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
                    onClick={() => { setDeciding({ app, action: 'rejected' }); setComment(''); }}
                    className="flex-1 btn-danger"
                  >
                    否決
                  </button>
                  <button
                    onClick={() => { setDeciding({ app, action: 'approved' }); setComment(''); }}
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
            <div>
              <label className="label">コメント（任意）</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="否決理由など..."
                rows={2}
                className="input-field resize-none"
              />
            </div>
          )}
        </ConfirmModal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
