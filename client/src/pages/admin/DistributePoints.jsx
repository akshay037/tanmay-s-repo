import React, { useState, useEffect } from 'react';
import {
  useGetUsersQuery,
  useDistributePointsToUserMutation,
  useWithdrawPointsFromUserMutation,
  useGetMeQuery
} from '../../store/apiSlice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Coins, Send, ArrowDownToLine, ArrowUpFromLine, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DistributePoints({ selectedUser = null }) {
  const { data: users = [], refetch: refetchUsers } = useGetUsersQuery();
  const { data: meData, refetch: refetchMe } = useGetMeQuery();
  const [distributePoints, { isLoading: isDistributing }] = useDistributePointsToUserMutation();
  const [withdrawPoints, { isLoading: isWithdrawing }] = useWithdrawPointsFromUserMutation();

  const [actionType, setActionType] = useState('DEPOSIT'); // 'DEPOSIT' | 'WITHDRAW'
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
      if (selectedUser.action === 'WITHDRAW') {
        setActionType('WITHDRAW');
      }
    }
  }, [selectedUser]);

  const targetUser = users.find(u => String(u.id) === String(userId));
  const availableBalance = meData?.pointAccount?.balance || 0;
  const targetUserBalance = targetUser?.balance || 0;
  const isLoading = isDistributing || isWithdrawing;

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

    if (actionType === 'DEPOSIT') {
      if (numAmount > availableBalance) {
        setError(`Insufficient point balance. You have only $${availableBalance.toLocaleString()} points available to distribute.`);
        return;
      }
    } else {
      if (numAmount > targetUserBalance) {
        setError(`Insufficient user balance. User @${targetUser?.username} has only $${targetUserBalance.toLocaleString()} points available to withdraw.`);
        return;
      }
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    setError('');
    setSuccess('');

    try {
      const idempotencyKey = `${actionType === 'DEPOSIT' ? 'DIST' : 'WITH'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let res;
      if (actionType === 'DEPOSIT') {
        res = await distributePoints({
          userId: parseInt(userId, 10),
          amount: parseInt(amount, 10),
          reference: reference || 'ADMIN_DISTRIBUTION',
          description: description || `Points distributed by Admin`,
          idempotencyKey
        }).unwrap();
      } else {
        res = await withdrawPoints({
          userId: parseInt(userId, 10),
          amount: parseInt(amount, 10),
          reference: reference || 'ADMIN_USER_WITHDRAWAL',
          description: description || `Points withdrawal processed by Admin`,
          idempotencyKey
        }).unwrap();
      }

      setSuccess(res.message);
      setAmount('');
      setReference('');
      setDescription('');
      setIsConfirmOpen(false);
      refetchUsers();
      refetchMe();
    } catch (err) {
      setError(err?.data?.error || `${actionType === 'DEPOSIT' ? 'Point distribution' : 'Point withdrawal'} failed.`);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {actionType === 'DEPOSIT' ? (
            <Send className="w-6 h-6 text-indigo-400" />
          ) : (
            <ArrowUpFromLine className="w-6 h-6 text-rose-400" />
          )}
          <span>{actionType === 'DEPOSIT' ? 'Distribute / Deposit Points to User' : 'Withdraw / Deduct Points from User'}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Admin &bull; User Point Allocation and Cashout Payout Ledger</p>
      </div>

      {/* Action Type Toggle */}
      <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/70">
        <button
          type="button"
          onClick={() => {
            setActionType('DEPOSIT');
            setError('');
          }}
          className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            actionType === 'DEPOSIT'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
          <span>Deposit (Add Points to User)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActionType('WITHDRAW');
            setError('');
          }}
          className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            actionType === 'WITHDRAW'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4 text-rose-300" />
          <span>Withdraw (Deduct Points from User)</span>
        </button>
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
        {/* Balance Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center space-x-3 p-4 bg-slate-900 border border-slate-700/80 rounded-xl">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Your Admin Balance</p>
              <p className="text-xl font-bold font-mono text-amber-400">${availableBalance.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-slate-900 border border-slate-700/80 rounded-xl">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Selected User Balance</p>
              <p className="text-xl font-bold font-mono text-cyan-400">
                {targetUser ? `$${targetUserBalance.toLocaleString()}` : 'Select user'}
              </p>
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
                  @{u.username} ({u.name}) - Balance: ${u.balance.toLocaleString()} {u.status !== 'ACTIVE' ? '(INACTIVE)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Points to {actionType === 'DEPOSIT' ? 'Distribute' : 'Withdraw'} (Positive Integer) *
            </label>
            <input
              type="number"
              min="1"
              max={actionType === 'DEPOSIT' ? availableBalance : targetUserBalance}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={actionType === 'DEPOSIT' ? `Max: ${availableBalance}` : `Max: ${targetUserBalance}`}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reference Code (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={actionType === 'DEPOSIT' ? 'e.g. DEPOSIT_PAYMENT_TXN' : 'e.g. TELEGRAM_CASHOUT_REQ'}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description (Optional)</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={actionType === 'DEPOSIT' ? 'Optional deposit notes...' : 'Optional cashout notes (e.g. Paid via UPI/Crypto/Cash)...'}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 font-semibold text-sm rounded-xl transition-all shadow-lg ${
              actionType === 'DEPOSIT'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
          >
            {actionType === 'DEPOSIT' ? 'Review & Distribute Points' : 'Review & Process Withdrawal'}
          </button>
        </form>
      </div>

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        title={actionType === 'DEPOSIT' ? 'Confirm Point Distribution' : 'Confirm Point Withdrawal'}
        message={
          targetUser
            ? actionType === 'DEPOSIT'
              ? `Are you sure you want to distribute $${parseInt(amount || 0, 10).toLocaleString()} to User '@${targetUser.username}' (${targetUser.name})?\n\nYour available balance will decrease from $${availableBalance.toLocaleString()} to $${(availableBalance - parseInt(amount || 0, 10)).toLocaleString()}.`
              : `Are you sure you want to deduct $${parseInt(amount || 0, 10).toLocaleString()} from User '@${targetUser.username}' (${targetUser.name}) for withdrawal payout?\n\nUser balance will decrease from $${targetUserBalance.toLocaleString()} to $${(targetUserBalance - parseInt(amount || 0, 10)).toLocaleString()}, and points will return to your balance.`
            : ''
        }
        confirmText={actionType === 'DEPOSIT' ? 'Confirm Distribution' : 'Confirm Withdrawal'}
        type={actionType === 'DEPOSIT' ? 'info' : 'danger'}
        isLoading={isLoading}
      />
    </div>
  );
}
