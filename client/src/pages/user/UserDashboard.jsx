import React, { useState } from 'react';
import { useGetDashboardReportsQuery, useGetMeQuery } from '../../store/apiSlice';
import { Coins, Shield, History, ArrowDownRight, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Badge from '../../components/Badge';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import WithdrawModal from '../../components/WithdrawModal';

export default function UserDashboard({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const { data, isLoading, refetch } = useGetDashboardReportsQuery(undefined, { pollingInterval: 15000 });
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const recentTxns = data?.recentTxns || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">View your current point balance and point history</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
          title="Refresh Balance"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Balance Card */}
      <div className="bg-gradient-to-br from-indigo-900/60 via-slate-800 to-slate-900 border border-indigo-500/30 p-5 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Current Available Balance</span>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                ${(summary.balance || 0).toLocaleString()}
              </span>
              <span className="ml-2 text-lg font-bold text-amber-400">$</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Total Points Received: <span className="text-slate-200 font-mono font-semibold">${(summary.totalReceived || 0).toLocaleString()}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-105"
                title="Deposit Points"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                <span>Deposit</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-105"
                title="Withdraw Points"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 p-4 rounded-2xl sm:w-64 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Distributing Admin</p>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">@{summary.adminUsername}</p>
                <p className="text-[11px] text-slate-400">{summary.adminName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Point History */}
      <div className="bg-slate-800/80 border border-slate-700/70 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Recent Point Allocations Received</span>
          </h3>
          <button
            onClick={() => onNavigate('balance-history')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View All History &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-700/50">
          {recentTxns.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No point allocations received yet.</div>
          ) : (
            recentTxns.map((txn) => (
              <div key={txn.transactionId} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-700/30 transition-colors rounded-xl px-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Received from @{txn.fromUsername}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{txn.transactionId} • {new Date(txn.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <p className="text-sm font-bold text-emerald-400">+${txn.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{txn.description || 'Point Distribution'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <NoPointsNotificationModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        currentBalance={summary.balance || 0}
        intent="deposit"
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentBalance={summary.balance || 0}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />
    </div>
  );
}
