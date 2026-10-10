import type { FC } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
}

export const Toast: FC<ToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-area" id="toastContainer">
      {toasts.map(t => (
        <div key={t.id} className="toast-msg show">
          {t.text}
        </div>
      ))}
    </div>
  );
};
