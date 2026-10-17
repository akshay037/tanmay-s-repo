import React from 'react';

export default function Badge({ status, text }) {
  const value = text || status;
  let bgClass = 'bg-slate-100 text-slate-700 border border-slate-200';

  if (['ACTIVE', 'COMPLETED', 'APPROVED', 'SUCCESS'].includes(status)) {
    bgClass = 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
  } else if (['INACTIVE', 'FAILED', 'REJECTED', 'ALERT', 'DEACTIVATED'].includes(status)) {
    bgClass = 'bg-red-50 text-red-800 border border-red-300 font-bold';
  } else if (['PENDING', 'WARNING', 'PARTIALLY_APPROVED'].includes(status)) {
    bgClass = 'bg-amber-50 text-amber-800 border border-amber-300 font-bold';
  } else if (['SUPER_ADMIN', 'ADMIN_ALLOCATION', 'SUPER_ADMIN_MINT'].includes(status)) {
    bgClass = 'bg-red-600 text-white font-black shadow-sm';
  } else if (['ADMIN', 'USER_ALLOCATION'].includes(status)) {
    bgClass = 'bg-rose-100 text-rose-900 border border-rose-300 font-bold';
  } else if (['USER'].includes(status)) {
    bgClass = 'bg-red-50 text-red-900 border border-red-200 font-bold';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>
      {value}
    </span>
  );
}
