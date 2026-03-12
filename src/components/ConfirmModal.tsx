import { ReactNode } from 'react';

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

export default function ConfirmModal({
  title, message, confirmLabel = '確認', cancelLabel = 'キャンセル',
  isDanger = false, children, onConfirm, onCancel
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{message}</p>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
