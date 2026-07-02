'use client';

import { useRouter } from 'next/navigation';

interface NotificationPayload {
  id: number;
  title: string;
  body: string;
  word?: string;
  translation?: string;
}

interface PushNotificationPanelProps {
  notification: NotificationPayload | null;
  onStop: (id: number) => void;
  onClose: () => void;
}

export default function PushNotificationPanel({ notification, onStop, onClose }: PushNotificationPanelProps) {
  const router = useRouter();

  if (!notification) {
    return null;
  }

  const playPronunciation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !notification.word) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(notification.word);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
          <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
          {notification.word && (
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{notification.word}</span>
              {notification.translation ? ` · ${notification.translation}` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={playPronunciation}
          className="text-xl text-slate-400 hover:text-slate-600"
        >
          🔊
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/notified-words')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver palabras notificadas
          </button>
          <button
            type="button"
            onClick={() => onStop(notification.id)}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Parar notificación
          </button>
        </div>
      </div>
    </div>
  );
}
