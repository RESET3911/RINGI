import { ReactNode, useEffect } from 'react';

type Props = {
  title?: ReactNode;
  children: ReactNode;
  onClose: () => void;
};

/** 下からせり上がるボトムシート */
export default function Sheet({ title, children, onClose }: Props) {
  // 背面スクロール固定
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92dvh] flex flex-col bg-paper-card rounded-t-2xl sm:rounded-2xl shadow-float animate-sheet-up safe-bottom">
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-ink-line" />
        </div>
        {title && (
          <div className="px-5 pt-2 pb-3 border-b border-ink-line flex items-center justify-between gap-3">
            <div className="font-mincho font-bold text-ink text-base tracking-widest">{title}</div>
            <button onClick={onClose} aria-label="閉じる" className="text-ink-faint text-xl leading-none p-1 -mr-1">✕</button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
