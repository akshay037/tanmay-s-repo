import React, { useState, useEffect } from 'react';
import { useGetUsersQuery, useDistributePointsToUserMutation, useGetMeQuery } from '../../store/apiSlice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Coins, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DistributePoints({ selectedUser = null }) {
  const { data: users = [], refetch: refetchUsers } = useGetUsersQuery();
  const { data: meData, refetch: refetchMe } = useGetMeQuery();
  const [distributePoints, { isLoading }] = useDistributePointsToUserMutation();

  const [userId, setUserId] = useState(selectedUser ? String(selectedUser.id) : '');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      setUserId(String(selectedUser.id));
    }
  }, [selectedUser]);

  const targetUser = users.find(u => String(u.id) === String(userId));
  const availableBalance = meData?.pointAccount?.balance || 0;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Please select a target User.');
      return;
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Point amount must be a positive integer.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Insufficient point balance. You have only ${availableBalance.toLocaleString()} points available.`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmDistribute = async () => {
    setError('');
    setSuccess('');

    try {
      const idempotencyKey = `DIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await distributePoints({
        userId: parseInt(userId, 10),
        amount: parseInt(amount, 10),
        reference: reference || 'ADMIN_DISTRIBUTION',
        description: description || `Points distributed by Admin`,
        idempotencyKey
      }).unwrap();

      setSuccess(res.message);
      setAmount('');
      setReference('');
      setDescription('');
      setIsConfirmOpen(false);
      refetchUsers();
      refetchMe();
    } catch (err) {
      setError(err?.data?.error || 'Point distribution failed.');
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Send className="w-6 h-6 text-indigo-400" />
          <span>Distribute Points to User</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Admin &rarr; User Point Distribution Ledger System</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-slate-800/80 border border-slate-700/70 p-6 rounded-2xl shadow-xl space-y-6">
        {/* Balance Banner */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700/80 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Your Available Balance</p>
              <p className="text-xl font-bold font-mono text-amber-400">${availableBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select User Account *</label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Select Target User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.status !== 'ACTIVE'}>
                  @{u.username} ({u.name}) - Current Balance: ${u.balance.toLocaleString()} {u.status !== 'ACTIVE' ? '(INACTIVE)' : ''}
                </option>
              ))}
            </select>
          </div>

          {targetUser && (
            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Target User Current Balance:</span>
              <span className="font-bold text-amber-400 font-mono">${targetUser.balance.toLocaleString()}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Points to Distribute (Integer) *</label>
            <input
              type="number"
              min="1"
              max={availableBalance}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 4000"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reference Code (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. MONTHLY_USER_REWARD"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description (Optional)</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional distribution notes..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            Review & Distribute Points
          </button>
        </form>
      </div>

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDistribute}
        title="Confirm Point Distribution"
        message={
          targetUser
            ? `Are you sure you want to distribute $${parseInt(amount || 0, 10).toLocaleString()} to User '@${targetUser.username}' (${targetUser.name})?\n\nYour available balance will decrease from $${availableBalance.toLocaleString()} to $${(availableBalance - parseInt(amount || 0, 10)).toLocaleString()}.`
            : ''
        }
        confirmText="Confirm Distribution"
        type="info"
        isLoading={isLoading}
      />
    </div>
  );
}
