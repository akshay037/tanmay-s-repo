import React from 'react';
import { useGetDashboardReportsQuery } from '../../store/apiSlice';
import { Users, Coins, Send, GitPullRequest, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

export default function AdminDashboard({ onNavigate }) {
  const { data, isLoading, refetch } = useGetDashboardReportsQuery(undefined, { pollingInterval: 15000 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const userBreakdown = data?.userPointBreakdown || [];
  const dailyTxns = data?.dailyTxns || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Manage assigned Users & distribute your available point balance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('my-users')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
          >
            + Create User
          </button>
          <button
            onClick={() => onNavigate('distribute-points')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            Distribute Points
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Available Point Balance</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {(summary.availablePoints || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1">pts</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for User distribution</p>
        </div>

        {/* Total Users */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Users</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">{summary.totalUsers || 0}</span>
            <span className="ml-2 text-xs text-purple-400">({summary.activeUsers || 0} Active)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Under your management</p>
        </div>

        {/* Total Received */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Received from Super Admin</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {(summary.totalReceived || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lifetime allocated</p>
        </div>

        {/* Pending Requests */}
        <div
          onClick={() => onNavigate('point-requests')}
          className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Point Requests</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <GitPullRequest className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-cyan-400 font-mono">
              {summary.pendingRequestsCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1 font-medium">Request more points &rarr;</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Balance Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">User Balance Breakdown</h3>
          {userBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">No users under your management yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="username" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="balance" name="Current User Balance" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalReceived" name="Total Received" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Distribution Trend */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Your Point Distribution Trend (Last 14 Days)</h3>
          {dailyTxns.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">No recent point distributions.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTxns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }} />
                  <Line type="monotone" dataKey="volume" name="Points Distributed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
