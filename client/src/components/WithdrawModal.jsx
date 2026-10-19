import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useGetMeQuery, useRequestUserWithdrawalMutation } from '../store/apiSlice';
import { ArrowUpFromLine, Coins, AlertCircle, ArrowDownToLine, CheckCircle2, Copy, Check, Send, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildTelegramWithdrawUrl } from '../utils/telegram';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export default function WithdrawModal({
  isOpen,
  onClose,
  currentBalance = 0,
  onOpenDeposit
}) {
  const { data: meData, refetch: refetchMe } = useGetMeQuery(undefined, { skip: !isOpen });
  const [requestWithdrawal, { isLoading: isSubmitting }] = useRequestUserWithdrawalMutation();

  const liveBalance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : currentBalance);
  const [requestedAmount, setRequestedAmount] = useState(1000);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [userNote, setUserNote] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmittedData(null);
      setSubmitError('');
      setCopiedCode(false);
      return;
    }
    if (liveBalance > 0 && liveBalance < 1000) {
      setRequestedAmount(liveBalance);
      setIsCustom(true);
      setCustomAmount(String(liveBalance));
    } else {
      setRequestedAmount(Math.min(liveBalance, 1000));
      setIsCustom(false);
      setCustomAmount('');
    }
  }, [isOpen, liveBalance]);

  if (!isOpen) return null;

  const withdrawAmount = isCustom ? parseInt(customAmount, 10) : requestedAmount;
  const isZeroBalance = liveBalance <= 0;
  const isTooHigh = withdrawAmount > liveBalance;
  const isValidAmount = Number.isInteger(withdrawAmount) && withdrawAmount > 0 && !isTooHigh;
  const remainingBalance = Math.max(0, liveBalance - (isValidAmount ? withdrawAmount : 0));

  const adminName = meData?.owningAdmin?.username || meData?.owningAdmin?.name || 'Assigned Admin';

  const handleAllIn = () => {
    setIsCustom(true);
    setCustomAmount(String(liveBalance));
  };

  const handleWithdraw = async () => {
    if (!isValidAmount || isSubmitting) return;
    setSubmitError('');

    try {
      const res = await requestWithdrawal({
        amount: withdrawAmount,
        note: userNote.trim() || undefined
      }).unwrap();

      const requestCode = res.requestCode;
      setSubmittedData({
        requestCode,
        amount: withdrawAmount
      });

      // Automatically launch Telegram in parallel
      const tgUrl = buildTelegramWithdrawUrl({
        user: meData?.user,
        meData,
        currentBalance: liveBalance,
        requestedAmount: withdrawAmount,
        requestCode,
        userNote: userNote.trim() || undefined
      });

      window.open(tgUrl, '_blank', 'noopener,noreferrer');
      refetchMe();
    } catch (err) {
      const errMsg = err?.data?.error || (err?.status === 404 ? 'Server route not loaded. Please restart backend server.' : err?.message) || 'Failed to submit withdrawal request.';
      setSubmitError(errMsg);
    }
  };

  const copyCodeToClipboard = () => {
    if (!submittedData?.requestCode) return;
    navigator.clipboard.writeText(submittedData.requestCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Points">
      <div className="space-y-5 text-slate-800">
        {submittedData ? (
          /* SUCCESS VIEW */
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-3 tracking-tight">
                Withdrawal Request Submitted!
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Your request is now pending approval by your Admin on the Admin Panel
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="bg-red-50/70 border-2 border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <span className="text-xs font-bold text-slate-500">Request Code:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-red-700 text-sm">
                    {submittedData.requestCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCodeToClipboard}
                    className="p-1 rounded bg-white hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                    title="Copy Request Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <span className="text-xs font-bold text-slate-500">Requested Amount:</span>
                <span className="font-mono font-black text-slate-900 text-base">
                  ${submittedData.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <span className="text-xs font-bold text-slate-500">Assigned Admin:</span>
                <span className="font-bold text-red-700 text-xs">
                  @{adminName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                  PENDING ADMIN APPROVAL
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <span>Next Steps:</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                We sent your withdrawal request directly to your Admin's portal. Telegram was also opened so you can send your request code to @{adminName}. Once your Admin reviews and approves it, your points balance will be updated and payout confirmed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <a
                href={buildTelegramWithdrawUrl({
                  user: meData?.user,
                  meData,
                  currentBalance: liveBalance,
                  requestedAmount: submittedData.amount,
                  requestCode: submittedData.requestCode,
                  userNote: userNote.trim() || undefined
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 px-4 py-3 text-xs font-black text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open Telegram Chat Again</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-700 hover:text-slate-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <>
            <div className="text-center pt-2 pb-1">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-md">
                  <ArrowUpFromLine className="w-10 h-10 text-red-600 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-600 text-white rounded-full border-2 border-white shadow">
                  <Coins className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mt-4 tracking-tight">
                Request Point Withdrawal
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Your request will be sent to the Admin Panel for approval and opened on Telegram
              </p>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-3 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Balance Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-red-50/70 border-2 border-red-200 rounded-2xl flex flex-col justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-600 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-red-600" />
                  <span>Available Balance:</span>
                </div>
                <span className="font-mono font-black text-red-700 text-base mt-1">
                  ${liveBalance.toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col justify-between text-xs">
                <span className="text-slate-500 font-semibold">After Withdrawal:</span>
                <span className={`font-mono font-black text-base mt-1 ${isValidAmount ? 'text-slate-800' : 'text-slate-400'}`}>
                  ${remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {isZeroBalance ? (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-amber-800">
                  You currently have $0 points balance available to withdraw.
                </p>
                <p className="text-[11px] text-slate-500">
                  Deposit points or play games to build up your points balance.
                </p>
                {onOpenDeposit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeposit();
                    }}
                    className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black shadow-md hover:scale-105 transition-all"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Deposit Points Now</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-red-50/40 p-4 rounded-2xl border-2 border-red-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Amount of Points to Withdraw:
                  </label>
                  <button
                    type="button"
                    onClick={handleAllIn}
                    className="text-[10px] font-black uppercase tracking-wider text-red-600 hover:text-red-700 bg-red-100/70 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors"
                  >
                    Max (${liveBalance.toLocaleString()})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((amt) => {
                    const disabled = amt > liveBalance;
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setIsCustom(false);
                          setRequestedAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-2 rounded-xl text-xs font-mono font-black border-2 transition-all ${
                          disabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                            : !isCustom && requestedAmount === amt
                            ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                            : 'bg-white text-slate-700 hover:bg-red-50 border-red-200'
                        }`}
                      >
                        ${amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${
                      isCustom
                        ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                        : 'bg-white text-slate-700 hover:bg-red-50 border-red-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {isCustom && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Custom Amount ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={liveBalance}
                      step="1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={`Max: ${liveBalance}`}
                      className="w-full px-3 py-2.5 bg-white border-2 border-red-200 rounded-xl text-sm font-mono font-black text-red-700 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                    {isTooHigh && (
                      <p className="text-[11px] text-red-600 font-bold mt-1">
                        Amount exceeds your available balance of ${liveBalance.toLocaleString()}.
                      </p>
                    )}
                  </div>
                )}

                {/* Optional note / payment details */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    USDT Address Details (Optional):
                  </label>
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="e.g. USDT (TRC20 / ERC20) Address, UPI ID, or Bank Account"
                    maxLength={250}
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
              {!isZeroBalance && (
                <button
                  type="button"
                  disabled={!isValidAmount || isSubmitting}
                  onClick={handleWithdraw}
                  className={`w-full sm:flex-1 px-4 py-3 text-xs font-black text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    isValidAmount && !isSubmitting
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 hover:scale-[1.02]'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                  title="Submit Withdrawal to Admin Panel & Telegram"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isSubmitting
                      ? 'Submitting to Admin Panel...'
                      : isValidAmount
                      ? `Withdraw $${withdrawAmount.toLocaleString()} on Telegram & Portal`
                      : isTooHigh
                      ? 'Amount Exceeds Balance'
                      : 'Enter valid amount'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-700 hover:text-slate-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
