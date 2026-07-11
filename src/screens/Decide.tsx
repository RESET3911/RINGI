import { useState } from 'react';
import {
  User, Settings, Application, DecisionStatus, Tone,
  REQUEST_TYPE_CONFIG, STATUS_CONFIG, otherUser, userMeta,
} from '../types';
import { calcAlert, calcSurplus } from '../lib/alert';
import { useCashflowBalance } from '../lib/cashflow';
import { yen, dateTime } from '../lib/format';
import AlertNote from '../components/ui/AlertNote';
import Sheet from '../components/ui/Sheet';
import Stamp from '../components/ui/Stamp';
import Medallion from '../components/ui/Medallion';
import { TONE_SOLID_BTN, TONE_TEXT } from '../components/ui/tones';

type Props = {
  currentUser: User;
  settings: Settings;
  applications: Application[];
  onDecide: (
    app: Application,
    status: DecisionStatus,
    comment?: string,
    conditionData?: { conditionType?: string | null; conditionText?: string | null; conditionAmount?: number | null }
  ) => void;
};

const DECISIONS: { status: DecisionStatus; tone: Tone }[] = [
  { status: 'approved',    tone: 'shu' },
  { status: 'conditional', tone: 'karashi' },
  { status: 'hold',        tone: 'nezu' },
  { status: 'discuss',     tone: 'ai' },
  { status: 'rejected',    tone: 'ink' },
];

const REJECT_REASONS = ['予算オーバー', '今は時期じゃない', '必要性が低い', '代替案がある', 'その他'];

type ConditionTemplate = { id: string; label: string; hasAmount: boolean; template: (amt?: number) => string };
const CONDITION_TEMPLATES: ConditionTemplate[] = [
  { id: 'price_limit',    label: '価格を○円以下にしてほしい', hasAmount: true,  template: amt => `価格を${(amt ?? 0).toLocaleString()}円以下にしてほしい` },
  { id: 'next_month',     label: '来月ならOK',               hasAmount: false, template: () => '来月ならOK' },
  { id: 'second_hand',    label: '中古品ならOK',             hasAmount: false, template: () => '中古品ならOK' },
  { id: 'budget_limit',   label: '予算○円以内ならOK',        hasAmount: true,  template: amt => `予算${(amt ?? 0).toLocaleString()}円以内ならOK` },
  { id: 'after_payment',  label: '入金確認後にOK',           hasAmount: false, template: () => '入金確認後にOK' },
  { id: 'savings_remain', label: '貯金○円を残せるならOK',    hasAmount: true,  template: amt => `貯金${(amt ?? 0).toLocaleString()}円を残せるならOK` },
  { id: 'custom',         label: '自由入力',                 hasAmount: false, template: () => '' },
];

function pctTone(pct: number) {
  if (pct >= 50) return 'text-shu';
  if (pct >= 20) return 'text-karashi';
  return 'text-matsu';
}

