'use client';

// ============================================================
// Notifications Page
// src/app/(staff)/dashboard/notifications/page.tsx
// ============================================================

import { useNotifications } from '@/shared/hooks/useRoomStatus';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  booking_created:  { icon: '📋', color: 'bg-blue-50 border-blue-200' },
  payment_received: { icon: '💰', color: 'bg-green-50 border-green-200' },
  check_in:         { icon: '🏨', color: 'bg-harar-50 border-harar-200' },
  check_out:        { icon: '🚪', color: 'bg-gray-50 border-gray-200' },
  no_show:          { icon: '⚠️', color: 'bg-orange-50 border-orange-200' },
  cancellation:     { icon: '❌', color: 'bg-red-50 border-red-200' },
};
const DEFAULT_CFG = { icon: '🔔', color: 'bg-gray-50 border-gray-200' };

export default function NotificationsPage() {
  const { notifications, unreadCount, acknowledge } = useNotifications();

  async function markAllRead() {
    for (const n of notifications.filter((n) => !n.is_read)) {
      await acknowledge(n.id);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="font-semibold text-gray-700">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">Alerts will appear here as activity happens</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const payload = n.payload as Record<string, string>;
            const cfg     = TYPE_CONFIG[n.type] ?? DEFAULT_CFG;
            const time    = new Date(n.created_at).toLocaleString('en-ET', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer
                  ${n.is_read ? 'bg-white border-gray-200' : `${cfg.color} shadow-sm`}`}
                onClick={() => { if (!n.is_read) acknowledge(n.id); }}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                  ${n.is_read ? 'bg-gray-100' : 'bg-white shadow-sm'}`}>
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {payload.guest_name ?? n.type.replace(/_/g, ' ')}
                      </p>
                      {payload.booking_reference && (
                        <p className="text-xs font-mono-data text-gray-500 mt-0.5">
                          {payload.booking_reference}
                        </p>
                      )}
                      {payload.message && (
                        <p className="text-xs text-gray-500 mt-1">{payload.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-brand-500" />
                      )}
                      <span className="text-xs text-gray-400">{time}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
