import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  User, Settings, Application, CashflowCategory, BusinessExpenseCategory, RequestType,
} from '../types';
import { BUSINESS_EXPENSE_LABELS, REQUEST_TYPE_CONFIG, ALL_REQUEST_TYPES, otherUser, userMeta } from '../types';
import { calcAlert, calcSurplus } from '../lib/alert';
import { useCashflowBalance } from '../lib/cashflow';
import { yen } from '../lib/format';
import AlertNote from '../components/ui/AlertNote';
import ConfirmSheet from '../components/ui/ConfirmSheet';
import Medallion from '../components/ui/Medallion';
import Stamp from '../components/ui/Stamp';
import CashflowPanel from '../components/CashflowPanel';
import type { ReapplyValues } from '../App';

type Props = {
  currentUser: User;
  settings: Settings;
  onSubmit: (app: Application) => void;
  initialValues?: ReapplyValues;
  onClearInitial: () => void;
};

const BIZ_CATEGORIES = Object.keys(BUSINESS_EXPENSE_LABELS) as BusinessExpenseCategory[];

export default function Apply({ currentUser, settings, onSubmit, initialValues, onClearInitial }: Props) {
  const [selectedType, setSelectedType] = useState<RequestType | null>(initialValues?.requestType ?? null);
  const [item, setItem] = useState(initialValues?.item ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [reason, setReason] = useState(initialValues?.reason ?? '');
  const [cashflowCategory, setCashflowCategory] = useState<CashflowCategory>('none');
  const [cashflowSubCategory, setCashflowSubCategory] = useState<BusinessExpenseCategory>('supplies');
  const [travelStart, setTravelStart] = useState('');
  const [travelEnd, setTravelEnd] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [ruleChangeDetail, setRuleChangeDetail] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState<Application | null>(null);

  // 再申請値が後から渡されたとき反映
  useEffect(() => {
    if (initialValues) {
      setSelectedType(initialValues.requestType ?? null);
      setItem(initialValues.item);
      setAmount(initialValues.amount ? String(initialValues.amount) : '');
      setReason(initialValues.reason ?? '');
      setSubmitted(null);
    }
  }, [initialValues]);

  const cashflow = useCashflowBalance();
  const numAmount = parseFloat(amount) || 0;
  const surplus = cashflow ? cashflow.balance : calcSurplus(settings);
  const alert = numAmount > 0 ? calcAlert(numAmount, surplus, settings) : null;
  const isReapply = !!initialValues?.reapplyFromId;

  const typeConfig = selectedType ? REQUEST_TYPE_CONFIG[selectedType] : null;
  const amountRequired = typeConfig?.amountRequired ?? true;

  const isFormValid = () => {
    if (!selectedType || !item.trim()) return false;
    if (amountRequired && numAmount <= 0) return false;
    if (selectedType === 'travel' && (!travelStart || !travelEnd)) return false;
    if (selectedType === 'rule_change' && !ruleChangeDetail.trim()) return false;
    return true;
  };

  const resetForm = () => {
    setItem(''); setAmount(''); setReason('');
    setCashflowCategory('none');
    setTravelStart(''); setTravelEnd(''); setScheduleDate(''); setRuleChangeDetail('');
  };

  const confirmSubmit = useCallback(() => {
    if (!selectedType) return;
    const app: Application = {
      id: uuidv4(),
      applicant: currentUser,
      item: item.trim(),
      amount: numAmount,
      reason: reason.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reapplyFromId: initialValues?.reapplyFromId,
      cashflowCategory,
      cashflowSubCategory: cashflowCategory === 'business' ? cashflowSubCategory : undefined,
      requestType: selectedType,
      travelDates: selectedType === 'travel' && travelStart && travelEnd
        ? { start: travelStart, end: travelEnd } : undefined,
      scheduleDate: selectedType === 'schedule' && scheduleDate ? scheduleDate : undefined,
      ruleChangeDetail: selectedType === 'rule_change' && ruleChangeDetail.trim()
        ? ruleChangeDetail.trim() : undefined,
    };
    onSubmit(app);
    setSubmitted(app);
    setShowConfirm(false);
    resetForm();
  }, [currentUser, item, numAmount, reason, cashflowCategory, cashflowSubCategory, selectedType,
      travelStart, travelEnd, scheduleDate, ruleChangeDetail, onSubmit, initialValues]);

  const otherName = userMeta(settings, otherUser(currentUser)).name;

  // ── 送信完了 ─────────────────────────────────────────────
  if (submitted) {
    const cfg = submitted.requestType ? REQUEST_TYPE_CONFIG[submitted.requestType] : null;
    return (
      <div className="px-4 py-6">
        <div className="document text-center py-9 animate-rise-in">
          <Stamp text="受付" size={88} animate />
          <h3 className="font-mincho font-bold text-lg text-ink mt-4 tracking-widest">申請を受け付けました</h3>
          <p className="text-xs text-ink-faint mt-1">{otherName}の決裁をお待ちください</p>

          <div className="text-left bg-paper border border-ink-line/70 rounded-md p-4 mt-5 mb-5 text-sm space-y-2">
            {cfg && (
              <div className="flex justify-between">
                <span className="text-ink-faint">申請の種類</span>
                <span className="font-bold">{cfg.label}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink-faint">品目</span>
              <span className="font-bold">{submitted.item}</span>
            </div>
            {submitted.amount > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-faint">金額</span>
                <span className="font-bold">{yen(submitted.amount)}</span>
              </div>
            )}
            {submitted.cashflowCategory !== 'none' && (
              <div className="flex justify-between">
                <span className="text-ink-faint">CASHFLOW連携</span>
                <span className="font-bold text-ai text-xs pt-0.5">
                  {submitted.cashflowCategory === 'business'
                    ? `経費 · ${BUSINESS_EXPENSE_LABELS[submitted.cashflowSubCategory!]}`
                    : '変動費'}
                </span>
              </div>
            )}
          </div>

          {settings.ntfyTopic && (
            <p className="text-xs text-matsu bg-matsu-pale rounded-md p-2.5 mb-4">
              🔔 {otherName}にプッシュ通知を送りました
            </p>
          )}
          <button
            onClick={() => { setSubmitted(null); setSelectedType(null); onClearInitial(); }}
            className="btn-secondary w-full"
          >
            続けて申請する
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: タイプ選択 ────────────────────────────────────
  if (!selectedType) {
    return (
      <div className="px-4 py-5">
        <h2 className="heading">申請</h2>
        <p className="text-xs text-ink-faint mt-1 mb-5">どんな稟議をあげますか？</p>
        <div className="grid grid-cols-2 gap-3">
          {ALL_REQUEST_TYPES.map((type, i) => {
            const cfg = REQUEST_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="card flex items-center gap-3 py-4 active:bg-paper-deep transition-colors animate-rise-in text-left"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Medallion kanji={cfg.kanji} size={40} />
                <span>
                  <span className="block font-mincho font-bold text-ink text-sm tracking-widest">{cfg.label}</span>
                  <span className="block text-[10px] text-ink-faint mt-0.5">{cfg.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: 申請フォーム ──────────────────────────────────
  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-2.5 mb-4">
        {!isReapply && (
          <button onClick={() => setSelectedType(null)} className="btn-ghost -ml-2 px-2" aria-label="タイプ選択に戻る">←</button>
        )}
        <Medallion kanji={typeConfig!.kanji} active size={34} />
        <h2 className="heading text-lg">{typeConfig!.label}申請</h2>
        {isReapply && (
          <span className="seal border-karashi text-karashi bg-karashi-pale">再申請</span>
        )}
      </div>

      {numAmount > 0 && <div className="mb-4"><CashflowPanel amount={numAmount} /></div>}

      <form onSubmit={e => { e.preventDefault(); if (isFormValid()) setShowConfirm(true); }} className="space-y-4">
        <div>
          <label className="label">
            {selectedType === 'rule_change' ? '変更内容の概要' : '品目名'}
            <span className="text-shu">*</span>
          </label>
          <input type="text" value={item} onChange={e => setItem(e.target.value)}
            placeholder={typeConfig!.placeholder}
            className="field" required />
        </div>

        <div>
          <label className="label">
            金額{amountRequired
              ? <span className="text-shu">*</span>
              : <span className="text-ink-faint text-[11px] font-normal">（任意）</span>}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">¥</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" min="1" inputMode="numeric" className="field pl-9"
              required={amountRequired} />
          </div>
        </div>

        {selectedType === 'travel' && (
          <div className="card bg-paper space-y-3">
            <p className="text-[13px] font-bold text-ink-soft">旅行日程</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">出発日<span className="text-shu">*</span></label>
                <input type="date" value={travelStart} onChange={e => setTravelStart(e.target.value)}
                  className="field text-sm" required />
              </div>
              <div>
                <label className="label text-xs">帰宅日<span className="text-shu">*</span></label>
                <input type="date" value={travelEnd} onChange={e => setTravelEnd(e.target.value)}
                  min={travelStart} className="field text-sm" required />
              </div>
            </div>
          </div>
        )}

        {selectedType === 'schedule' && (
          <div>
            <label className="label">希望日時<span className="text-ink-faint text-[11px] font-normal">（任意）</span></label>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              className="field" />
          </div>
        )}

        {selectedType === 'rule_change' && (
          <div>
            <label className="label">変更内容の詳細<span className="text-shu">*</span></label>
            <textarea value={ruleChangeDetail} onChange={e => setRuleChangeDetail(e.target.value)}
              placeholder="例: 食費を月3万→4万に変更したい。理由は物価高騰のため。"
              rows={3} className="field resize-none" required />
          </div>
        )}

        <div>
          <label className="label">理由・コメント<span className="text-ink-faint text-[11px] font-normal">（任意）</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="購入理由や用途を記入..." rows={3} className="field resize-none" />
        </div>

        {alert && <AlertNote alert={alert} />}

        {/* CASHFLOW連携 */}
        {numAmount > 0 && (
          <div className="card bg-paper">
            <p className="text-[13px] font-bold text-ink-soft mb-2.5">承認されたらCASHFLOWに記帳する</p>
            <div className="flex flex-col gap-2">
              {([
                { value: 'none',     label: '連携しない' },
                { value: 'business', label: '仕事の経費として登録' },
                { value: 'variable', label: '変動費・サブスクとして登録' },
              ] as { value: CashflowCategory; label: string }[]).map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cashflowCategory"
                    value={opt.value}
                    checked={cashflowCategory === opt.value}
                    onChange={() => setCashflowCategory(opt.value)}
                    className="accent-shu w-4 h-4"
                  />
                  <span className="text-sm text-ink">{opt.label}</span>
                </label>
              ))}
            </div>
            {cashflowCategory === 'business' && (
              <div className="mt-3">
                <label className="label text-xs">勘定科目</label>
                <select
                  value={cashflowSubCategory}
                  onChange={e => setCashflowSubCategory(e.target.value as BusinessExpenseCategory)}
                  className="field text-sm"
                >
                  {BIZ_CATEGORIES.map(c => (
                    <option key={c} value={c}>{BUSINESS_EXPENSE_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!isFormValid()} className="btn-primary w-full">
          <span className="font-mincho tracking-[0.3em]">{isReapply ? '再申請する' : '申請する'}</span>
        </button>
      </form>

      {showConfirm && (
        <ConfirmSheet
          title={isReapply ? '再申請の確認' : '申請の確認'}
          message={`「${item}」${numAmount > 0 ? `を ${yen(numAmount)} で` : 'を'}申請します。${otherName}に通知が届きます。`}
          confirmLabel="申請する"
          onConfirm={confirmSubmit}
          onCancel={() => setShowConfirm(false)}
        >
          {alert && alert.level !== 'none' && <AlertNote alert={alert} />}
        </ConfirmSheet>
      )}
    </div>
  );
}
