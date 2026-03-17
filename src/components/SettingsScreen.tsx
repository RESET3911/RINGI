import { useState } from 'react';
import { Settings } from '../types';
import { formatCurrency } from '../utils/alert';
import Toast from './Toast';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  settings: Settings;
  onSave: (settings: Settings) => void;
};

const ICON_OPTIONS = ['💑', '💍', '🏠', '💰', '🛒', '🎁', '🌸', '⭐', '🔥', '🎀'];

export default function SettingsScreen({ settings, onSave }: Props) {
  const [form, setForm] = useState<Settings>(JSON.parse(JSON.stringify(settings)));
  const [toast, setToast] = useState<string | null>(null);
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  const handleSave = () => {
    onSave(form);
    setToast('設定を保存しました');
  };

  const addFixedCost = () => {
    if (!newCostLabel.trim() || !newCostAmount) return;
    setForm(f => ({
      ...f,
      fixedCosts: [
        ...f.fixedCosts,
        { id: uuidv4(), label: newCostLabel.trim(), amount: parseFloat(newCostAmount) }
      ]
    }));
    setNewCostLabel('');
    setNewCostAmount('');
  };

  const removeFixedCost = (id: string) => {
    setForm(f => ({ ...f, fixedCosts: f.fixedCosts.filter(c => c.id !== id) }));
  };

  const totalFixed = form.fixedCosts.reduce((s, c) => s + c.amount, 0);
  const surplus = form.monthlyIncome + form.extraIncome - totalFixed;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">⚙️ 設定</h2>

      <div className="space-y-6">
        {/* Notification */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-1">🔔 プッシュ通知（ntfy）</h3>
          <p className="text-xs text-gray-500 mb-3">
            ntfyアプリで申請・決裁を自動通知します。2人で同じトピック名を設定してください。
          </p>
          <label className="label">トピック名（2人共通・秘密の名前）</label>
          <input
            type="text"
            value={form.ntfyTopic}
            onChange={e => setForm(f => ({ ...f, ntfyTopic: e.target.value }))}
            className="input-field mb-3"
            placeholder="例: ringi-yamada2025"
          />
          <button
            type="button"
            disabled={!form.ntfyTopic.trim()}
            onClick={async () => {
              const topic = form.ntfyTopic.trim();
              if (!topic) return;
              try {
                const res = await fetch(`https://ntfy.sh/${topic}`, {
                  method: 'POST',
                  headers: { 'Title': 'RINGIテスト通知', 'Content-Type': 'text/plain' },
                  body: 'テスト通知が届いたら設定完了です！',
                });
                if (res.ok) setToast('✅ テスト通知を送信しました');
                else setToast(`❌ 送信失敗: ${res.status}`);
              } catch (e) {
                setToast(`❌ エラー: ${String(e)}`);
              }
            }}
            className="btn-secondary w-full text-sm"
          >
            🔔 テスト通知を送る
          </button>
          <p className="text-xs text-gray-400 mt-2">
            ① iPhoneに「ntfy」アプリをインストール →
            ② アプリでトピック名を購読 →
            ③ ここに同じトピック名を入力 →
            ④「テスト通知を送る」で確認
          </p>
        </div>

        {/* App icon */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3">🎨 アプリアイコン</h3>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                onClick={() => setForm(f => ({ ...f, appIcon: icon }))}
                className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  form.appIcon === icon
                    ? 'bg-primary-100 ring-2 ring-primary-400'
                    : 'bg-gray-100 active:bg-gray-200'
                }`}
              >
                {icon}
              </button>
            ))}
            <input
              type="text"
              value={ICON_OPTIONS.includes(form.appIcon) ? '' : form.appIcon}
              onChange={e => {
                const val = [...e.target.value].find(() => true) ?? '💑';
                setForm(f => ({ ...f, appIcon: val }));
              }}
              placeholder="✏️"
              className="w-12 h-12 rounded-xl bg-gray-100 text-center text-xl border-none outline-none focus:ring-2 focus:ring-primary-400"
              maxLength={2}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">選択中: <span className="text-lg">{form.appIcon}</span></p>
        </div>

        {/* User Settings */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">👥 ユーザー設定</h3>
          {(['A', 'B'] as const).map(user => {
            const key = user === 'A' ? 'userA' : 'userB';
            const userData = form[key];
            return (
              <div key={user} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  {user === 'A' ? '🅰️' : '🅱️'} {user}さん
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="label">名前</label>
                    <input
                      type="text"
                      value={userData.name}
                      onChange={e => setForm(f => ({ ...f, [key]: { ...userData, name: e.target.value } }))}
                      className="input-field"
                      placeholder={`${user}さん`}
                    />
                  </div>
                  <div>
                    <label className="label">メールアドレス</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={e => setForm(f => ({ ...f, [key]: { ...userData, email: e.target.value } }))}
                      className="input-field"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Income Settings */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">💰 収支設定</h3>
          <div className="space-y-3">
            <div>
              <label className="label">月収合計（2人合算）</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <input
                  type="number"
                  value={form.monthlyIncome || ''}
                  onChange={e => setForm(f => ({ ...f, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="label">来月の臨時収入（任意）</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <input
                  type="number"
                  value={form.extraIncome || ''}
                  onChange={e => setForm(f => ({ ...f, extraIncome: parseFloat(e.target.value) || 0 }))}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">固定費リスト</label>
            {form.fixedCosts.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.fixedCosts.map(cost => (
                  <div key={cost.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm">{cost.label}</span>
                    <span className="text-sm font-medium text-gray-700">{formatCurrency(cost.amount)}</span>
                    <button
                      onClick={() => removeFixedCost(cost.id)}
                      className="text-red-400 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold text-gray-700 px-3">
                  <span>合計</span>
                  <span>{formatCurrency(totalFixed)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCostLabel}
                onChange={e => setNewCostLabel(e.target.value)}
                placeholder="例: 家賃"
                className="input-field flex-1"
              />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  value={newCostAmount}
                  onChange={e => setNewCostAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="input-field pl-7 w-full"
                />
              </div>
              <button
                type="button"
                onClick={addFixedCost}
                disabled={!newCostLabel.trim() || !newCostAmount}
                className="btn-primary px-4 py-2 rounded-xl text-sm"
              >
                追加
              </button>
            </div>
          </div>

          {(form.monthlyIncome > 0 || totalFixed > 0) && (
            <div className="mt-4 bg-primary-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">余剰資金プレビュー</p>
              <p className={`text-xl font-bold ${surplus < 0 ? 'text-red-500' : 'text-primary-500'}`}>
                {formatCurrency(surplus)}
              </p>
            </div>
          )}
        </div>

        {/* Alert Settings */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-2">🔔 アラート設定</h3>
          <p className="text-xs text-gray-500 mb-4">
            余剰資金 = 月収合計 + 臨時収入 − 固定費合計<br />
            申請割合 = 申請金額 ÷ 余剰資金 × 100
          </p>
          <div className="space-y-3">
            <div>
              <label className="label">🟡 警戒ライン（デフォルト: 30%）</label>
              <div className="relative">
                <input
                  type="number"
                  value={Math.round(form.alertThresholdWarning * 100)}
                  onChange={e => setForm(f => ({ ...f, alertThresholdWarning: parseFloat(e.target.value) / 100 || 0.3 }))}
                  className="input-field pr-8"
                  min="1"
                  max="99"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="label">🔴 危険ライン（デフォルト: 50%）</label>
              <div className="relative">
                <input
                  type="number"
                  value={Math.round(form.alertThresholdDanger * 100)}
                  onChange={e => setForm(f => ({ ...f, alertThresholdDanger: parseFloat(e.target.value) / 100 || 0.5 }))}
                  className="input-field pr-8"
                  min="1"
                  max="100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full">
          設定を保存する
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
