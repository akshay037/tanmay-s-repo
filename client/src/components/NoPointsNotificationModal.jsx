import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useGetMeQuery } from '../store/apiSlice';
import { AlertCircle, Coins, ArrowDownToLine } from 'lucide-react';
import { buildTelegramDepositUrl } from '../utils/telegram';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export default function NoPointsNotificationModal({
  isOpen,
  onClose,
  currentBalance = 0,
  requiredAmount = null,
  intent = 'required'
}) {
  const { data: meData } = useGetMeQuery(undefined, { skip: !isOpen });
  const [requestedAmount, setRequestedAmount] = useState(requiredAmount || 1000);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const liveBalance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : currentBalance);
  const depositAmount = isCustom ? parseInt(customAmount, 10) : requestedAmount;
  const isValidAmount = Number.isInteger(depositAmount) && depositAmount > 0;

  useEffect(() => {
    if (!isOpen) return;
    const starter = requiredAmount && requiredAmount > 0 ? requiredAmount : 1000;
    setRequestedAmount(starter);
    setIsCustom(!PRESET_AMOUNTS.includes(starter));
    setCustomAmount(!PRESET_AMOUNTS.includes(starter) ? String(starter) : '');
  }, [isOpen, requiredAmount]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Points Required to Play">
      <div className="space-y-5 text-slate-800">
        <div className="text-center pt-2 pb-1">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-md">
              <Coins className="w-10 h-10 text-red-600 animate-bounce" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-600 text-white rounded-full border-2 border-white shadow">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-900 mt-4 tracking-tight">
            {intent === 'deposit' ? 'Enter Deposit Amount' : "You Don't Have Balance to Play!"}
          </h3>
          <p className="text-xs text-red-700 font-bold mt-1">
            {requiredAmount
              ? `You need at least $${requiredAmount.toLocaleString()} to place this order.`
              : intent === 'deposit'
              ? 'Choose a preset or enter a custom amount, then continue on Telegram.'
              : 'Your wallet balance is $0 or insufficient to play.'}
          </p>
        </div>

        <div className="p-3.5 bg-red-50/70 border-2 border-red-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-red-600" />
            <span className="text-slate-600 font-semibold">Current Balance:</span>
          </div>
          <span className="font-mono font-black text-red-700 text-sm">
            ${liveBalance.toLocaleString()}
          </span>
        </div>

        <div className="space-y-3 bg-red-50/40 p-4 rounded-2xl border-2 border-red-100">
          <label className="block text-[11px] font-bold text-slate-600">
            Amount of Points to Deposit:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setIsCustom(false);
                  setRequestedAmount(amt);
                  setCustomAmount('');
                }}
                className={`py-2 rounded-xl text-xs font-mono font-black border-2 transition-all ${
                  !isCustom && requestedAmount === amt
                    ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                    : 'bg-white text-slate-700 hover:bg-red-50 border-red-200'
                }`}
              >
                +{amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
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
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2.5 bg-white border-2 border-red-200 rounded-xl text-sm font-mono font-black text-red-700 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
          <a
            href={isValidAmount ? buildTelegramDepositUrl({ meData, currentBalance: liveBalance, requestedAmount: depositAmount }) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!isValidAmount) e.preventDefault();
            }}
            className={`w-full sm:flex-1 px-4 py-3 text-xs font-black text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
              isValidAmount
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
            title="Deposit Points on Telegram"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isValidAmount
                ? `Deposit $${depositAmount.toLocaleString()} on Telegram`
                : 'Enter a valid amount'}
            </span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-700 hover:text-slate-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
