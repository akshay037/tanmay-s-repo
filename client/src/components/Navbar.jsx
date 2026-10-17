import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import NotificationBell from './NotificationBell';
import Badge from './Badge';
import Modal from './Modal';
import { LogOut, User, Coins, ShieldCheck, Plus, Sparkles, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useGetMeQuery, useMintPointsMutation } from '../store/apiSlice';
import { buildTelegramWithdrawUrl } from '../utils/telegram';
import NoPointsNotificationModal from './NoPointsNotificationModal';
import WithdrawModal from './WithdrawModal';

export default function Navbar({ onToggleSidebar, onNavigate }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Fetch live balance with fast polling (2s) to stay live with games
  const { data: meData, refetch } = useGetMeQuery(undefined, { pollingInterval: 2000 });
  const [mintPoints, { isLoading: isMinting }] = useMintPointsMutation();

  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintReason, setMintReason] = useState('');
  const [mintError, setMintError] = useState('');

  const currentBalance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : (user?.balance ?? 0));
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleQuickMint = async (e) => {
    e.preventDefault();
    setMintError('');

    const parsed = parseInt(mintAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setMintError('Please enter a valid positive integer.');
      return;
    }

    try {
      await mintPoints({
        amount: parsed,
        reason: mintReason || 'Navbar Quick Master Refill'
      }).unwrap();

      setIsMintModalOpen(false);
      setMintAmount('');
      setMintReason('');
      refetch();
    } catch (err) {
      setMintError(err?.data?.error || 'Failed to mint points.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-red-100 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 shadow-sm w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full max-w-full">
          {/* Left: Mobile menu button & Brand */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 sm:p-2 text-slate-600 hover:text-red-700 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100"
              title="Open Navigation"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
                <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <span className="text-xs sm:text-base font-black text-red-800 tracking-tight">
                  Draikola
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono font-bold border border-red-200">
                  RED EDITION
                </span>
              </div>
            </div>
          </div>

          {/* Right: Balance Pill, Role Badge, Notifications, User Menu */}
          <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
            {/* Live Balance Pill */}
            <div
              onClick={() => {
                if (user?.role === 'USER' && onNavigate) {
                  onNavigate('balance-history');
                }
              }}
              className={`flex items-center space-x-1 sm:space-x-2 bg-red-50/90 border-2 border-red-200 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm transition-all ${
                user?.role === 'USER' ? 'cursor-pointer hover:bg-red-100 hover:border-red-300 hover:scale-105 active:scale-95' : ''
              }`}
              title={user?.role === 'USER' ? 'Click to view Balance History' : undefined}
            >
              <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 animate-pulse shrink-0" />
              <span className="text-slate-500 font-semibold hidden md:inline">Balance:</span>
              {isSuperAdmin ? (
                <div className="flex items-center space-x-1">
                  <span className="text-red-700 font-mono text-xs sm:text-sm font-black">∞</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono hidden sm:inline">
                    (${currentBalance.toLocaleString()})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMintError('');
                      setIsMintModalOpen(true);
                    }}
                    className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors ml-0.5"
                    title="Add Points to Master Pool"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-red-700 font-mono font-black text-xs sm:text-sm">${currentBalance.toLocaleString()}</span>
              )}
            </div>

            {/* Deposit & Withdraw Buttons for Users */}
            {user?.role === 'USER' && (
              <div className="flex items-center space-x-1 sm:space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-[11px] sm:text-xs font-black shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-105"
                  title="Deposit Points"
                >
                  <ArrowDownToLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden min-[400px]:inline">Deposit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-full text-[11px] sm:text-xs font-black shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-105"
                  title="Withdraw Points"
                >
                  <ArrowUpFromLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden min-[400px]:inline">Withdraw</span>
                </button>
              </div>
            )}

            {/* User Role Badge */}
            {user?.role && (
              <div className="hidden md:block">
                <Badge status={user.role} text={user.role.replace('_', ' ')} />
              </div>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* Logout button (Desktop view; on mobile, logout is on sidebar at the last) */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* QUICK REFILL MODAL FOR SUPER ADMIN */}
      {isSuperAdmin && (
        <Modal
          isOpen={isMintModalOpen}
          onClose={() => setIsMintModalOpen(false)}
          title="Add Points to Super Admin Pool"
        >
          <form onSubmit={handleQuickMint} className="space-y-4">
            {mintError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{mintError}</span>
              </div>
            )}

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                Super Admin has infinite point capacity. Minting adds immediate points to your active master pool.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mint Amount (Integer) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-2 mt-2">
                {[50000, 100000, 500000, 1000000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setMintAmount(String(preset))}
                    className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                  >
                    +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason (Optional)</label>
              <input
                type="text"
                value={mintReason}
                onChange={(e) => setMintReason(e.target.value)}
                placeholder="e.g. Master Refill"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsMintModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isMinting}
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isMinting ? 'Minting...' : 'Add Points Now'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <NoPointsNotificationModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        currentBalance={currentBalance}
        intent="deposit"
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentBalance={currentBalance}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />
    </>
  );
}
