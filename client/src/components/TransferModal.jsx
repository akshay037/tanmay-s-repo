import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import {
  useGetMeQuery,
  useVerifyRecipientMutation,
  useUserTransferMutation
} from '../store/apiSlice';
import {
  ArrowLeftRight,
  Coins,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  User,
  Lock,
  Loader2
} from 'lucide-react';

export default function TransferModal({ isOpen, onClose, currentBalance = 0 }) {
  const { data: meData, refetch: refetchMe } = useGetMeQuery(undefined, { skip: !isOpen });
  const [verifyRecipient, { isLoading: isVerifying }] = useVerifyRecipientMutation();
  const [userTransfer, { isLoading: isSubmitting }] = useUserTransferMutation();

  const liveBalance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : currentBalance);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [verifyError, setVerifyError] = useState('');

  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Reset modal when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setVerifiedRecipient(null);
      setCandidates([]);
      setVerifyError('');
      setAmount('');
      setPassword('');
      setSubmitError('');
      setTransferSuccess(null);
      setCopiedCode(false);
    } else {
      refetchMe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const transferAmount = parseInt(amount, 10);
  const isZeroBalance = liveBalance <= 0;
  const isTooHigh = !isNaN(transferAmount) && transferAmount > liveBalance;
  const isValidAmount = Number.isInteger(transferAmount) && transferAmount > 0 && !isTooHigh;
  const remainingBalance = Math.max(0, liveBalance - (isValidAmount ? transferAmount : 0));

  // Handle Recipient Search
  const handleVerifyRecipient = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isVerifying) return;
    setVerifyError('');
    setVerifiedRecipient(null);
    setCandidates([]);

    try {
      const res = await verifyRecipient({ query: searchQuery.trim() }).unwrap();
      if (res.valid && res.user) {
        setVerifiedRecipient(res.user);
        setCandidates([]);
      } else if (res.ambiguous && res.candidates) {
        setCandidates(res.candidates);
      }
    } catch (err) {
      setVerifyError(err?.data?.error || 'Recipient not found. Please verify the ID or Username.');
    }
  };

  const handleAllIn = () => {
    if (liveBalance <= 0) return;
    setAmount(String(liveBalance));
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!verifiedRecipient || !isValidAmount || !password || isSubmitting) return;
    setSubmitError('');

    try {
      const res = await userTransfer({
        recipientId: verifiedRecipient.id,
        amount: transferAmount,
        password
      }).unwrap();

      setTransferSuccess({
        transferCode: res.transferCode,
        amount: transferAmount,
        recipient: verifiedRecipient,
        newBalance: res.newBalance
      });
      refetchMe();
    } catch (err) {
      setSubmitError(err?.data?.error || 'Failed to complete transfer.');
    }
  };

  const handleCopyCode = () => {
    if (!transferSuccess?.transferCode) return;
    navigator.clipboard.writeText(transferSuccess.transferCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Points (User-to-User)"
      maxWidth="max-w-md"
    >
      {transferSuccess ? (
        /* Success Screen */
        <div className="space-y-5 py-2 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              Transfer Completed
            </span>
            <h4 className="text-xl font-black text-slate-800 mt-2">
              Sent ${transferSuccess.amount.toLocaleString()} Points
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Transferred to <span className="text-red-700 font-bold">@{transferSuccess.recipient.username}</span>
            </p>
          </div>

          {/* Transfer Receipt Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Reference Code:</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center space-x-1 font-mono font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition-colors"
                title="Copy reference code"
              >
                <span>{transferSuccess.transferCode}</span>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Recipient ID:</span>
              <span className="font-mono font-bold text-slate-800">#{transferSuccess.recipient.id}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Recipient Admin:</span>
              <span className="font-mono font-bold text-slate-700">@{transferSuccess.recipient.adminUsername}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">New Balance:</span>
              <span className="font-mono font-black text-emerald-600">
                ${(transferSuccess.newBalance ?? remainingBalance).toLocaleString()} pts
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-red-500/25 transition-all"
          >
            Done
          </button>
        </div>
      ) : (
        /* Transfer Form */
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          {/* Live Balance Banner */}
          <div className="bg-gradient-to-br from-red-50 via-rose-50 to-red-100/70 border border-red-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-red-200 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                <Coins className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700/80 block">
                  Available Balance
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-red-950">
                  ${liveBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAllIn}
              disabled={isZeroBalance}
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm transition-all disabled:opacity-40"
            >
              All In
            </button>
          </div>

          {/* 1. Recipient Search / Verified Card */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              1. Recipient (User ID or Username)
            </label>

            {verifiedRecipient ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                      {verifiedRecipient.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {verifiedRecipient.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          #{verifiedRecipient.id}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 block truncate">
                        @{verifiedRecipient.username}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifiedRecipient(null);
                      setSearchQuery('');
                      setCandidates([]);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline ml-2 shrink-0"
                  >
                    Change
                  </button>
                </div>

                {/* Admin Assignment Badge */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-200 text-[10px]">
                  <span className="font-semibold text-slate-600">
                    Admin: <span className="font-bold text-slate-900">@{verifiedRecipient.adminUsername}</span> ({verifiedRecipient.adminName})
                  </span>
                  {!verifiedRecipient.isSameAdmin ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      External Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      Same Admin
                    </span>
                  )}
                </div>
              </div>
            ) : candidates.length > 0 ? (
              /* Ambiguous Multiple Candidates List */
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Multiple Players Found Across Admins</span>
                  <button
                    type="button"
                    onClick={() => setCandidates([])}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-[11px] text-amber-800">
                  Please pick the exact player and Admin you wish to transfer points to:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {candidates.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setVerifiedRecipient(c);
                        setCandidates([]);
                      }}
                      className="p-2.5 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {c.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-slate-900 truncate">{c.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">#{c.id}</span>
                          </div>
                          <span className="text-[11px] font-mono text-red-700 block truncate">@{c.username}</span>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Admin: <span className="font-bold text-slate-700">@{c.adminUsername}</span> ({c.adminName})
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[11px] font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 shrink-0"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setVerifyError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyRecipient();
                        }
                      }}
                      placeholder="e.g. 142 or bobby99 or agent1:142"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 focus:border-red-500 rounded-xl outline-none font-medium transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyRecipient}
                    disabled={!searchQuery.trim() || isVerifying}
                    className="px-3.5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all shrink-0"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Find</span>
                      </>
                    )}
                  </button>
                </div>
                {verifyError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{verifyError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. Amount to Send (Clean input without presets) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">2. Amount to Send</label>
              {isTooHigh && (
                <span className="text-[10px] font-bold text-rose-600">Exceeds available balance!</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter points to transfer..."
                className={`w-full pl-3.5 pr-16 py-2.5 text-sm font-mono font-bold rounded-xl border-2 outline-none transition-all ${
                  isTooHigh
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-red-500'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                Points
              </span>
            </div>
          </div>

          {/* 3. Security Password Confirmation */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>3. Your Password (Required to Authorize)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setSubmitError('');
              }}
              placeholder="Enter your login password"
              className="w-full px-3 py-2 text-xs bg-slate-50 border-2 border-slate-200 focus:border-red-500 rounded-xl outline-none font-medium transition-all"
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-2.5 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Summary Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs space-y-1 text-slate-600 font-medium">
            <div className="flex justify-between">
              <span>Transfer Amount:</span>
              <span className="font-bold font-mono text-slate-800">
                ${isValidAmount ? transferAmount.toLocaleString() : 0} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span>Remaining Balance:</span>
              <span className="font-bold font-mono text-slate-800">
                ${remainingBalance.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 border-2 border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!verifiedRecipient || !isValidAmount || !password || isSubmitting}
              className="w-2/3 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-red-500/25 flex items-center justify-center space-x-1.5 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>
                    Send ${isValidAmount ? transferAmount.toLocaleString() : 0} PTS
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
