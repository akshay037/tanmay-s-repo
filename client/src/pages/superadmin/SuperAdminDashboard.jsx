import React, { useState } from 'react';
import { useGetDashboardReportsQuery, useMintPointsMutation } from '../../store/apiSlice';
import Modal from '../../components/Modal';
import {
  Shield,
  Users,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  GitPullRequest,
  Layers,
  RefreshCw,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

export default function SuperAdminDashboard({ onNavigate }) {
  const { data, isLoading, refetch } = useGetDashboardReportsQuery(undefined, { pollingInterval: 15000 });
  const [mintPoints, { isLoading: isMinting }] = useMintPointsMutation();

  const [isMintOpen, setIsMintOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintReason, setMintReason] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');
  const [mintError, setMintError] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const adminBreakdown = data?.adminPointBreakdown || [];
  const dailyTxns = data?.dailyTxns || [];

  const handleMintSubmit = async (e) => {
    e.preventDefault();
    setMintError('');
    setMintSuccess('');

    const parsed = parseInt(mintAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setMintError('Mint amount must be a positive integer.');
      return;
    }

    try {
      const res = await mintPoints({
        amount: parsed,
        reason: mintReason || 'Super Admin Dashboard Pool Refill'
      }).unwrap();

      setMintSuccess(res.message || `Successfully added ${parsed.toLocaleString()} points to Super Admin pool.`);
      setMintAmount('');
      setMintReason('');
      refetch();
    } catch (err) {
      setMintError(err?.data?.error || 'Failed to mint points.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">System-wide hierarchy oversight & master point ledger</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setMintSuccess('');
              setMintError('');
              setIsMintOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>+ Add Points</span>
          </button>
          <button
            onClick={() => onNavigate('admins')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
          >
            + Create Admin
          </button>
          <button
            onClick={() => onNavigate('point-allocation')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            Allocate Points
          </button>
        </div>
      </div>

      {mintSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{mintSuccess}</span>
        </div>
      )}

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Admins */}
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Admins</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">{summary.totalAdmins || 0}</span>
            <span className="ml-2 text-xs text-emerald-400">({summary.activeAdmins || 0} Active)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{summary.inactiveAdmins || 0} deactivated</p>
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
          <p className="text-[11px] text-slate-400 mt-1">Across all Admin accounts</p>
        </div>

        {/* Master Pool Balance with Infinite Indicator */}
        <div className="bg-slate-800/80 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Master Pool Balance</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Infinite
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-amber-400 font-mono">∞</span>
              <span className="ml-2 text-xs text-slate-400 font-mono">
                (${(summary.superAdminBalance || 0).toLocaleString()})
              </span>
            </div>
            <button
              onClick={() => {
                setMintSuccess('');
                setMintError('');
                setIsMintOpen(true);
              }}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              + Add
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unlimited Super Admin Supply</p>
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
          <p className="text-[11px] text-indigo-400 mt-1 font-medium">Click to review requests &rarr;</p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>Total Points Allocated to Admins</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-2">
            ${(summary.totalAllocatedToAdmins || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ArrowDownRight className="w-4 h-4 text-cyan-400" />
            <span>Total Points Distributed to Users</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-2">
            ${(summary.totalDistributedToUsers || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Admin Unallocated Balance</span>
          </div>
          <p className="text-xl font-bold text-white font-mono mt-2">
            ${(summary.totalAdminRemainingBalance || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Points Allocation & Distribution per Admin</h3>
          {adminBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">No admin point records yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="username" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="totalReceived" name="Allocated from Super Admin" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalDistributed" name="Distributed to Users" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Transaction Trends (Last 14 Days)</h3>
          {dailyTxns.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">No recent transactions recorded.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTxns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="volume" name="Points Transferred" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ADD / MINT POINTS MODAL */}
      <Modal
        isOpen={isMintOpen}
        onClose={() => setIsMintOpen(false)}
        title="Add Points into Super Admin Master Pool"
      >
        <form onSubmit={handleMintSubmit} className="space-y-4">
          {mintError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{mintError}</span>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-2.5">
            <Coins className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              Mint new points into your Super Admin master pool. Super Admin has infinite point capacity.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mint Amount (Integer) *</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {[50000, 100000, 500000, 1000000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setMintAmount(String(preset))}
                  className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Description (Optional)</label>
            <input
              type="text"
              value={mintReason}
              onChange={(e) => setMintReason(e.target.value)}
              placeholder="e.g. Super Admin Master Refill"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setIsMintOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMinting}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {isMinting ? 'Minting...' : 'Add Points'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
