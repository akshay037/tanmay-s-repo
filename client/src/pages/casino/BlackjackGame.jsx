import React, { useState } from 'react';
import { usePlaceCasinoBetMutation, useGetMeQuery } from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import { Coins, Sparkles, Shield, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';

export default function BlackjackGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();
  const [placeBet, { isLoading }] = usePlaceCasinoBetMutation();

  const balance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);

  const [betAmount, setBetAmount] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [lastPayout, setLastPayout] = useState(0);

  const handleDeal = async () => {
    if (isPlaying || isLoading) return;
    if (balance <= 0 || betAmount > balance) {
      setIsNoPointsModalOpen(true);
      return;
    }

    setIsPlaying(true);
    setGameResult(null);
    setStatusMsg('');
    setLastPayout(0);
    casinoAudio.cardFlip();

    try {
      const res = await placeBet({
        gameType: 'BLACKJACK',
        betAmount: parseInt(betAmount, 10),
        gameData: {}
      }).unwrap();

      setTimeout(() => {
        setIsPlaying(false);
        const details = res.details || {};
        setPlayerHand(details.playerHand || []);
        setDealerHand(details.dealerHand || []);
        setPlayerScore(details.playerScore || 0);
        setDealerScore(details.dealerScore || 0);
        setGameResult(res.result);
        setLastPayout(res.payout);

        if (res.result === 'WIN') {
          if (details.playerBlackjack) {
            casinoAudio.bigWinSound();
            setStatusMsg(`BLACKJACK! Natural 21! +$${res.payout.toLocaleString()}! (2.5x)`);
          } else {
            casinoAudio.winSound();
            setStatusMsg(`YOU WIN! Dealer busts or has lower score! +$${res.payout.toLocaleString()}! (2x)`);
          }
        } else if (res.result === 'PUSH') {
          setStatusMsg(`PUSH! Tied with Dealer. Your $${betAmount} returned.`);
        } else {
          casinoAudio.lossSound();
          setStatusMsg(`DEALER WINS! Better luck next hand.`);
        }
      }, 1000);
    } catch (err) {
      setIsPlaying(false);
      if (err?.data?.noPoints) {
        setIsNoPointsModalOpen(true);
      } else {
        setStatusMsg(err?.data?.error || 'Failed to deal hand.');
      }
    }
  };

  const isCardRed = (label = '') => label.includes('♥') || label.includes('♦');

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Banner */}
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
            <h1 className="text-base sm:text-xl font-black text-red-800 tracking-wide flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <span>CLASSIC BLACKJACK 21</span>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                3:2 Natural Blackjack
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">Get closer to 21 than the dealer without going bust!</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] sm:text-xs text-slate-500 font-bold">Standard Vegas Rules &bull; Dealer stands on 17</span>
        </div>
      </div>

      {/* Blackjack Table Arena */}
      <div className="bg-gradient-to-b from-red-50 via-white to-red-50 border-2 border-red-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 md:p-10 shadow-xl relative overflow-hidden text-slate-800 w-full max-w-full">
        {/* Dealer Hand Area */}
        <div className="text-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-red-100">
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-red-700">Dealer's Hand</span>
            {dealerScore > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-mono font-black text-red-700 border-2 border-red-200">
                Score: {dealerScore}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 min-h-[80px] sm:min-h-[96px]">
            {dealerHand.length === 0 ? (
              <div className="flex gap-2">
                <div className="w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-400 text-xs font-bold">
                  🂠
                </div>
                <div className="w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-400 text-xs font-bold">
                  🂠
                </div>
              </div>
            ) : (
              dealerHand.map((c, i) => (
                <div
                  key={i}
                  className={`w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-white border-2 border-red-200 shadow-md sm:shadow-lg flex flex-col justify-between p-1 sm:p-2 select-none transform transition-transform hover:-translate-y-1 ${
                    isCardRed(c.label) ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs font-bold text-left leading-none">{c.label}</span>
                  <span className="text-base sm:text-2xl text-center">{c.label.slice(-1)}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-right leading-none">{c.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Message Marquee */}
        <div className="min-h-[40px] sm:min-h-[44px] flex items-center justify-center mb-4 sm:mb-6">
          {statusMsg && (
            <div
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black tracking-wide animate-bounce border-2 ${
                gameResult === 'WIN'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-md'
                  : gameResult === 'PUSH'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {statusMsg}
            </div>
          )}
        </div>

        {/* Player Hand Area */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-red-800">Your Hand</span>
            {playerScore > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-mono font-black text-red-700 border-2 border-red-200">
                Score: {playerScore}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 min-h-[80px] sm:min-h-[96px]">
            {playerHand.length === 0 ? (
              <div className="flex gap-2">
                <div className="w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-400 text-xs font-bold">
                  🂠
                </div>
                <div className="w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-400 text-xs font-bold">
                  🂠
                </div>
              </div>
            ) : (
              playerHand.map((c, i) => (
                <div
                  key={i}
                  className={`w-12 sm:w-16 h-18 sm:h-24 rounded-xl sm:rounded-2xl bg-white border-2 border-red-200 shadow-md sm:shadow-lg flex flex-col justify-between p-1 sm:p-2 select-none transform transition-transform hover:-translate-y-1 ${
                    isCardRed(c.label) ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs font-bold text-left leading-none">{c.label}</span>
                  <span className="text-base sm:text-2xl text-center">{c.label.slice(-1)}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-right leading-none">{c.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Betting Controls & Action Button */}
        <div className="bg-white border-2 border-red-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 shadow-md">
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
                  disabled={isPlaying}
                  className="w-full pl-9 pr-3 py-2.5 sm:py-3 bg-red-50/40 border-2 border-red-200 rounded-xl sm:rounded-2xl text-base font-black font-mono text-red-700 focus:outline-none focus:border-red-500 focus:bg-white disabled:opacity-50"
                />
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 pt-1 sm:pt-6">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => setBetAmount(val)}
                  disabled={isPlaying}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-black rounded-xl border border-red-200 transition-colors disabled:opacity-50"
                >
                  +${val}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(balance)}
                disabled={isPlaying}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-red-600 text-white font-mono text-xs font-black rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={handleDeal}
            disabled={isPlaying}
            className={`w-full py-3 sm:py-4 px-2 text-center rounded-2xl font-black text-xs sm:text-base md:text-lg uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
              isPlaying
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : balance <= 0
                ? 'bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isPlaying ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 animate-spin" />
                <span>Dealing Hands...</span>
              </span>
            ) : balance <= 0 ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>INSUFFICIENT BALANCE (CLICK TO DEPOSIT)</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>DEAL HAND (${betAmount.toLocaleString()})</span>
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
