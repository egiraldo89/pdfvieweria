'use client';

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
  if (!notification) {
    return null;
  }

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

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onStop(notification.id)}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Parar notificación
        </button>
      </div>
    </div>
  );
}
