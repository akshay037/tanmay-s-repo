import React, { useState } from 'react';
import Modal from './Modal';
import { useChangePasswordMutation } from '../store/apiSlice';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { updateUser } from '../store/authSlice';

export default function ForcePasswordChangeModal({ isOpen }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
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
      const res = await changePassword({ newPassword }).unwrap();
      setSuccess(res.message || 'Password changed successfully!');
      dispatch(updateUser({ mustChangePassword: false }));
    } catch (err) {
      setError(err?.data?.error || 'Failed to change password. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Password Change Required" maxWidth="max-w-md">
      <div className="space-y-4 font-sans text-slate-800">
        <div className="flex items-start space-x-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <p>
            For security reasons, you are required to change your temporary password before accessing the system.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-9 pr-3 py-2.5 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-3 py-2.5 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>Update Password & Continue</span>
          </button>
        </form>
      </div>
    </Modal>
  );
}