export default function Decide({ currentUser, settings, applications, onDecide }: Props) {
  const [deciding, setDeciding] = useState<{ app: Application; status: DecisionStatus } | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [conditionTemplateId, setConditionTemplateId] = useState('price_limit');
  const [conditionAmount, setConditionAmount] = useState('');
  const [conditionCustomText, setConditionCustomText] = useState('');
  const [stamped, setStamped] = useState<{ app: Application; status: DecisionStatus; comment?: string } | null>(null);

  const cashflow = useCashflowBalance();

  const pending = applications
    .filter(a => a.status === 'pending' && a.applicant !== currentUser)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  const otherName = userMeta(settings, otherUser(currentUser)).name;
  const myName = userMeta(settings, currentUser).name;

  const resetSheet = () => {
    setSelectedReason('');
    setCustomComment('');
    setConditionTemplateId('price_limit');
    setConditionAmount('');
    setConditionCustomText('');
  };

  const startDeciding = (app: Application, status: DecisionStatus) => {
    resetSheet();
    setDeciding({ app, status });
  };

  const buildConditionData = () => {
    const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
    if (!tpl) return {};
    const amt = tpl.hasAmount ? (parseFloat(conditionAmount) || undefined) : undefined;
    const text = conditionTemplateId === 'custom' ? conditionCustomText.trim() : tpl.template(amt);
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

  const isValid = () => {
    if (!deciding) return false;
    if (deciding.status === 'conditional') {
      const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
      if (!tpl) return false;
      if (tpl.hasAmount && !conditionAmount) return false;
      if (conditionTemplateId === 'custom' && !conditionCustomText.trim()) return false;
    }
    return true;
  };

  const commitDecision = () => {
    if (!deciding || !isValid()) return;
    const comment = getComment();
    const conditionData = deciding.status === 'conditional' ? buildConditionData() : undefined;
    onDecide(deciding.app, deciding.status, comment || undefined, conditionData);
    setStamped({ app: deciding.app, status: deciding.status, comment });
    setDeciding(null);
  };

  // ── 押印完了画面 ─────────────────────────────────────────
  if (stamped) {
    const cfg = STATUS_CONFIG[stamped.status];
    const tone = DECISIONS.find(d => d.status === stamped.status)!.tone;
    return (
      <div className="px-4 py-6">
        <div className="document text-center py-10 animate-rise-in relative overflow-visible">
          <p className="heading-note mb-1">決裁完了</p>
          <h3 className="font-mincho font-bold text-xl text-ink tracking-widest mb-6">{stamped.app.item}</h3>

          <div className="relative inline-block">
            <Stamp text={cfg.seal} tone={tone} size={104} animate />
          </div>

          <p className={`font-mincho font-bold tracking-[0.3em] mt-4 ${TONE_TEXT[tone]}`}>{cfg.label}</p>

          <div className="text-left bg-paper border border-ink-line/70 rounded-md p-4 mt-6 text-sm space-y-2 mx-2">
            {stamped.app.amount > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-faint">金額</span>
                <span className="font-bold">{yen(stamped.app.amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink-faint">決裁者</span>
              <span className="font-bold">{myName}</span>
            </div>
            {stamped.comment && (
              <div className="flex justify-between gap-4">
                <span className="text-ink-faint shrink-0">コメント</span>
                <span className="font-bold text-right">{stamped.comment}</span>
              </div>
            )}
          </div>

          {settings.ntfyTopic && (
            <p className="text-xs text-matsu bg-matsu-pale rounded-md p-2.5 mt-4 mx-2">
              🔔 {otherName}にプッシュ通知を送りました
            </p>
          )}

          <button onClick={() => setStamped(null)} className="btn-secondary w-full mt-5">
            決裁一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  // ── 決裁一覧 ────────────────────────────────────────────
  return (
    <div className="px-4 py-5">
      <h2 className="heading">決裁</h2>
      <p className="text-xs text-ink-faint mt-1 mb-5">{otherName}からの稟議書 {pending.length > 0 && `· ${pending.length}件`}</p>

      {pending.length === 0 ? (
        <div className="card text-center py-14 animate-rise-in">
          <Stamp text="済" tone="matsu" size={64} />
          <p className="text-ink-soft text-sm mt-4">決裁待ちの申請はありません</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pending.map((app, i) => {
            const surplus = cashflow ? cashflow.balance : calcSurplus(settings);
            const alert = app.amount > 0 ? calcAlert(app.amount, surplus, settings) : null;
            const monthlyBalance = cashflow?.balance ?? null;
            const typeCfg = app.requestType ? REQUEST_TYPE_CONFIG[app.requestType] : null;
            return (
              <div key={app.id} className="document animate-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
                {/* 書類ヘッダー */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-dashed border-ink-line">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Medallion kanji={typeCfg?.kanji ?? '申'} size={36} />
                    <div className="min-w-0">
                      <h3 className="font-mincho font-bold text-ink text-base leading-snug break-words">{app.item}</h3>
                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {typeCfg?.label ?? '申請'}
                        {app.reapplyFromId && <span className="ml-1.5 text-karashi font-bold">再申請</span>}
                      </p>
                    </div>
                  </div>
                  {app.amount > 0 && (
                    <p className="font-mincho font-extrabold text-xl text-ink whitespace-nowrap">{yen(app.amount)}</p>
                  )}
                </div>

                {/* 書類ボディ */}
                <div className="py-3 space-y-2 text-sm">
                  <div className="flex gap-3">
                    <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">申請者</span>
                    <span className="font-bold">{otherName}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">日時</span>
                    <span className="text-ink-soft">{dateTime(app.createdAt)}</span>
                  </div>
                  {app.travelDates && (
                    <div className="flex gap-3">
                      <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">日程</span>
                      <span className="text-ink-soft">{app.travelDates.start} 〜 {app.travelDates.end}</span>
                    </div>
                  )}
                  {app.scheduleDate && (
                    <div className="flex gap-3">
                      <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">希望日時</span>
                      <span className="text-ink-soft">{dateTime(app.scheduleDate)}</span>
                    </div>
                  )}
                  {app.ruleChangeDetail && (
                    <div className="flex gap-3">
                      <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">変更詳細</span>
                      <span className="text-ink-soft whitespace-pre-wrap">{app.ruleChangeDetail}</span>
                    </div>
                  )}
                  {app.reason && (
                    <div className="flex gap-3">
                      <span className="text-[11px] text-ink-faint w-14 shrink-0 pt-0.5">理由</span>
                      <span className="text-ink-soft whitespace-pre-wrap">{app.reason}</span>
                    </div>
                  )}
                </div>

                {/* 貯蓄インパクト */}
                {monthlyBalance !== null && monthlyBalance > 0 && app.amount > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {([1, 3, 6] as const).map(months => {
                      const saving = monthlyBalance * months;
                      const pct = Math.round((app.amount / saving) * 100);
                      return (
                        <span key={months} className={`text-[10px] font-bold px-2 py-1 rounded-full bg-paper border border-ink-line/70 ${pctTone(pct)}`}>
                          {months}ヶ月余剰の{pct}%
                        </span>
                      );
                    })}
                  </div>
                )}

                {alert && alert.level !== 'none' && <div className="mb-2"><AlertNote alert={alert} /></div>}

                {/* 決裁印ボタン */}
                <div className="pt-2 border-t border-dashed border-ink-line">
                  <p className="text-[10px] text-ink-faint tracking-[0.3em] text-center mb-2">どの印を押しますか</p>
                  <div className="grid grid-cols-5 gap-2">
                    {DECISIONS.map(d => {
                      const cfg = STATUS_CONFIG[d.status];
                      return (
                        <button
                          key={d.status}
                          onClick={() => startDeciding(app, d.status)}
                          className="flex flex-col items-center gap-1 group"
                          aria-label={cfg.label}
                        >
                          <Stamp text={cfg.seal} tone={d.tone} size={46} className="transition-transform group-active:scale-90" />
                          <span className="text-[10px] font-bold text-ink-soft">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 決裁シート ── */}
      {deciding && (() => {
        const cfg = STATUS_CONFIG[deciding.status];
        const tone = DECISIONS.find(d => d.status === deciding.status)!.tone;
        const previewText = (() => {
          if (deciding.status !== 'conditional') return null;
          const tpl = CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId);
          const amt = parseFloat(conditionAmount) || undefined;
          return conditionTemplateId === 'custom' ? conditionCustomText : tpl?.template(amt);
        })();

        return (
          <Sheet
            title={<span className="flex items-center gap-2"><Stamp text={cfg.seal} tone={tone} size={30} />「{deciding.app.item}」を{cfg.label}</span>}
            onClose={() => setDeciding(null)}
          >
            {deciding.app.amount > 0 && (
              <p className="text-sm text-ink-faint -mt-1 mb-3">{yen(deciding.app.amount)}</p>
            )}

            <div className="space-y-3">
              {deciding.status === 'rejected' && (
                <>
                  <div>
                    <label className="label">否決理由</label>
                    <select value={selectedReason} onChange={e => setSelectedReason(e.target.value)} className="field">
                      <option value="">選択してください（任意）</option>
                      {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {selectedReason === 'その他' && (
                    <textarea value={customComment} onChange={e => setCustomComment(e.target.value)}
                      placeholder="理由を記入..." rows={2} className="field resize-none" />
                  )}
                </>
              )}

              {deciding.status === 'conditional' && (
                <>
                  <div>
                    <label className="label">条件を選択</label>
                    <select
                      value={conditionTemplateId}
                      onChange={e => { setConditionTemplateId(e.target.value); setConditionAmount(''); setConditionCustomText(''); }}
                      className="field"
                    >
                      {CONDITION_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  {CONDITION_TEMPLATES.find(t => t.id === conditionTemplateId)?.hasAmount && (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">¥</span>
                      <input type="number" value={conditionAmount} onChange={e => setConditionAmount(e.target.value)}
                        placeholder="金額を入力" min="1" inputMode="numeric" className="field pl-9" />
                    </div>
                  )}
                  {conditionTemplateId === 'custom' && (
                    <textarea value={conditionCustomText} onChange={e => setConditionCustomText(e.target.value)}
                      placeholder="条件を入力..." rows={2} className="field resize-none" />
                  )}
                  {previewText && (
                    <div className="border border-karashi/50 bg-karashi-pale rounded-md p-3 text-sm text-karashi font-bold">
                      条件: {previewText}
                    </div>
                  )}
                </>
              )}

              {(deciding.status === 'hold' || deciding.status === 'discuss' || deciding.status === 'approved') && (
                <div>
                  <label className="label">コメント<span className="text-ink-faint text-[11px] font-normal">（任意）</span></label>
                  <textarea
                    value={customComment}
                    onChange={e => setCustomComment(e.target.value)}
                    placeholder={
                      deciding.status === 'discuss' ? '相談したい内容を記入...' :
                      deciding.status === 'hold' ? '保留理由を記入...' :
                      'ひとことどうぞ...'
                    }
                    rows={2}
                    className="field resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeciding(null)} className="flex-1 btn-secondary">やめる</button>
              <button
                onClick={commitDecision}
                disabled={!isValid()}
                className={`flex-1 font-bold py-3 px-4 rounded-md tracking-wider min-h-[48px] transition-all disabled:opacity-40 ${TONE_SOLID_BTN[tone]}`}
              >
                <span className="font-mincho tracking-[0.2em]">{cfg.seal}印を押す</span>
              </button>
            </div>
          </Sheet>
        );
      })()}
    </div>
  );
}
