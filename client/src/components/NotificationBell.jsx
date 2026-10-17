import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } from '../store/apiSlice';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data, refetch } = useGetNotificationsQuery(undefined, { pollingInterval: 15000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'ALERT': return <XCircle className="w-4 h-4 text-rose-600" />;
      default: return <Info className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors focus:outline-none border border-transparent hover:border-red-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border-2 border-red-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fadeIn text-slate-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-red-100 bg-red-50/70">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black text-red-800">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-red-700 hover:text-red-900 font-bold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-red-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                No notifications to display.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`p-3.5 hover:bg-red-50/50 transition-colors cursor-pointer flex items-start space-x-3 ${
                    !n.is_read ? 'bg-red-50/30' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!n.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
