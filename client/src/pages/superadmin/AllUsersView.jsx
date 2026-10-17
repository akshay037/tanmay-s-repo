import React, { useState } from 'react';
import { useGetUsersQuery, useGetAdminsQuery, useTransferUserMutation } from '../../store/apiSlice';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import ExportButtons from '../../components/ExportButtons';
import { Users, Search, ArrowRightLeft, Shield, AlertCircle } from 'lucide-react';

export default function AllUsersView() {
  const { data: users = [], isLoading } = useGetUsersQuery();
  const { data: admins = [] } = useGetAdminsQuery();
  const [transferUser, { isLoading: isTransferring }] = useTransferUserMutation();

  const [search, setSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Transfer Modal State
  const [transferModal, setTransferModal] = useState({ isOpen: false, user: null, newAdminId: '', reason: '' });
  const [error, setError] = useState('');

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());

    const matchesAdmin = adminFilter === 'ALL' || String(u.adminId) === String(adminFilter);
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesAdmin && matchesStatus;
  });

  const openTransferModal = (user) => {
    setError('');
    setTransferModal({
      isOpen: true,
      user,
      newAdminId: '',
      reason: ''
    });
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!transferModal.newAdminId) {
      setError('Please select a destination Admin.');
      return;
    }

    try {
      await transferUser({
        userId: transferModal.user.id,
        newAdminId: transferModal.newAdminId,
        reason: transferModal.reason
      }).unwrap();

      setTransferModal({ isOpen: false, user: null, newAdminId: '', reason: '' });
    } catch (err) {
      setError(err?.data?.error || 'Failed to transfer user.');
    }
  };

  const exportColumns = [
    { header: 'ID', key: 'id' },
    { header: 'Username', key: 'username' },
    { header: 'Full Name', key: 'name' },
    { header: 'Owner Admin', key: 'adminUsername' },
    { header: 'Status', key: 'status' },
    { header: 'Current Balance', key: 'balance' },
    { header: 'Total Received', key: 'totalReceived' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <span>All Users (System-wide)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">View users under every Admin & execute controlled Admin transfers</p>
        </div>

        <ExportButtons data={filteredUsers} filename="all-users-report" columns={exportColumns} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user name or username..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Admin:</span>
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Admins</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>@{a.username} ({a.name})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">User Profile</th>
                <th className="py-3.5 px-4">Owning Admin</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Current Balance</th>
                <th className="py-3.5 px-4 text-right">Total Points Received</th>
                <th className="py-3.5 px-4 text-center">Transfer Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">Loading user database...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">No matching user accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                          {usr.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{usr.name}</p>
                          <p className="text-[11px] text-slate-400">@{usr.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium text-white">@{usr.adminUsername}</span>
                        <span className="text-[11px] text-slate-400">({usr.adminName})</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={usr.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ${usr.balance.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ${usr.totalReceived.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openTransferModal(usr)}
                        className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center space-x-1.5 mx-auto transition-colors"
                        title="Transfer User to another Admin"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER TRANSFER MODAL */}
      <Modal
        isOpen={transferModal.isOpen}
        onClose={() => setTransferModal({ isOpen: false, user: null, newAdminId: '', reason: '' })}
        title={`Transfer User @${transferModal.user?.username} to Another Admin`}
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1 text-xs">
            <p className="text-slate-400">Current Owning Admin: <span className="text-indigo-400 font-semibold">@{transferModal.user?.adminUsername}</span></p>
            <p className="text-slate-400">User's Existing Point Balance: <span className="text-amber-400 font-bold font-mono">${(transferModal.user?.balance || 0).toLocaleString()}</span></p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
              * Note: The user's point balance will remain with the user. Future point distributions will be funded from the new Admin's balance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select New Owning Admin *</label>
            <select
              required
              value={transferModal.newAdminId}
              onChange={(e) => setTransferModal({ ...transferModal, newAdminId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            >
              <option value="">-- Choose New Admin --</option>
              {admins
                .filter(a => a.id !== transferModal.user?.adminId && a.status === 'ACTIVE')
                .map(a => (
                  <option key={a.id} value={a.id}>@{a.username} ({a.name}) - Balance: ${a.balance.toLocaleString()}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Transfer</label>
            <textarea
              rows="3"
              value={transferModal.reason}
              onChange={(e) => setTransferModal({ ...transferModal, reason: e.target.value })}
              placeholder="e.g. Organizational re-assignment"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setTransferModal({ isOpen: false, user: null, newAdminId: '', reason: '' })}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTransferring}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              {isTransferring ? 'Transferring...' : 'Execute User Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
