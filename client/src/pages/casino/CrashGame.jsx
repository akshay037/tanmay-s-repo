import React, { useState, useEffect, useRef } from 'react';
import { usePlaceCasinoBetMutation, useGetMeQuery } from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import { Rocket, Coins, Sparkles, Flame, AlertOctagon, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';

export default function CrashGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const [placeBet, { isLoading }] = usePlaceCasinoBetMutation();

  const balance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);

  const [betAmount, setBetAmount] = useState(50);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gameStatus, setGameStatus] = useState('IDLE');
  const [crashPoint, setCrashPoint] = useState(null);
  const [lastWinAmount, setLastWinAmount] = useState(null);
  const [history, setRecentHistory] = useState([1.85, 2.40, 1.15, 6.20, 1.45, 12.80]);
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);

  const handleLaunch = async () => {
    if (isPlaying || isLoading) return;
    if (balance <= 0 || betAmount > balance) {
      setIsNoPointsModalOpen(true);
      return;
    }

    setIsPlaying(true);
    setGameStatus('FLYING');
    setCurrentMultiplier(1.0);
    setLastWinAmount(null);
    casinoAudio.coinClick();

    try {
      const res = await placeBet({
        gameType: 'CRASH',
        betAmount: parseInt(betAmount, 10),
        gameData: { targetMultiplier: parseFloat(targetMultiplier) }
      }).unwrap();

      const finalCrashPoint = res.details?.crashPoint || 1.0;
      setCrashPoint(finalCrashPoint);

      let start = Date.now();
      const duration = Math.min(3000, Math.max(800, Math.log2(finalCrashPoint) * 1000));

      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = elapsed / duration;
        const cur = Math.max(1.0, 1.0 + (finalCrashPoint - 1.0) * progress);

        if (progress >= 1.0) {
          clearInterval(interval);
          setCurrentMultiplier(finalCrashPoint);
          setIsPlaying(false);
          setRecentHistory((prev) => [finalCrashPoint, ...prev.slice(0, 5)]);

          if (res.result === 'WIN') {
            setGameStatus('WON');
            setLastWinAmount(res.payout);
            casinoAudio.bigWinSound();
          } else {
            setGameStatus('CRASHED');
            casinoAudio.lossSound();
          }
        } else {
          setCurrentMultiplier(cur);
        }
      }, 50);
    } catch (err) {
      setIsPlaying(false);
      setGameStatus('IDLE');
      if (err?.data?.noPoints) {
        setIsNoPointsModalOpen(true);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-2 border-red-200 p-5 rounded-3xl shadow-md text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onNavigate('casino')}
            className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-2xl transition-colors"
            title="Back to Casino"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-red-800 tracking-wide flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span>CRASH ROCKET • AVIATOR</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                Up to 100x Multiplier
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold">Lock in your multiplier before the rocket crashes!</p>
          </div>
        </div>

        {/* Recent Multipliers Trail */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Past Crashes:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {history.map((m, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-xl text-xs font-mono font-black border shadow-sm ${
                  m >= 2.0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Flight Radar Arena */}
      <div className="bg-gradient-to-b from-red-50 via-white to-red-50 border-2 border-red-200 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden min-h-[380px] flex flex-col justify-between">
        {/* Central Climbing Multiplier Display */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-8">
          <div className="flex items-center space-x-3 mb-2">
            <span
              className={`text-6xl sm:text-8xl font-black font-mono tracking-tight transition-all ${
                gameStatus === 'CRASHED'
                  ? 'text-rose-600 drop-shadow'
                  : gameStatus === 'WON'
                  ? 'text-emerald-700 drop-shadow'
                  : 'text-red-700 drop-shadow'
              }`}
            >
              {currentMultiplier.toFixed(2)}x
            </span>
          </div>

          {/* Status Badge */}
          {gameStatus === 'FLYING' && (
            <div className="flex items-center space-x-2 text-red-700 font-black text-xs uppercase tracking-widest animate-pulse">
              <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
              <span>Rocket Ascending • Target: {parseFloat(targetMultiplier).toFixed(2)}x</span>
            </div>
          )}
          {gameStatus === 'CRASHED' && (
            <div className="px-4 py-1.5 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>Crashed at {crashPoint}x! Rocket Exploded!</span>
            </div>
          )}
          {gameStatus === 'WON' && (
            <div className="px-5 py-2 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>CASHED OUT! Won +{lastWinAmount?.toLocaleString()} Points!</span>
            </div>
          )}
        </div>

        {/* Controls Grid */}
        <div className="relative z-10 bg-white border-2 border-red-200 p-5 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end shadow-lg text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
              <span>Wager Bet ($)</span>
              <span className="text-red-700 font-mono font-black">Bal: ${balance.toLocaleString()}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={balance}
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value, 10) || 0)}
                disabled={isPlaying}
                className="w-full pl-9 pr-3 py-3 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-black font-mono text-red-700 focus:outline-none focus:border-red-500 focus:bg-white disabled:opacity-50"
              />
              <Coins className="w-4 h-4 text-red-600 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              <span>Auto Cashout At (Multiplier)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1.1"
                max="100.0"
                value={targetMultiplier}
                onChange={(e) => setTargetMultiplier(e.target.value)}
                disabled={isPlaying}
                className="w-full pl-9 pr-3 py-3 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-black font-mono text-red-700 focus:outline-none focus:border-red-500 focus:bg-white disabled:opacity-50"
              />
              <TrendingUp className="w-4 h-4 text-red-600 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            onClick={handleLaunch}
            disabled={isPlaying}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
              isPlaying
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : balance <= 0
                ? 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>
              {isPlaying
                ? 'Flying in Orbit...'
                : balance <= 0
                ? 'Add Points to Play'
                : `Launch Rocket ($${betAmount})`}
            </span>
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
