import React, { useState, useEffect } from 'react';
import { usePlaceCasinoBetMutation, useGetMeQuery } from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import { Coins, Sparkles, Trophy, RotateCcw, Volume2, VolumeX, Flame, AlertCircle, ArrowLeft } from 'lucide-react';

const SYMBOLS = [
  { id: 'SEVEN', icon: '7️⃣', name: 'Lucky 7', mult: '50x' },
  { id: 'DIAMOND', icon: '💎', name: 'Diamond', mult: '25x' },
  { id: 'BELL', icon: '🔔', name: 'Bell', mult: '15x' },
  { id: 'CHERRY', icon: '🍒', name: 'Cherry', mult: '10x' },
  { id: 'LEMON', icon: '🍋', name: 'Lemon', mult: '6x' },
  { id: 'GRAPE', icon: '🍇', name: 'Grape', mult: '4x' },
  { id: 'STAR', icon: '⭐', name: 'Star', mult: '3x' }
];

export default function SlotsGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const [placeBet, { isLoading }] = usePlaceCasinoBetMutation();

  const balance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);

  const [betAmount, setBetAmount] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['7️⃣', '💎', '7️⃣']);
  const [lastWin, setLastWin] = useState(null);
  const [winMessage, setWinMessage] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [showPaytable, setShowPaytable] = useState(false);
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);

  useEffect(() => {
    casinoAudio.enabled = soundOn;
  }, [soundOn]);

  const handleBetChange = (amount) => {
    casinoAudio.coinClick();
    setBetAmount(Math.max(1, Math.min(balance || 1, amount)));
  };

  const handleSpin = async () => {
    if (isSpinning || isLoading) return;
    if (balance <= 0 || betAmount > balance) {
      setIsNoPointsModalOpen(true);
      return;
    }

    setIsSpinning(true);
    setLastWin(null);
    setWinMessage('');

    let spinTickInterval = setInterval(() => {
      casinoAudio.spinTick();
    }, 100);

    let animCount = 0;
    const animInterval = setInterval(() => {
      animCount++;
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon
      ]);
      if (animCount > 15) clearInterval(animInterval);
    }, 80);

    try {
      const res = await placeBet({
        gameType: 'SLOTS',
        betAmount,
        betDetails: {}
      }).unwrap();

      setTimeout(() => {
        clearInterval(spinTickInterval);
        clearInterval(animInterval);

        const rawReels = res.details?.icons || res.details?.reels || ['7️⃣', '7️⃣', '7️⃣'];
        const outcome = rawReels.map((item) => (typeof item === 'string' ? item : item?.icon || '⭐'));
        setReels(outcome);
        setIsSpinning(false);

        if (res.result === 'WIN') {
          setLastWin(res.payout);
          setWinMessage(`🎉 JACKPOT WIN! +${res.payout.toLocaleString()} POINTS (${res.multiplier}x)!`);
          if (res.multiplier >= 20) {
            casinoAudio.bigWinSound();
          } else {
            casinoAudio.winSound();
          }
        } else {
          setLastWin(null);
          setWinMessage(`No match this spin. Try again!`);
          casinoAudio.lossSound();
        }
      }, 1600);
    } catch (err) {
      clearInterval(spinTickInterval);
      clearInterval(animInterval);
      setIsSpinning(false);
      if (err?.data?.noPoints) {
        setIsNoPointsModalOpen(true);
      } else {
        setWinMessage(err?.data?.error || 'Failed to connect to spin server.');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 font-sans w-full max-w-full overflow-hidden">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white border-2 border-red-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md text-center sm:text-left w-full max-w-full">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => onNavigate('casino')}
            className="p-2 sm:p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl transition-colors shrink-0"
            title="Back to Casino"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-black text-red-800 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <span>LUCKY 777 VEGAS SLOTS</span>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                50x Max
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Match 3 symbols across the central payline to win big!</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setShowPaytable(!showPaytable)}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl sm:rounded-2xl border border-red-200 transition-colors flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Paytable</span>
          </button>
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 sm:p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl sm:rounded-2xl border border-red-200 transition-colors"
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Paytable Dropdown */}
      {showPaytable && (
        <div className="bg-white border-2 border-red-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl animate-fadeIn w-full max-w-full">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs sm:text-sm font-black text-red-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>Official Payout Multipliers</span>
            </h3>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold">RTP: 96.5%</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
            {SYMBOLS.map((s) => (
              <div key={s.id} className="bg-red-50/60 border border-red-100 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl">
                <span className="text-xl sm:text-2xl block mb-0.5">{s.icon}</span>
                <p className="font-bold text-slate-800 text-[10px] sm:text-[11px]">{s.name}</p>
                <p className="text-red-700 font-black font-mono mt-0.5 text-xs">{s.mult}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Slot Machine Casing */}
      <div className="relative bg-gradient-to-b from-red-700 via-rose-600 to-red-800 border-3 sm:border-4 border-red-500 rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 md:p-10 shadow-2xl overflow-hidden text-white w-full max-w-full">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>

        {/* Marquee */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-white/20 border border-white/30 rounded-full text-white text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest shadow-inner">
            <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Grand Red Jackpot Available</span>
            <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          </div>
        </div>

        {/* Slot Reels Container */}
        <div className="relative bg-white border-3 sm:border-4 border-amber-300 rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 shadow-2xl mb-5 sm:mb-8">
          {/* Central Payline Indicator */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/50 z-10 pointer-events-none flex justify-between px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 -translate-y-1/2"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 -translate-y-1/2"></div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            {reels.map((symbol, idx) => (
              <div
                key={idx}
                className={`h-28 sm:h-44 rounded-xl sm:rounded-2xl bg-gradient-to-b from-red-50/50 via-white to-red-50/50 border-2 border-red-100 flex items-center justify-center shadow-inner relative overflow-hidden ${
                  isSpinning ? 'animate-pulse' : ''
                }`}
              >
                <span className={`text-4xl sm:text-7xl md:text-8xl select-none transform transition-transform duration-100 ${isSpinning ? 'scale-110 filter blur-[1px]' : 'scale-100'}`}>
                  {typeof symbol === 'string' ? symbol : symbol?.icon || '⭐'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Win Alert / Message Banner */}
        <div className="min-h-[44px] sm:min-h-[50px] flex items-center justify-center mb-4 sm:mb-6">
          {winMessage && (
            <div
              className={`px-6 py-2.5 rounded-2xl text-center text-sm font-black tracking-wide border-2 ${
                lastWin
                  ? 'bg-white text-red-800 border-amber-300 shadow-xl'
                  : 'bg-white/90 text-slate-800 border-white'
              }`}
            >
              {winMessage}
            </div>
          )}
        </div>

        {/* Controls Card */}
        <div className="bg-white border-2 border-red-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 text-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Wager Bet ($)</span>
                <span className="text-red-700 font-mono font-black">Available: ${balance.toLocaleString()}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={balance}
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value, 10) || 0)}
                  disabled={isSpinning}
                  className="w-full pl-9 pr-3 py-2.5 sm:py-3 bg-red-50/40 border-2 border-red-200 rounded-xl sm:rounded-2xl text-base font-black font-mono text-red-700 focus:outline-none focus:border-red-500 focus:bg-white disabled:opacity-50"
                />
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Quick Bet Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 pt-1 sm:pt-6">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => handleBetChange(val)}
                  disabled={isSpinning}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-black rounded-xl border border-red-200 transition-colors disabled:opacity-50"
                >
                  +{val}
                </button>
              ))}
              <button
                onClick={() => handleBetChange(Math.floor(betAmount * 2))}
                disabled={isSpinning}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-black rounded-xl border border-red-200 transition-colors disabled:opacity-50"
              >
                2x
              </button>
              <button
                onClick={() => handleBetChange(balance)}
                disabled={isSpinning}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-red-600 text-white font-mono text-xs font-black rounded-xl transition-colors disabled:opacity-50 shadow-md"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Zero Points Alert */}
          {balance <= 0 && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-rose-800 font-bold text-center sm:text-left">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>You don't have points to play! Add points to continue.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNoPointsModalOpen(true)}
                className="w-full sm:w-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-colors text-[11px]"
              >
                + Add Points
              </button>
            </div>
          )}

          {/* Big Spin Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`w-full py-3 sm:py-4 px-2 text-center rounded-2xl font-black text-xs sm:text-base md:text-lg uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
              isSpinning
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : balance <= 0
                ? 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 cursor-pointer'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 animate-spin" />
                <span>Spinning Reels...</span>
              </span>
            ) : balance <= 0 ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>YOU DON'T HAVE POINTS (CLICK TO ADD)</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>SPIN TO WIN (${betAmount.toLocaleString()})</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <NoPointsNotificationModal
        isOpen={isNoPointsModalOpen}
        onClose={() => setIsNoPointsModalOpen(false)}
        currentBalance={balance}
        requiredAmount={betAmount}
      />
    </div>
  );
}
