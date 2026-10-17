import React, { useState, useEffect } from 'react';
import { usePlaceCasinoBetMutation, useGetMeQuery } from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import { Coins, RotateCcw, Sparkles, Volume2, VolumeX, AlertCircle, ArrowLeft } from 'lucide-react';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export default function RouletteGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const [placeBet, { isLoading }] = usePlaceCasinoBetMutation();

  const balance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);

  const [chipValue, setChipValue] = useState(50);
  const [selectedBetType, setSelectedBetType] = useState('RED');
  const [chosenNumber, setChosenNumber] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);
  const [winningColor, setWinningColor] = useState(null);
  const [lastWin, setLastWin] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [recentHistory, setRecentHistory] = useState([7, 24, 0, 32, 15]);
  const [soundOn, setSoundOn] = useState(true);
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);

  useEffect(() => {
    casinoAudio.enabled = soundOn;
  }, [soundOn]);

  const selectBet = (type, num = null) => {
    casinoAudio.coinClick();
    setSelectedBetType(type);
    setChosenNumber(num);
  };

  const handleSpin = async () => {
    if (isSpinning || isLoading) return;
    if (balance <= 0 || chipValue > balance) {
      setIsNoPointsModalOpen(true);
      return;
    }

    setIsSpinning(true);
    setLastWin(null);
    setStatusMessage('');

    let tick = setInterval(() => {
      casinoAudio.spinTick();
    }, 120);

    try {
      const res = await placeBet({
        gameType: 'ROULETTE',
        betAmount: parseInt(chipValue, 10),
        gameData: {
          betType: selectedBetType,
          chosenNumber
        }
      }).unwrap();

      setTimeout(() => {
        clearInterval(tick);
        setIsSpinning(false);

        const outcomeNumber = res.details?.winningNumber ?? 7;
        const outcomeColor = res.details?.winningColor ?? 'RED';

        setWinningNumber(outcomeNumber);
        setWinningColor(outcomeColor);
        setRecentHistory((prev) => [outcomeNumber, ...prev.slice(0, 7)]);

        if (res.result === 'WIN') {
          setLastWin(res.payout);
          setStatusMessage(`🎉 WIN! +${res.payout.toLocaleString()} POINTS (${res.multiplier}x)!`);
          if (res.multiplier >= 10) {
            casinoAudio.bigWinSound();
          } else {
            casinoAudio.winSound();
          }
        } else {
          setLastWin(null);
          setStatusMessage(`Ball landed on ${outcomeNumber} (${outcomeColor}). Try again!`);
          casinoAudio.lossSound();
        }
      }, 1600);
    } catch (err) {
      clearInterval(tick);
      setIsSpinning(false);
      if (err?.data?.noPoints) {
        setIsNoPointsModalOpen(true);
      } else {
        setStatusMessage(err?.data?.error || 'Failed to resolve roulette spin.');
      }
    }
  };

  const getNumberColor = (num) => {
    if (num === 0) return 'bg-emerald-600 text-white';
    if (RED_NUMBERS.includes(num)) return 'bg-red-600 text-white';
    return 'bg-slate-900 text-white';
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
              <span>EUROPEAN VEGAS ROULETTE</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                36x Number Win
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold">Place chips on Colors, Parities, Dozens, or Straight Numbers!</p>
          </div>
        </div>

        {/* Recent History Trail */}
        <div className="flex items-center justify-center sm:justify-end space-x-2">
          <span className="text-[11px] font-bold text-slate-500">History:</span>
          <div className="flex items-center space-x-1.5">
            {recentHistory.map((num, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono shadow ${getNumberColor(num)}`}
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Wheel & Result Display */}
      <div className="bg-gradient-to-b from-red-50 via-white to-red-50 border-2 border-red-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          {/* Wheel Graphic */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-8 border-red-500 flex items-center justify-center shadow-xl bg-white relative ${
              isSpinning ? 'animate-spin' : ''
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex flex-col items-center justify-center text-center">
              {winningNumber !== null ? (
                <>
                  <span className="text-2xl font-black font-mono text-red-700">{winningNumber}</span>
                  <span className={`text-[9px] uppercase font-black ${winningColor === 'RED' ? 'text-red-600' : winningColor === 'BLACK' ? 'text-slate-900' : 'text-emerald-700'}`}>
                    {winningColor}
                  </span>
                </>
              ) : (
                <span className="text-xs font-black text-slate-400 uppercase">Ready</span>
              )}
            </div>
          </div>

          {/* Status Banner */}
          <div className="min-h-[40px] mt-5 flex items-center justify-center">
            {statusMessage && (
              <div
                className={`px-5 py-2 rounded-2xl text-xs sm:text-sm font-black border-2 ${
                  lastWin
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-md'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>
        </div>

        {/* Roulette Betting Table */}
        <div className="space-y-4 bg-white border-2 border-red-100 p-5 rounded-3xl shadow-md">
          {/* Outside Bets */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { type: 'RED', label: 'RED (2x)', bg: 'bg-red-600 hover:bg-red-700 text-white' },
              { type: 'BLACK', label: 'BLACK (2x)', bg: 'bg-slate-900 hover:bg-slate-800 text-white' },
              { type: 'EVEN', label: 'EVEN (2x)', bg: 'bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200' },
              { type: 'ODD', label: 'ODD (2x)', bg: 'bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200' },
              { type: 'LOW', label: '1 - 18 (2x)', bg: 'bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200' },
              { type: 'HIGH', label: '19 - 36 (2x)', bg: 'bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200' }
            ].map((b) => (
              <button
                key={b.type}
                onClick={() => selectBet(b.type)}
                disabled={isSpinning}
                className={`py-3 px-2 rounded-2xl text-xs font-black transition-all shadow ${b.bg} ${
                  selectedBetType === b.type
                    ? 'ring-4 ring-amber-400 scale-105'
                    : 'opacity-90 hover:opacity-100'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Dozen Bets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { type: 'DOZEN_1', label: '1st Dozen (1-12) • 3x' },
              { type: 'DOZEN_2', label: '2nd Dozen (13-24) • 3x' },
              { type: 'DOZEN_3', label: '3rd Dozen (25-36) • 3x' }
            ].map((d) => (
              <button
                key={d.type}
                onClick={() => selectBet(d.type)}
                disabled={isSpinning}
                className={`py-2 px-3 bg-red-50 hover:bg-red-100 text-xs font-black text-red-800 rounded-2xl border-2 border-red-200 transition-all ${
                  selectedBetType === d.type ? 'ring-2 ring-red-600 bg-red-100' : ''
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Numbers Grid (0 to 36) */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 mb-2">
              Straight Number Bet (36x Multiplier) - Click to Select:
            </span>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 font-mono text-xs font-black">
              <button
                onClick={() => selectBet('NUMBER', 0)}
                disabled={isSpinning}
                className={`py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all ${
                  selectedBetType === 'NUMBER' && chosenNumber === 0 ? 'ring-4 ring-amber-400' : ''
                }`}
              >
                0
              </button>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const isRed = RED_NUMBERS.includes(num);
                const isSelected = selectedBetType === 'NUMBER' && chosenNumber === num;
                return (
                  <button
                    key={num}
                    onClick={() => selectBet('NUMBER', num)}
                    disabled={isSpinning}
                    className={`py-2 rounded-xl text-white transition-all ${
                      isRed ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
                    } ${isSelected ? 'ring-4 ring-amber-400 scale-105' : ''}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Betting Controls & Action Button */}
        <div className="mt-6 bg-white border-2 border-red-200 p-5 rounded-3xl space-y-4 text-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Chip Wager ($)</span>
                <span className="text-red-700 font-mono font-black">Available: ${balance.toLocaleString()}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={balance}
                  value={chipValue}
                  onChange={(e) => setChipValue(parseInt(e.target.value, 10) || 0)}
                  disabled={isSpinning}
                  className="w-full pl-9 pr-3 py-3 bg-red-50/40 border-2 border-red-200 rounded-2xl text-base font-black font-mono text-red-700 focus:outline-none focus:border-red-500 focus:bg-white disabled:opacity-50"
                />
                <Coins className="w-5 h-5 text-red-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 sm:pt-6">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => setChipValue(val)}
                  disabled={isSpinning}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-black rounded-xl border border-red-200 transition-colors disabled:opacity-50"
                >
                  +{val}
                </button>
              ))}
              <button
                onClick={() => setChipValue(balance)}
                disabled={isSpinning}
                className="px-3.5 py-2 bg-red-600 text-white font-mono text-xs font-black rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`w-full py-4 text-center rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl flex items-center justify-center space-x-2 ${
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
                <span>Spinning Roulette Wheel...</span>
              </span>
            ) : balance <= 0 ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>YOU DON'T HAVE POINTS (CLICK TO ADD)</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>SPIN WHEEL (${chipValue.toLocaleString()} ON {selectedBetType})</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <NoPointsNotificationModal
        isOpen={isNoPointsModalOpen}
        onClose={() => setIsNoPointsModalOpen(false)}
        currentBalance={balance}
        requiredAmount={chipValue}
      />
    </div>
  );
}
