import { useState } from 'react';
import { User, Settings, Application, REQUEST_TYPE_CONFIG } from '../types';
import { calcAlert, calcSurplus, formatCurrency } from '../utils/alert';
import AlertBadge from './AlertBadge';
import Toast from './Toast';
import { useCashflowBalance } from '../utils/cashflow';

type DecisionStatus = 'approved' | 'rejected' | 'hold' | 'conditional' | 'discuss';

function fmt(n: number) {
  return '¥' + n.toLocaleString('ja-JP');
}

function pctColor(pct: number) {
  if (pct >= 50) return 'text-red-500 bg-red-50';
  if (pct >= 20) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-700 bg-emerald-50';
}

type Props = {
  currentUser: User;
  settings: Settings;
  applications: Application[];
  onDecide: (
    id: string,
    status: DecisionStatus,
    comment?: string,
    conditionData?: { conditionType?: string | null; conditionText?: string | null; conditionAmount?: number | null }
  ) => void;
};

const DECISION_OPTIONS: { status: DecisionStatus; label: string; icon: string; color: string; activeColor: string }[] = [
  { status: 'approved',    label: '承認',       icon: '✅', color: 'border-gray-200 text-gray-600',  activeColor: 'border-green-400 bg-green-50 text-green-700 font-bold' },
  { status: 'conditional', label: '条件付き',   icon: '🟠', color: 'border-gray-200 text-gray-600',  activeColor: 'border-orange-400 bg-orange-50 text-orange-700 font-bold' },
  { status: 'hold',        label: '保留',       icon: '⏸️', color: 'border-gray-200 text-gray-600',  activeColor: 'border-gray-400 bg-gray-100 text-gray-700 font-bold' },
  { status: 'discuss',     label: '要相談',     icon: '💬', color: 'border-gray-200 text-gray-600',  activeColor: 'border-blue-400 bg-blue-50 text-blue-700 font-bold' },
  { status: 'rejected',    label: '否決',       icon: '❌', color: 'border-gray-200 text-gray-600',  activeColor: 'border-red-400 bg-red-50 text-red-700 font-bold' },
];

const REJECT_REASONS = ['予算オーバー', '今は時期じゃない', '必要性が低い', '代替案がある', 'その他'];

type ConditionTemplate = { id: string; label: string; hasAmount: boolean; template: (amt?: number) => string };
const CONDITION_TEMPLATES: ConditionTemplate[] = [
  { id: 'price_limit',   label: '価格を○円以下にしてほしい', hasAmount: true,  template: amt => `価格を${(amt ?? 0).toLocaleString()}円以下にしてほしい` },
  { id: 'next_month',    label: '来月ならOK',               hasAmount: false, template: () => '来月ならOK' },
  { id: 'second_hand',   label: '中古品ならOK',             hasAmount: false, template: () => '中古品ならOK' },
  { id: 'budget_limit',  label: '予算○円以内ならOK',        hasAmount: true,  template: amt => `予算${(amt ?? 0).toLocaleString()}円以内ならOK` },
  { id: 'after_payment', label: '入金確認後にOK',           hasAmount: false, template: () => '入金確認後にOK' },
  { id: 'savings_remain',label: '貯金○円を残せるならOK',    hasAmount: true,  template: amt => `貯金${(amt ?? 0).toLocaleString()}円を残せるならOK` },
  { id: 'custom',        label: '自由入力',                 hasAmount: false, template: () => '' },
];

