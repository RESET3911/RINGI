import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Settings } from '../types';
import { yen } from '../lib/format';
import { useCashflowBalance } from '../lib/cashflow';
import { ntfyPush } from '../lib/notify';
import Toast from '../components/ui/Toast';

type Props = {
  settings: Settings;
  onSave: (settings: Settings) => void;
};

export default function SettingsScreen({ settings, onSave }: Props) {
  const [form, setForm] = useState<Settings>(JSON.parse(JSON.stringify(settings)));
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');
  const cashflow = useCashflowBalance();
  const hasCashflow = cashflow && (cashflow.monthlyIncome > 0 || cashflow.expenseItems.length > 0);

  const handleSave = () => {
    onSave(form);
    setToast({ msg: '設定を保存しました' });
  };

  const addFixedCost = () => {
    if (!newCostLabel.trim() || !newCostAmount) return;
    setForm(f => ({
      ...f,
      fixedCosts: [...f.fixedCosts, { id: uuidv4(), label: newCostLabel.trim(), amount: parseFloat(newCostAmount) }],
    }));
    setNewCostLabel('');
    setNewCostAmount('');
  };

  const totalFixed = form.fixedCosts.reduce((s, c) => s + c.amount, 0);
  const surplus = form.monthlyIncome + form.extraIncome - totalFixed;

  const sendTestNotification = async () => {
    const topic = form.ntfyTopic.trim();
    if (!topic) return;
    try {
      await ntfyPush(topic, '🔔 RINGIテスト通知', 'テスト通知が届いたら設定完了です！');
      setToast({ msg: 'テスト通知を送信しました' });
    } catch (e) {
      setToast({ msg: `送信エラー: ${String(e)}`, type: 'error' });
    }
  };

  return (
    <div className="px-4 py-5">
      <h2 className="heading mb-5">設定</h2>

      <div className="space-y-4">
        {/* ── プッシュ通知 ── */}
        <section className="card">
          <h3 className="font-mincho font-bold text-ink tracking-widest mb-1">プッシュ通知（ntfy）</h3>
          <p className="text-[11px] text-ink-faint leading-relaxed mb-3">
            ntfyアプリで申請・決裁を自動通知します。ふたりで同じトピック名を設定してください。
          </p>
          <label className="label">トピック名（ふたり共通・秘密の名前）</label>
          <input
            type="text"
            value={form.ntfyTopic}
            onChange={e => setForm(f => ({ ...f, ntfyTopic: e.target.value }))}
            className="field mb-3"
            placeholder="例: ringi-yamada2025"
          />
          <button
            type="button"
            disabled={!form.ntfyTopic.trim()}
            onClick={sendTestNotification}
            className="btn-secondary w-full text-sm"
          >
            テスト通知を送る
          </button>
          <ol className="text-[11px] text-ink-faint mt-3 space-y-0.5 list-decimal list-inside">
            <li>iPhoneに「ntfy」アプリをインストール</li>
            <li>アプリでトピック名を購読</li>
            <li>ここに同じトピック名を入力して保存</li>
            <li>「テスト通知を送る」で確認</li>
          </ol>
        </section>

        {/* ── ユーザー ── */}
        <section className="card">
          <h3 className="font-mincho font-bold text-ink tracking-widest mb-3">ユーザー</h3>
          <div className="space-y-4">
            {(['A', 'B'] as const).map(user => {
              const key = user === 'A' ? 'userA' : 'userB';
              const userData = form[key];
              return (
                <div key={user}>
                  <label className="label">{user}さんの名前</label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={e => setForm(f => ({ ...f, [key]: { ...userData, name: e.target.value } }))}
                    className="field"
                    placeholder={`${user}さん`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 収支 ── */}
        <section className="card">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-mincho font-bold text-ink tracking-widest">収支</h3>
            {hasCashflow && (
              <span className="seal border-ai text-ai bg-ai-pale">CASHFLOW連携中</span>
            )}
          </div>

          {hasCashflow && cashflow ? (
            <div className="space-y-3">
              {/* 収入 */}
              <div className="bg-paper rounded-md border border-ink-line/70 p-3">
                <p className="text-[11px] font-bold text-matsu mb-2">純収入（CASHFLOWから自動取得・外注費控除後）</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">固定収入</span>
                    <span className="font-bold">{yen(cashflow.fixedIncome)}</span>
                  </div>
                  {cashflow.variableIncome > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-soft">変動収入</span>
                      <span className="font-bold">{yen(cashflow.variableIncome)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-ink-line pt-1.5 font-bold">
                    <span>合計</span>
                    <span className="text-matsu">{yen(cashflow.monthlyIncome)}</span>
                  </div>
                </div>
              </div>

              {/* 生活費 */}
              <div className="bg-paper rounded-md border border-ink-line/70 p-3">
                <p className="text-[11px] font-bold text-shu-deep mb-2">生活費（CASHFLOWから自動取得）</p>
                {cashflow.expenseItems.length > 0 ? (
                  <div className="space-y-1.5 text-sm">
                    {cashflow.expenseItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-ink-soft">{item.name}</span>
                        <span className="font-bold">{yen(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-ink-line pt-1.5 font-bold">
                      <span>合計</span>
                      <span className="text-shu-deep">{yen(cashflow.livingExpense)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-faint">固定費が登録されていません</p>
                )}
              </div>

              {/* 固定経費 */}
              {cashflow.businessFixedItems.length > 0 && (
                <div className="bg-paper rounded-md border border-ink-line/70 p-3">
                  <p className="text-[11px] font-bold text-ai mb-2">固定経費（CASHFLOWから自動取得）</p>
                  <div className="space-y-1.5 text-sm">
                    {cashflow.businessFixedItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-ink-soft">{item.name}</span>
                        <span className="font-bold">{yen(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-ink-line pt-1.5 font-bold">
                      <span>合計</span>
                      <span className="text-ai">{yen(cashflow.businessFixedExpense)}</span>
                    </div>
                  </div>
                </div>
              )}

              {cashflow.savingsBalance > 0 && (
                <div className="bg-paper rounded-md border border-ink-line/70 p-3 flex items-baseline justify-between">
                  <p className="text-[11px] font-bold text-ink-soft">現在の貯蓄残高</p>
                  <p className="font-mincho font-extrabold text-lg text-ink">{yen(cashflow.savingsBalance)}</p>
                </div>
              )}

              <div className="bg-shu-pale border border-shu/30 rounded-md p-3">
                <p className="text-[11px] text-ink-faint mb-0.5">月次余剰資金（CASHFLOWベース）</p>
                <p className={`font-mincho font-extrabold text-xl ${cashflow.balance < 0 ? 'text-shu' : 'text-ink'}`}>
                  {yen(cashflow.balance)}
                </p>
                <p className="text-[10px] text-ink-faint mt-1">収入・固定費はCASHFLOWアプリで管理してください</p>
              </div>
            </div>
          ) : (
            /* CASHFLOW未連携時の手動設定 */
            <>
              <div className="space-y-3">
                <div>
                  <label className="label">月収合計（ふたり合算）</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">¥</span>
                    <input
                      type="number" inputMode="numeric"
                      value={form.monthlyIncome || ''}
                      onChange={e => setForm(f => ({ ...f, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                      className="field pl-9" placeholder="0" min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">来月の臨時収入<span className="text-ink-faint text-[11px] font-normal">（任意）</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">¥</span>
                    <input
                      type="number" inputMode="numeric"
                      value={form.extraIncome || ''}
                      onChange={e => setForm(f => ({ ...f, extraIncome: parseFloat(e.target.value) || 0 }))}
                      className="field pl-9" placeholder="0" min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="label">固定費リスト</label>
                {form.fixedCosts.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {form.fixedCosts.map(cost => (
                      <div key={cost.id} className="flex items-center gap-2 bg-paper rounded-md border border-ink-line/70 px-3 py-2">
                        <span className="flex-1 text-sm">{cost.label}</span>
                        <span className="text-sm font-bold">{yen(cost.amount)}</span>
                        <button
                          onClick={() => setForm(f => ({ ...f, fixedCosts: f.fixedCosts.filter(c => c.id !== cost.id) }))}
                          aria-label={`${cost.label}を削除`}
                          className="text-ink-faint p-1 min-w-[32px] min-h-[32px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold px-3">
                      <span>合計</span>
                      <span>{yen(totalFixed)}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text" value={newCostLabel}
                    onChange={e => setNewCostLabel(e.target.value)}
                    placeholder="例: 家賃" className="field flex-1 min-w-0"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm font-bold">¥</span>
                    <input
                      type="number" inputMode="numeric" value={newCostAmount}
                      onChange={e => setNewCostAmount(e.target.value)}
                      placeholder="0" min="0" className="field pl-7 w-full"
                    />
                  </div>
                  <button
                    type="button" onClick={addFixedCost}
                    disabled={!newCostLabel.trim() || !newCostAmount}
                    className="btn-primary px-4 shrink-0 text-sm"
                  >
                    追加
                  </button>
                </div>
              </div>

              {(form.monthlyIncome > 0 || totalFixed > 0) && (
                <div className="mt-4 bg-shu-pale border border-shu/30 rounded-md p-3">
                  <p className="text-[11px] text-ink-faint mb-0.5">余剰資金プレビュー</p>
                  <p className={`font-mincho font-extrabold text-xl ${surplus < 0 ? 'text-shu' : 'text-ink'}`}>
                    {yen(surplus)}
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── アラート ── */}
        <section className="card">
          <h3 className="font-mincho font-bold text-ink tracking-widest mb-1">アラート</h3>
          <p className="text-[11px] text-ink-faint leading-relaxed mb-3">
            申請額が月次余剰の一定割合を超えると警告を表示します。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">警戒ライン</label>
              <div className="relative">
                <input
                  type="number" inputMode="numeric"
                  value={Math.round(form.alertThresholdWarning * 100)}
                  onChange={e => setForm(f => ({ ...f, alertThresholdWarning: parseFloat(e.target.value) / 100 || 0.3 }))}
                  className="field pr-9" min="1" max="99"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">%</span>
              </div>
            </div>
            <div>
              <label className="label">危険ライン</label>
              <div className="relative">
                <input
                  type="number" inputMode="numeric"
                  value={Math.round(form.alertThresholdDanger * 100)}
                  onChange={e => setForm(f => ({ ...f, alertThresholdDanger: parseFloat(e.target.value) / 100 || 0.5 }))}
                  className="field pr-9" min="1" max="100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">%</span>
              </div>
            </div>
          </div>
        </section>

        <button onClick={handleSave} className="btn-primary w-full">
          <span className="font-mincho tracking-[0.3em]">設定を保存する</span>
        </button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
