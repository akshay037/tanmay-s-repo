import React, { useState, useEffect } from 'react';
import { useGetAdminsQuery, useAllocatePointsToAdminMutation, useMintPointsMutation, useGetMeQuery } from '../../store/apiSlice';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { Coins, Send, Shield, AlertCircle, CheckCircle2, Sparkles, Plus, RefreshCw } from 'lucide-react';

export default function SuperAdminPointAllocation({ selectedAdmin = null }) {
  const { data: admins = [], refetch } = useGetAdminsQuery();
  const { data: meData, refetch: refetchMe } = useGetMeQuery();
  const [allocatePoints, { isLoading: isAllocating }] = useAllocatePointsToAdminMutation();
  const [mintPoints, { isLoading: isMinting }] = useMintPointsMutation();

  const [adminId, setAdminId] = useState(selectedAdmin ? String(selectedAdmin.id) : '');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Self Mint Modal state
  const [isSelfMintOpen, setIsSelfMintOpen] = useState(false);
  const [selfMintAmount, setSelfMintAmount] = useState('');
  const [selfMintReason, setSelfMintReason] = useState('');

  useEffect(() => {
    if (selectedAdmin) {
      setAdminId(String(selectedAdmin.id));
    }
  }, [selectedAdmin]);

  const isSelfSelected = adminId === 'SELF';
  const targetAdmin = admins.find((a) => String(a.id) === String(adminId));
  const masterBalance = meData?.pointAccount?.balance || 0;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!adminId) {
      setError('Please select a target account or Super Admin Master Pool.');
      return;
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Point amount must be a positive integer.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmAllocate = async () => {
    setError('');
    setSuccess('');

    try {
      const numAmount = parseInt(amount, 10);

      if (isSelfSelected) {
        // Minting to self
        const res = await mintPoints({
          amount: numAmount,
          reason: description || reference || 'Super Admin Self Pool Mint'
        }).unwrap();

        setSuccess(res.message || `Successfully added ${numAmount.toLocaleString()} points to Master Pool.`);
      } else {
        // Allocating to an Admin
        const idempotencyKey = `SA-ALLOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const res = await allocatePoints({
          adminId: parseInt(adminId, 10),
          amount: numAmount,
          reference: reference || 'DIRECT_ALLOCATION',
          description: description || `Point allocation by Super Admin`,
          idempotencyKey
        }).unwrap();

        setSuccess(res.message);
      }

      setAmount('');
      setReference('');
      setDescription('');
      setIsConfirmOpen(false);
      refetch();
      refetchMe();
    } catch (err) {
      setError(err?.data?.error || 'Transaction failed.');
      setIsConfirmOpen(false);
    }
  };

  const handleSelfMintSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsed = parseInt(selfMintAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Mint amount must be a positive integer.');
      return;
    }

    try {
      const res = await mintPoints({
        amount: parsed,
        reason: selfMintReason || 'Super Admin Master Pool Refill'
      }).unwrap();

      setSuccess(res.message || `Successfully added ${parsed.toLocaleString()} points to Super Admin Master Pool.`);
      setIsSelfMintOpen(false);
      setSelfMintAmount('');
      setSelfMintReason('');
      refetchMe();
    } catch (err) {
      setError(err?.data?.error || 'Failed to mint points.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-indigo-400" />
            <span>Point Allocation & Master Mint</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Super Admin Master Pool &rarr; Direct Admin Allocation & Self Minting
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            setIsSelfMintOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Coins className="w-4 h-4" />
          <span>+ Add Points to Self</span>
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
        {/* Master Pool Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-semibold text-slate-300">Super Admin Master Available Balance</p>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Infinite Points
                </span>
              </div>
              <div className="flex items-baseline space-x-2.5 mt-0.5">
                <span className="text-2xl font-extrabold font-mono text-amber-400">∞</span>
                <span className="text-xs text-slate-400 font-mono">
                  (${masterBalance.toLocaleString()} in current pool)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('');
              setIsSelfMintOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Refill Pool</span>
          </button>
        </div>

        {/* Allocation Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Account *</label>
            <select
              required
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Select Target Account or Self Pool --</option>
              <optgroup label="Self Operations">
                <option value="SELF">
                  ✦ Super Admin Master Pool (Mint / Add Points to Myself)
                </option>
              </optgroup>
              <optgroup label="Admin Accounts">
                {admins.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.status !== 'ACTIVE'}>
                    @{a.username} ({a.name}) - Current Available: ${a.balance.toLocaleString()}{' '}
                    {a.status !== 'ACTIVE' ? '(INACTIVE)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Target Info Cards */}
          {isSelfSelected ? (
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-slate-200 font-medium">Self Operation: Mint new points directly into Super Admin Master Pool</span>
              </div>
              <span className="text-amber-400 font-mono font-bold">Uncapped</span>
            </div>
          ) : targetAdmin ? (
            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-slate-400">Current Balance</p>
                <p className="font-bold text-amber-400 font-mono mt-0.5">
                  ${targetAdmin.balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Total Received</p>
                <p className="font-bold text-slate-200 font-mono mt-0.5">
                  ${targetAdmin.totalReceived.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Distributed to Users</p>
                <p className="font-bold text-cyan-400 font-mono mt-0.5">
                  ${targetAdmin.totalDistributed.toLocaleString()}
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isSelfSelected ? 'Points to Mint (Integer) *' : 'Points to Allocate (Integer) *'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500">Quick fill:</span>
              {[5000, 10000, 50000, 100000, 1000000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reference / Code (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={isSelfSelected ? 'e.g. MASTER_REFILL' : 'e.g. Q4_PROMO_ALLOCATION'}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description (Optional)</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional transaction description..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 text-white font-semibold text-sm rounded-xl transition-all shadow-lg ${
              isSelfSelected
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isSelfSelected ? 'Mint Points to Master Pool' : 'Review & Allocate Points'}
          </button>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAllocate}
        title={isSelfSelected ? 'Confirm Master Point Mint' : 'Confirm Point Allocation'}
        message={
          isSelfSelected
            ? `Are you sure you want to mint ${parseInt(amount || 0, 10).toLocaleString()} points into the Super Admin Master Pool?\n\nThis will immediately increase the pool and create an audit log record.`
            : targetAdmin
            ? `Are you sure you want to allocate ${parseInt(amount || 0, 10).toLocaleString()} points to Admin '@${targetAdmin.username}' (${targetAdmin.name})?\n\nSuper Admin has infinite point capacity. This creates an immutable ledger entry.`
            : ''
        }
        confirmText={isSelfSelected ? 'Confirm Mint' : 'Confirm Point Transfer'}
        type={isSelfSelected ? 'info' : 'info'}
        isLoading={isAllocating || isMinting}
      />

      {/* SELF MINT MODAL */}
      <Modal
        isOpen={isSelfMintOpen}
        onClose={() => setIsSelfMintOpen(false)}
        title="Add Points to Super Admin Master Pool"
      >
        <form onSubmit={handleSelfMintSubmit} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3 text-xs text-amber-300">
            <Coins className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <span>
              Mint new points directly to your Super Admin master pool. These points will be immediately available.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mint Amount (Integer) *</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={selfMintAmount}
              onChange={(e) => setSelfMintAmount(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
            {/* Quick buttons */}
            <div className="flex items-center gap-2 mt-2">
              {[50000, 100000, 500000, 1000000].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setSelfMintAmount(String(preset))}
                  className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note (Optional)</label>
            <input
              type="text"
              value={selfMintReason}
              onChange={(e) => setSelfMintReason(e.target.value)}
              placeholder="e.g. Master Supply Expansion"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setIsSelfMintOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMinting}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {isMinting ? 'Minting...' : 'Mint Points Now'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
