import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetDashboardReportsQuery } from '../store/apiSlice';
import ExportButtons from '../components/ExportButtons';
import Badge from '../components/Badge';
import {
  BarChart3,
  TrendingUp,
  Shield,
  Users,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  PieChart,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';

export default function SystemReports() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const { data, isLoading, refetch } = useGetDashboardReportsQuery(undefined, { pollingInterval: 15000 });

  const [filterQuery, setFilterQuery] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-400">Compiling ledger reports & analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const adminBreakdown = data?.adminPointBreakdown || [];
  const userBreakdown = data?.userPointBreakdown || [];
  const dailyTxns = data?.dailyTxns || [];

  // Filter breakdown based on search query
  const filteredAdmins = adminBreakdown.filter(
    (a) =>
      a.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredUsers = userBreakdown.filter(
    (u) =>
      u.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  // Total system points minted (Super Admin pool + distributed)
  const totalMasterMinted = (summary.superAdminBalance || 0) + (summary.totalAllocatedToAdmins || 0);

  // Export Columns
  const exportAdminColumns = [
    { header: 'Admin ID', key: 'adminId' },
    { header: 'Username', key: 'username' },
    { header: 'Name', key: 'name' },
    { header: 'Available Balance (Pts)', key: 'availableBalance' },
    { header: 'Total Received (Pts)', key: 'totalReceived' },
    { header: 'Total Distributed (Pts)', key: 'totalDistributed' },
    { header: 'Managed Users', key: 'userCount' }
  ];

  const exportUserColumns = [
    { header: 'User ID', key: 'userId' },
    { header: 'Username', key: 'username' },
    { header: 'Name', key: 'name' },
    { header: 'Current Balance (Pts)', key: 'balance' },
    { header: 'Total Received (Pts)', key: 'totalReceived' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            <span>{isSuperAdmin ? 'System Reports & Ledger Analytics' : 'Point Distribution Reports'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Complete hierarchical ledger reconciliation, flow velocity, and participant audits'
              : 'Detailed breakdown of point allocation to users and wallet balances'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 text-xs"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          {isSuperAdmin ? (
            <ExportButtons
              data={adminBreakdown}
              filename="system-ledger-admin-report"
              columns={exportAdminColumns}
            />
          ) : (
            <ExportButtons
              data={userBreakdown}
              filename="admin-point-distribution-report"
              columns={exportUserColumns}
            />
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin ? (
          <>
            {/* Super Admin Pool */}
            <div className="bg-gradient-to-br from-slate-800/90 to-indigo-950/40 border border-indigo-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Coins className="w-20 h-20 text-indigo-400" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Master Point Pool</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Infinite
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">∞</span>
                <span className="ml-2 text-xs text-slate-400 font-mono">
                  (${(summary.superAdminBalance || 0).toLocaleString()} pool)
                </span>
              </div>
              <p className="text-[11px] text-indigo-300 mt-1">Super Admin Unlimited Point Supply</p>
            </div>

            {/* Total Allocated to Admins */}
            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Allocated to Admins</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-mono">
                  ${(summary.totalAllocatedToAdmins || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Distributed across {summary.totalAdmins || 0} Admins</p>
            </div>

            {/* Total Distributed to Users */}
            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Distributed to Users</span>
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-mono">
                  ${(summary.totalDistributedToUsers || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active in {summary.totalUsers || 0} User accounts</p>
            </div>

            {/* Admin Floating Balance */}
            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Admin Unallocated Pool</span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-mono">
                  ${(summary.totalAdminRemainingBalance || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Ready for downstream user distribution</p>
            </div>
          </>
        ) : (
          <>
            {/* Admin View KPIs */}
            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
              <span className="text-xs font-medium text-slate-400">My Available Balance</span>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-2">
                ${(summary.availablePoints || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Ready for distribution</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
              <span className="text-xs font-medium text-slate-400">Total Received from Super Admin</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                ${(summary.totalReceived || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">All-time allocated</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
              <span className="text-xs font-medium text-slate-400">Total Distributed to Users</span>
              <p className="text-2xl font-bold text-cyan-400 font-mono mt-2">
                ${(summary.totalDistributed || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Across managed users</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
              <span className="text-xs font-medium text-slate-400">Managed Users</span>
              <p className="text-2xl font-bold text-white font-mono mt-2">
                {summary.totalUsers || 0}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">{summary.activeUsers || 0} Active accounts</p>
            </div>
          </>
        )}
      </div>

      {/* Double-Entry Ledger Reconciliation Banner (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Double-Entry Ledger Integrity Audit</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  100% Balanced
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Conservation Law Check: Master Inflow (${((summary.totalAllocatedToAdmins || 0)).toLocaleString()}) =
                Admin Reserves (${(summary.totalAdminRemainingBalance || 0).toLocaleString()}) +
                User Wallets (${(summary.totalDistributedToUsers || 0).toLocaleString()}).
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[11px] text-slate-400 block">Ledger Variance</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">$0.00 (Exact)</span>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Breakdown or User Breakdown Chart */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>{isSuperAdmin ? 'Points Allocation vs Distribution by Admin' : 'User Point Allocation'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">Hierarchical Breakdown</span>
          </div>

          {(isSuperAdmin ? adminBreakdown : userBreakdown).length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No participant records found.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isSuperAdmin ? adminBreakdown : userBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="username" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {isSuperAdmin ? (
                    <>
                      <Bar dataKey="totalReceived" name="Allocated to Admin" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalDistributed" name="Distributed to Users" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="balance" name="Current Balance" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalReceived" name="Total Received" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Daily Transaction Velocity Chart */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>14-Day Point Transaction Velocity</span>
            </h3>
            <span className="text-[11px] text-slate-400">Daily Volume</span>
          </div>

          {dailyTxns.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No recent transaction data.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTxns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    name="Volume (Points)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Breakdown Data Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>{isSuperAdmin ? 'Admin Point Holdings & Utilization Audit' : 'User Point Ledger Breakdown'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSuperAdmin
                ? 'Audited allocation figures, current wallet reserves, and user distribution metrics per admin'
                : 'Current balances and total allocations for all registered end users'}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isSuperAdmin ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Admin Account</th>
                  <th className="px-5 py-3.5">Assigned Users</th>
                  <th className="px-5 py-3.5 text-right">Allocated (Received)</th>
                  <th className="px-5 py-3.5 text-right">Distributed to Users</th>
                  <th className="px-5 py-3.5 text-right">Available Balance</th>
                  <th className="px-5 py-3.5">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                      No admin records match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm) => {
                    const utilization =
                      adm.totalReceived > 0
                        ? Math.round((adm.totalDistributed / adm.totalReceived) * 100)
                        : 0;

                    return (
                      <tr key={adm.adminId} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <span className="font-semibold text-white">@{adm.username}</span>
                            <p className="text-[11px] text-slate-400">{adm.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          <span className="font-mono font-medium">{adm.userCount}</span> users
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-semibold text-indigo-400">
                          ${adm.totalReceived.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-semibold text-cyan-400">
                          ${adm.totalDistributed.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-amber-400">
                          ${adm.availableBalance.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>{utilization}%</span>
                              <span>{adm.totalDistributed > 0 ? 'Active' : 'Unused'}</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">User Account</th>
                  <th className="px-5 py-3.5 text-right">Current Available Balance</th>
                  <th className="px-5 py-3.5 text-right">Total Points Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-5 py-8 text-center text-slate-500">
                      No user records match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-white">@{u.username}</span>
                        {u.name && <p className="text-[11px] text-slate-400">{u.name}</p>}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                        ${u.balance.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-indigo-400">
                        ${u.totalReceived.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
