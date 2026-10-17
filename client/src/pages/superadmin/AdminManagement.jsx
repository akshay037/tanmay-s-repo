import React, { useState } from 'react';
import {
  useGetAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useToggleAdminStatusMutation,
  useResetAdminPasswordMutation,
  useMintPointsMutation
} from '../../store/apiSlice';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Badge from '../../components/Badge';
import ExportButtons from '../../components/ExportButtons';
import { Shield, Plus, Search, Edit2, Key, UserCheck, UserX, Coins, PlusCircle, AlertCircle } from 'lucide-react';

export default function AdminManagement({ onSelectAdminForAllocation }) {
  const { data: admins = [], isLoading, refetch } = useGetAdminsQuery();

  const [createAdmin, { isLoading: isCreating }] = useCreateAdminMutation();
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleAdminStatusMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetAdminPasswordMutation();
  const [mintPoints, { isLoading: isMinting }] = useMintPointsMutation();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isMintOpen, setIsMintOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, admin: null, newStatus: '' });

  // Form states
  const [createForm, setCreateForm] = useState({ username: '', password: '', name: '', email: '', phone: '', notes: '' });
  const [editForm, setEditForm] = useState({ id: null, name: '', email: '', phone: '', notes: '' });
  const [resetForm, setResetForm] = useState({ id: null, username: '', newPassword: '' });
  const [mintForm, setMintForm] = useState({ amount: '', reason: '' });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filtering
  const filteredAdmins = admins.filter(a => {
    const matchesSearch =
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await createAdmin(createForm).unwrap();
      setIsCreateOpen(false);
      setCreateForm({ username: '', password: '', name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to create Admin account.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await updateAdmin(editForm).unwrap();
      setIsEditOpen(false);
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to update Admin details.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await resetPassword(resetForm).unwrap();
      setIsResetOpen(false);
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to reset password.');
    }
  };

  const handleMintSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await mintPoints({ amount: parseInt(mintForm.amount, 10), reason: mintForm.reason }).unwrap();
      setIsMintOpen(false);
      setMintForm({ amount: '', reason: '' });
    } catch (err) {
      setFormError(err?.data?.error || 'Failed to mint points.');
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog.admin) return;
    try {
      await toggleStatus({ id: confirmDialog.admin.id, status: confirmDialog.newStatus }).unwrap();
      setConfirmDialog({ isOpen: false, admin: null, newStatus: '' });
    } catch (err) {
      alert(err?.data?.error || 'Status change failed.');
    }
  };

  const openEdit = (admin) => {
    setEditForm({
      id: admin.id,
      name: admin.name,
      email: admin.email || '',
      phone: admin.phone || '',
      notes: admin.notes || ''
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const openReset = (admin) => {
    setResetForm({
      id: admin.id,
      username: admin.username,
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
    { header: 'Available Points', key: 'balance' },
    { header: 'Total Received', key: 'totalReceived' },
    { header: 'Total Distributed', key: 'totalDistributed' },
    { header: 'User Count', key: 'userCount' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            <span>Admin Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Create, edit, reset passwords, and manage Admin accounts</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons data={filteredAdmins} filename="admins-list" columns={exportColumns} />
          <button
            onClick={() => { setFormError(''); setIsMintOpen(true); }}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Coins className="w-4 h-4" />
            <span>Mint Master Points</span>
          </button>

          <button
            onClick={() => { setFormError(''); setIsCreateOpen(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Admin Account</span>
          </button>
        </div>
      </div>

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
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
                <th className="py-3.5 px-4">Admin Profile</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Available Points</th>
                <th className="py-3.5 px-4 text-right">Total Received</th>
                <th className="py-3.5 px-4 text-right">Distributed to Users</th>
                <th className="py-3.5 px-4 text-center">Users</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">Loading Admin accounts...</td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No Admin accounts found.</td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          {admin.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{admin.name}</p>
                          <p className="text-[11px] text-slate-400">@{admin.username} {admin.email ? `• ${admin.email}` : ''}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={admin.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ${admin.balance.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ${admin.totalReceived.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-cyan-400">
                      ${admin.totalDistributed.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                        {admin.userCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onSelectAdminForAllocation && onSelectAdminForAllocation(admin)}
                          className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                          title="Allocate Points"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(admin)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openReset(admin)}
                          className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDialog({
                            isOpen: true,
                            admin,
                            newStatus: admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                          })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            admin.status === 'ACTIVE'
                              ? 'text-rose-400 hover:bg-rose-500/20'
                              : 'text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={admin.status === 'ACTIVE' ? 'Deactivate Admin' : 'Activate Admin'}
                        >
                          {admin.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* CREATE ADMIN MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Admin Account">
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
              placeholder="e.g. Frenchie2"
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
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="admin@domain.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+123456789"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
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
              {isCreating ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ADMIN MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Admin Details">
        {formError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {formError}
          </div>
        )}
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

      {/* MINT MASTER POINTS MODAL */}
      <Modal isOpen={isMintOpen} onClose={() => setIsMintOpen(false)} title="Mint Master Points into Super Admin Pool">
        {formError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{formError}</div>}
        <form onSubmit={handleMintSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mint Amount (Integer) *</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={mintForm.amount}
              onChange={(e) => setMintForm({ ...mintForm, amount: e.target.value })}
              placeholder="e.g. 100000"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Reference</label>
            <input
              type="text"
              value={mintForm.reason}
              onChange={(e) => setMintForm({ ...mintForm, reason: e.target.value })}
              placeholder="e.g. Master Supply Refill Q4"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsMintOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMinting}
              className="px-4 py-2 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold"
            >
              {isMinting ? 'Minting...' : 'Mint Points'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, admin: null, newStatus: '' })}
        onConfirm={handleConfirmToggle}
        title={confirmDialog.newStatus === 'INACTIVE' ? 'Deactivate Admin Account?' : 'Reactivate Admin Account?'}
        message={
          confirmDialog.newStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate Admin '@${confirmDialog.admin?.username}'?\n\nDeactivating an Admin prevents them from logging in. Their existing users and transaction ledger history will remain intact.`
            : `Are you sure you want to reactivate Admin '@${confirmDialog.admin?.username}'?`
        }
        confirmText={confirmDialog.newStatus === 'INACTIVE' ? 'Deactivate Admin' : 'Reactivate'}
        type={confirmDialog.newStatus === 'INACTIVE' ? 'danger' : 'info'}
        isLoading={isToggling}
      />
    </div>
  );
}
