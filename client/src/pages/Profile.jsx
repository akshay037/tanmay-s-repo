import React, { useState } from 'react';
import { useGetMeQuery, useChangePasswordMutation } from '../store/apiSlice';
import Badge from '../components/Badge';
import NoPointsNotificationModal from '../components/NoPointsNotificationModal';
import { UserCheck, KeyRound, Shield, Coins, Calendar, Clock, CheckCircle2, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { buildTelegramWithdrawUrl } from '../utils/telegram';

export default function Profile() {
  const { data: me, isLoading } = useGetMeQuery();
  const [changePassword, { isLoading: isUpdating }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  if (isLoading || !me) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await changePassword({ currentPassword, newPassword }).unwrap();
      setSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.data?.error || 'Failed to change password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-red-800 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-red-600" />
          <span>My Account Profile</span>
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">Manage your profile info & security settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white border-2 border-red-200 p-6 rounded-3xl shadow-xl space-y-4 text-slate-800">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center mx-auto text-2xl font-black text-white shadow-xl shadow-red-500/20 mb-3 border-2 border-white">
              {me.username.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-black text-slate-900">{me.name}</h3>
            <p className="text-xs text-red-700 font-mono font-bold mt-0.5">@{me.username}</p>
            <div className="mt-2">
              <Badge status={me.role} text={me.role.replace('_', ' ')} />
            </div>
          </div>

          <div className="pt-4 border-t-2 border-red-100 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-red-600" /> Point Balance:</span>
              <span className="font-black text-red-700 font-mono text-sm">${(me.pointAccount?.balance || 0).toLocaleString()}</span>
            </div>

            {me.role === 'USER' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase rounded-xl shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-[1.02]"
                  title="Deposit Points"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                  <span>Deposit</span>
                </button>

                <a
                  href={buildTelegramWithdrawUrl({ meData: me, currentBalance: me.pointAccount?.balance })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase rounded-xl shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-[1.02]"
                  title="Withdraw Points"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
                  <span>Withdraw</span>
                </a>
              </div>
            )}

            {me.owningAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-red-600" /> Owning Admin:</span>
                <span className="font-bold text-slate-800">@{me.owningAdmin.username}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-600" /> Created:</span>
              <span className="text-slate-700 font-bold">{new Date(me.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-red-600" /> Last Login:</span>
              <span className="text-slate-700 font-bold">{me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : 'Just now'}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white border-2 border-red-200 p-6 rounded-3xl shadow-xl space-y-5 text-slate-800">
          <h3 className="text-base font-black text-red-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-red-600" />
            <span>Change Security Password</span>
          </h3>

          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-700 text-xs rounded-xl flex items-center space-x-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="py-3 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
      <NoPointsNotificationModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        currentBalance={me?.pointAccount?.balance || 0}
        intent="deposit"
      />
    </div>
  );
}
