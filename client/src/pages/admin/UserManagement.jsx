import React, { useState } from 'react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation
} from '../../store/apiSlice';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Badge from '../../components/Badge';
import ExportButtons from '../../components/ExportButtons';
import { Users, Plus, Search, Edit2, Key, UserCheck, UserX, Coins, ArrowUpFromLine, AlertCircle } from 'lucide-react';

export default function UserManagement({ onSelectUserForDistribution }) {
  const { data: users = [], isLoading } = useGetUsersQuery();

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleUserStatusMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetUserPasswordMutation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null, newStatus: '' });

  // Forms
  const [createForm, setCreateForm] = useState({ username: '', password: '', name: '', email: '', phone: '', notes: '' });
  const [editForm, setEditForm] = useState({ id: null, name: '', email: '', phone: '', notes: '' });
  const [resetForm, setResetForm] = useState({ id: null, username: '', newPassword: '' });

  const [formError, setFormError] = useState('');

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await createUser(createForm).unwrap();
      setIsCreateOpen(false);
      setCreateForm({ username: '', password: '', name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to create User account.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await updateUser(editForm).unwrap();
      setIsEditOpen(false);
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to update User details.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await resetPassword(resetForm).unwrap();
      setIsResetOpen(false);
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to reset user password.');
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog.user) return;
    try {
      await toggleStatus({ id: confirmDialog.user.id, status: confirmDialog.newStatus }).unwrap();
      setConfirmDialog({ isOpen: false, user: null, newStatus: '' });
    } catch (err) {
      alert(err?.data?.error || 'Status update failed.');
    }
  };

  const openEdit = (user) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      notes: user.notes || ''
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const openReset = (user) => {
    setResetForm({
      id: user.id,
      username: user.username,
      newPassword: ''
    });
    setFormError('');
    setIsResetOpen(true);
  };

  const exportColumns = [
    { header: 'ID', key: 'id' },
    { header: 'Username', key: 'username' },
    { header: 'Full Name', key: 'name' },
    { header: 'Status', key: 'status' },
    { header: 'Current Balance', key: 'balance' },
    { header: 'Total Points Received', key: 'totalReceived' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>My Users</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Create and manage your assigned User accounts</p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={filteredUsers} filename="my-users-list" columns={exportColumns} />
          <button
            onClick={() => { setFormError(''); setIsCreateOpen(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">User Profile</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Current Balance</th>
                <th className="py-3.5 px-4 text-right">Total Received</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">Loading your users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">No User accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          {usr.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{usr.name}</p>
                          <p className="text-[11px] text-slate-400">@{usr.username} {usr.email ? `• ${usr.email}` : ''}</p>
                        </div>
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
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onSelectUserForDistribution && onSelectUserForDistribution(usr)}
                          className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                          title="Distribute / Deposit Points"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectUserForDistribution && onSelectUserForDistribution({ ...usr, action: 'WITHDRAW' })}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                          title="Withdraw / Deduct Points"
                        >
                          <ArrowUpFromLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(usr)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openReset(usr)}
                          className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDialog({
                            isOpen: true,
                            user: usr,
                            newStatus: usr.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                          })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            usr.status === 'ACTIVE'
                              ? 'text-rose-400 hover:bg-rose-500/20'
                              : 'text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={usr.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                        >
                          {usr.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New User Account">
        {formError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username *</label>
            <input
              type="text"
              required
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              placeholder="e.g. UserA"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password *</label>
            <input
              type="password"
              required
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Min 6 characters (Will force change on 1st login)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Alice Smith"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@domain.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+123456789"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User Details">
        {formError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{formError}</div>}
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title={`Reset Password for @${resetForm.username}`}>
        {formError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{formError}</div>}
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Temporary Password *</label>
            <input
              type="password"
              required
              value={resetForm.newPassword}
              onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
              placeholder="Enter new temp password"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isResetting}
              className="px-4 py-2 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold"
            >
              {isResetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, user: null, newStatus: '' })}
        onConfirm={handleConfirmToggle}
        title={confirmDialog.newStatus === 'INACTIVE' ? 'Deactivate User Account?' : 'Reactivate User Account?'}
        message={
          confirmDialog.newStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate User '@${confirmDialog.user?.username}'?\n\nDeactivating a User prevents them from logging in or receiving new points. Existing balances and transactions will remain safely recorded.`
            : `Are you sure you want to reactivate User '@${confirmDialog.user?.username}'?`
        }
        confirmText={confirmDialog.newStatus === 'INACTIVE' ? 'Deactivate User' : 'Reactivate'}
        type={confirmDialog.newStatus === 'INACTIVE' ? 'danger' : 'info'}
        isLoading={isToggling}
      />
    </div>
  );
}