export default function ApprovalScreen({ currentUser, settings, applications, onDecide }: Props) {
  const [deciding, setDeciding] = useState<{ app: Application; status: DecisionStatus } | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [conditionTemplateId, setConditionTemplateId] = useState('price_limit');
  const [conditionAmount, setConditionAmount] = useState('');
  const [conditionCustomText, setConditionCustomText] = useState('');
  const [decidedIds, setDecidedIds] = useState<Set<string>>(new Set());
  const [decided, setDecided] = useState<{ app: Application; status: DecisionStatus; comment?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cashflow = useCashflowBalance();

  const pending = applications.filter(
    a => a.status === 'pending' && a.applicant !== currentUser && !decidedIds.has(a.id)
  );

  const otherUser = currentUser === 'A' ? settings.userB : settings.userA;

  const buildConditionData = () => {
    const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
    if (!tpl) return {};
    const amt = tpl.hasAmount ? (parseFloat(conditionAmount) || undefined) : undefined;
    const text = conditionTemplateId === 'custom'
      ? conditionCustomText.trim()
      : tpl.template(amt);
    return {
      conditionType: conditionTemplateId,
      conditionText: text || null,
      conditionAmount: amt ?? null,
    };
  };

  const getComment = () => {
    if (deciding?.status === 'rejected') {
      return selectedReason === 'その他' ? customComment.trim() : selectedReason || customComment.trim();
    }
    return customComment.trim() || undefined;
  };

  const isDecideValid = () => {
    if (!deciding) return false;
    if (deciding.status === 'conditional') {
      const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
      if (!tpl) return false;
      if (tpl.hasAmount && !conditionAmount) return false;
      if (conditionTemplateId === 'custom' && !conditionCustomText.trim()) return false;
    }
    return true;
  };

  const handleDecide = () => {
    if (!deciding || !isDecideValid()) return;
    const comment = getComment();
    const conditionData = deciding.status === 'conditional' ? buildConditionData() : undefined;
    onDecide(deciding.app.id, deciding.status, comment || undefined, conditionData);
    setDecidedIds(prev => new Set(prev).add(deciding.app.id));
    setDecided({ app: deciding.app, status: deciding.status, comment });
    setDeciding(null);
    resetDecideState();
    const labels: Record<DecisionStatus, string> = {
      approved: '✅ 承認しました', rejected: '❌ 否決しました',
      hold: '⏸️ 保留にしました', conditional: '🟠 条件付きで承認しました', discuss: '💬 要相談にしました',
    };
    setToast(labels[deciding.status]);
  };

  const resetDecideState = () => {
    setSelectedReason('');
    setCustomComment('');
    setConditionTemplateId('price_limit');
    setConditionAmount('');
    setConditionCustomText('');
  };

  const startDeciding = (app: Application, status: DecisionStatus) => {
    setDeciding({ app, status });
    resetDecideState();
  };

  const statusBadge: Record<DecisionStatus, { label: string; cls: string }> = {
    approved:    { label: '承認',     cls: 'bg-green-100 text-green-700' },
    rejected:    { label: '否決',     cls: 'bg-red-100 text-red-700' },
    hold:        { label: '保留',     cls: 'bg-gray-100 text-gray-600' },
    conditional: { label: '条件付き', cls: 'bg-orange-100 text-orange-700' },
    discuss:     { label: '要相談',   cls: 'bg-blue-100 text-blue-700' },
  };

  if (decided) {
    const badge = statusBadge[decided.status];
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">決裁完了</h2>
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">
            {DECISION_OPTIONS.find(o => o.status === decided.status)?.icon}
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${badge.cls} mb-3 inline-block`}>
            {badge.label}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mb-2 mt-2">
            {decided.app.item}
          </h3>
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-medium">{formatCurrency(decided.app.amount)}</span>
            </div>
            {decided.comment && (
              <div className="flex justify-between">
                <span className="text-gray-500">コメント</span>
                <span className="font-medium">{decided.comment}</span>
              </div>
            )}
          </div>
          {settings.ntfyTopic && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl p-3 mb-3">
              🔔 {otherUser.name}にプッシュ通知を送りました
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
            const surplus = cashflow ? cashflow.balance : calcSurplus(settings);
            const alert = calcAlert(app.amount, surplus, settings);
            const monthlyBalance = cashflow?.balance ?? null;
            const typeCfg = app.requestType ? REQUEST_TYPE_CONFIG[app.requestType] : null;
            return (
              <div key={app.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeCfg && (
                      <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                        {typeCfg.icon} {typeCfg.label}
                      </span>
                    )}
                    {app.reapplyFromId && (
                      <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                        再申請
                      </span>
                    )}
                  </div>
                  {app.amount > 0 && (
                    <span className="text-primary-500 font-bold text-lg ml-2 whitespace-nowrap">
                      {formatCurrency(app.amount)}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1">{app.item}</h3>

                {app.ruleChangeDetail && (
                  <div className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2">
                    📋 {app.ruleChangeDetail}
                  </div>
                )}
                {app.travelDates && (
                  <p className="text-xs text-sky-600 mb-2">
                    ✈️ {app.travelDates.start} 〜 {app.travelDates.end}
                  </p>
                )}
                {app.scheduleDate && (
                  <p className="text-xs text-indigo-600 mb-2">
                    📅 {new Date(app.scheduleDate).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {app.reason && (
                  <p className="text-sm text-gray-600 mb-2 bg-gray-50 rounded-lg p-2">{app.reason}</p>
                )}
                <p className="text-xs text-gray-400 mb-3">
                  {new Date(app.createdAt).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>

                {monthlyBalance !== null && monthlyBalance > 0 && app.amount > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {([1, 3, 6] as const).map(months => {
                      const saving = monthlyBalance * months;
                      const pct = Math.round((app.amount / saving) * 100);
                      return (
                        <span key={months} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pctColor(pct)}`}>
                          {months}ヶ月余剰の{pct}% ({fmt(saving)})
                        </span>
                      );
                    })}
                  </div>
                )}

                {alert.level !== 'none' && <AlertBadge alert={alert} />}

                {/* 5択決裁ボタン */}
                <div className="grid grid-cols-5 gap-1.5 mt-3">
                  {DECISION_OPTIONS.map(opt => (
                    <button
                      key={opt.status}
                      onClick={() => startDeciding(app, opt.status)}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 text-xs transition-all ${
                        deciding?.app.id === app.id && deciding.status === opt.status
                          ? opt.activeColor
                          : opt.color + ' bg-white'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      <span className="leading-tight text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 決裁モーダル */}
      {deciding && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-100">
              <p className="font-bold text-gray-900">
                {DECISION_OPTIONS.find(o => o.status === deciding.status)?.icon}{' '}
                「{deciding.app.item}」を
                {deciding.status === 'approved'    && '承認しますか？'}
                {deciding.status === 'rejected'    && '否決しますか？'}
                {deciding.status === 'hold'        && '保留にしますか？'}
                {deciding.status === 'conditional' && '条件付きで承認しますか？'}
                {deciding.status === 'discuss'     && '要相談にしますか？'}
              </p>
              {deciding.app.amount > 0 && (
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(deciding.app.amount)}</p>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* 否決: 理由選択 */}
              {deciding.status === 'rejected' && (
                <>
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
                </>
              )}

              {/* 条件付き承認: 条件入力 */}
              {deciding.status === 'conditional' && (
                <div className="space-y-3">
                  <label className="label">条件を選択</label>
                  <select
                    value={conditionTemplateId}
                    onChange={e => { setConditionTemplateId(e.target.value); setConditionAmount(''); setConditionCustomText(''); }}
                    className="input-field"
                  >
                    {CONDITION_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  {CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId)?.hasAmount && (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                      <input
                        type="number"
                        value={conditionAmount}
                        onChange={e => setConditionAmount(e.target.value)}
                        placeholder="金額を入力"
                        min="1"
                        className="input-field pl-8"
                        required
                      />
                    </div>
                  )}
                  {conditionTemplateId === 'custom' && (
                    <textarea
                      value={conditionCustomText}
                      onChange={e => setConditionCustomText(e.target.value)}
                      placeholder="条件を入力..."
                      rows={2}
                      className="input-field resize-none"
                      required
                    />
                  )}
                  {/* プレビュー */}
                  {(() => {
                    const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
                    const amt = parseFloat(conditionAmount) || undefined;
                    const preview = conditionTemplateId === 'custom'
                      ? conditionCustomText
                      : tpl?.template(amt);
                    return preview ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800">
                        💬 {preview}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* 保留・要相談: コメント任意 */}
              {(deciding.status === 'hold' || deciding.status === 'discuss' || deciding.status === 'approved') && (
                <div>
                  <label className="label">コメント（任意）</label>
                  <textarea
                    value={customComment}
                    onChange={e => setCustomComment(e.target.value)}
                    placeholder={
                      deciding.status === 'discuss' ? '相談したい内容を記入...' :
                      deciding.status === 'hold' ? '保留理由を記入...' :
                      '承認コメントを記入...'
                    }
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>
              )}
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setDeciding(null)} className="flex-1 btn-secondary">
                キャンセル
              </button>
              <button
                onClick={handleDecide}
                disabled={!isDecideValid()}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 ${
                  deciding.status === 'rejected'
                    ? 'bg-red-500 text-white active:bg-red-600'
                    : deciding.status === 'approved'
                    ? 'bg-green-500 text-white active:bg-green-600'
                    : deciding.status === 'conditional'
                    ? 'bg-orange-500 text-white active:bg-orange-600'
                    : deciding.status === 'discuss'
                    ? 'bg-blue-500 text-white active:bg-blue-600'
                    : 'bg-gray-500 text-white active:bg-gray-600'
                }`}
              >
                確定する
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
