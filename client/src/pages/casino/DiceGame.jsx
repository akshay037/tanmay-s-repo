import React, { useState } from 'react';
import { usePlaceCasinoBetMutation, useGetMeQuery } from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import { Coins, Sparkles, Dices, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';

export default function DiceGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const [placeBet, { isLoading }] = usePlaceCasinoBetMutation();

  const balance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);

  const [betAmount, setBetAmount] = useState(50);
  const [rollTarget, setRollTarget] = useState(50);
  const [isRolling, setIsRolling] = useState(false);
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);
  const [rolledNumber, setRolledNumber] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const winChance = 100 - rollTarget;
  const multiplier = parseFloat((98 / winChance).toFixed(2));

  const handleRoll = async () => {
    if (isRolling || isLoading) return;
    if (balance <= 0 || betAmount > balance) {
      setIsNoPointsModalOpen(true);
      return;
    }

    setIsRolling(true);
    setLastWin(null);
    setStatusMsg('');
    casinoAudio.coinClick();

    try {
      const res = await placeBet({
        gameType: 'DICE',
        betAmount: parseInt(betAmount, 10),
        gameData: { rollTarget }
      }).unwrap();

      setTimeout(() => {
        setIsRolling(false);
        const rolled = res.details?.rolledNumber || 50;
        setRolledNumber(rolled);

        if (res.result === 'WIN') {
          setLastWin(res.payout);
          if (multiplier >= 10) casinoAudio.bigWinSound();
          else casinoAudio.winSound();
          setStatusMsg(`WIN! Rolled ${rolled} > ${rollTarget}! +${res.payout.toLocaleString()} Points! (${res.multiplier}x)`);
        } else {
          casinoAudio.lossSound();
          setStatusMsg(`Rolled ${rolled} (Needed > ${rollTarget}). Try again!`);
        }
      }, 500);
    } catch (err) {
      setIsRolling(false);
      if (err?.data?.noPoints || (err?.data?.error && err?.data?.error.toLowerCase().includes('point'))) {
        setIsNoPointsModalOpen(true);
      } else {
        setStatusMsg(err?.data?.error || 'Roll failed.');
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
              <span>LUCKY CRYPTO DICE</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                Custom Multiplier
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold">Adjust target slider for higher multiplier or safer win chances!</p>
          </div>
        </div>
      </div>

      {/* Main Dice Table */}
      <div className="bg-gradient-to-b from-red-50 via-white to-red-50 border-2 border-red-200 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-slate-800">
        {/* Dice Result Display */}
        <div className="text-center py-6">
          <div className="inline-block p-6 rounded-3xl bg-white border-2 border-red-200 shadow-md">
            <span
              className={`text-7xl sm:text-9xl font-black font-mono tracking-tight ${
                isRolling
                  ? 'animate-pulse text-red-400'
                  : rolledNumber !== null
                  ? rolledNumber > rollTarget
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                  : 'text-red-700'
              }`}
            >
              {isRolling ? '??' : rolledNumber !== null ? rolledNumber : '50'}
            </span>
          </div>

          <div className="min-h-[40px] mt-4 flex items-center justify-center">
            {statusMsg && (
              <div
                className={`px-5 py-2 rounded-2xl text-xs sm:text-sm font-black border-2 ${
                  lastWin
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-md'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {statusMsg}
              </div>
            )}
          </div>
        </div>

        {/* Target Slider & Odds */}
        <div className="bg-white border-2 border-red-200 p-6 rounded-3xl space-y-6 shadow-md">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-red-50/60 rounded-2xl border-2 border-red-100">
              <span className="text-[11px] font-bold text-slate-500 block">Roll Over</span>
              <span className="text-xl font-black font-mono text-red-700">{rollTarget}</span>
            </div>
            <div className="p-3 bg-red-50/60 rounded-2xl border-2 border-red-100">
              <span className="text-[11px] font-bold text-slate-500 block">Win Chance</span>
              <span className="text-xl font-black font-mono text-emerald-700">{winChance}%</span>
            </div>
            <div className="p-3 bg-red-50/60 rounded-2xl border-2 border-red-100">
              <span className="text-[11px] font-bold text-slate-500 block">Multiplier</span>
              <span className="text-xl font-black font-mono text-red-700">{multiplier}x</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Safer (Low Multiplier)</span>
              <span>Riskier (High Multiplier)</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              value={rollTarget}
              onChange={(e) => setRollTarget(parseInt(e.target.value, 10))}
              disabled={isRolling}
              className="w-full h-3 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          </div>

          {/* Bet Input & Roll Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold text-slate-600">Bet:</span>
              {[10, 50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setBetAmount(v)}
                  disabled={isRolling}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all ${
                    betAmount === v
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              onClick={handleRoll}
              disabled={isRolling || betAmount <= 0}
              className={`py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
                isRolling
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : balance <= 0 || betAmount > balance
                  ? 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300'
                  : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isRolling ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Rolling Dice...</span>
                </>
              ) : balance <= 0 || betAmount > balance ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>YOU DON'T HAVE POINTS (CLICK TO ADD)</span>
                </>
              ) : (
                <>
                  <Dices className="w-4 h-4" />
                  <span>ROLL DICE (${betAmount} &bull; {multiplier}X)</span>
                </>
              )}
            </button>
          </div>
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
