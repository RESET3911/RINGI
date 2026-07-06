import { useEffect } from 'react';

type Props = {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
};

export default function Toast({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-ink text-paper',
    error: 'bg-shu text-paper-card',
    info: 'bg-ai text-paper-card',
  };

  return (
    <div className={`fixed bottom-24 left-1/2 z-[60] animate-toast-in ${colors[type]} px-5 py-2.5 rounded-full shadow-float text-sm font-bold tracking-wide max-w-[85vw] text-center`}>
      {message}
    </div>
  );
}
