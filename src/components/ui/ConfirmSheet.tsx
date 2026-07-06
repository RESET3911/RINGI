import { ReactNode } from 'react';
import Sheet from './Sheet';

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmSheet({
  title, message, confirmLabel = '確認', cancelLabel = 'やめる',
  isDanger = false, children, onConfirm, onCancel,
}: Props) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="text-ink-soft text-sm leading-relaxed mb-4">{message}</p>
      {children && <div className="mb-4">{children}</div>}
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 btn-secondary">{cancelLabel}</button>
        <button
          onClick={onConfirm}
          className={`flex-1 font-bold py-3 px-6 rounded-md tracking-wider min-h-[48px] transition-colors ${
            isDanger ? 'bg-ink text-paper active:bg-black' : 'btn-primary'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
