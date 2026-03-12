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
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${colors[type]} text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium max-w-xs text-center`}>
      {message}
    </div>
  );
}
