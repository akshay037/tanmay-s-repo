import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetMeQuery, useGetCasinoStatsQuery } from '../../store/apiSlice';
import {
  Sparkles,
  Coins,
  Flame,
  Trophy,
  ArrowRight,
  Gamepad2,
  AlertCircle,
  PlusCircle,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import { buildTelegramWithdrawUrl } from '../../utils/telegram';

const GAMES = [
  {
    id: 'slots',
    title: 'Lucky 777 Vegas Slots',
    subtitle: 'Classic 3-Reel Slot Machine',
    desc: 'Match 7s, Diamonds, Bells & Cherries on the center payline for massive multipliers.',
    maxWin: '50x Multiplier',
    icon: '🎰',
    badge: 'HOT JACKPOT',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  },
  {
    id: 'lotto',
    title: 'Lotto 99 • Number Prediction',
    subtitle: 'Live 3-Minute 10-Ball Draws',
    desc: 'Predict TOP 1, TOP 2, or TOP 1+2 Sum with Odd/Even & Big/Small markets on live 1–10 ball sequences every 3 minutes.',
    maxWin: '2.127x Multiplier',
    icon: '🎱',
    badge: 'LIVE 3-MIN',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  },
  {
    id: 'roulette',
    title: 'European Vegas Roulette',
    subtitle: 'Spinning Wheel & Chip Grid',
    desc: 'Bet on Red, Black, Even, Odd, Dozens, or hit a direct single number for 36x payout.',
    maxWin: '36x Payout',
    icon: '🎡',
    badge: 'CLASSIC',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  },
  {
    id: 'crash',
    title: 'Crash Rocket • Aviator',
    subtitle: 'Climbing Multiplier Curve',
    desc: 'Watch the rocket climb into space. Cash out before the rocket explodes to take profit!',
    maxWin: '100x Rocket',
    icon: '🚀',
    badge: 'THRILLING',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  },
  {
    id: 'blackjack',
    title: 'Classic Blackjack 21',
    subtitle: 'Player vs Dealer Vegas Table',
    desc: 'Get closer to 21 than the dealer without busting. Natural Blackjack pays 3:2 bonus!',
    maxWin: '2.5x Blackjack',
    icon: '🃏',
    badge: 'STRATEGY',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  },
  {
    id: 'dice',
    title: 'Lucky Crypto Dice',
    subtitle: 'Adjustable Probability & Multiplier',
    desc: 'Set your target slider. Choose high win chances or chase up to 50x payouts on single rolls.',
    maxWin: '50x Target',
    icon: '🎲',
    badge: 'INSTANT',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-500',
    btnGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
  }
];

export default function CasinoLobby({ onSelectGame }) {
  const { user: authUser } = useSelector((state) => state.auth || {});
  const { data: meData } = useGetMeQuery();
  const { data: statsData } = useGetCasinoStatsQuery();

  const user = meData?.user || authUser;
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);
  const balance = meData?.pointAccount?.balance || user?.balance || 0;
  const stats = statsData?.stats || {};

  return (
    <div className="space-y-8 font-sans">
      {/* Zero Balance Alert Banner */}
      {balance <= 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-pulse text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0 shadow-sm mx-auto sm:mx-0">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-red-900 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span>You don't have points to play!</span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                  0 Points
                </span>
              </h4>
              <p className="text-xs text-red-700 mt-1 font-semibold">
                You need points to wager on casino games. Click below to request or add points from your Admin.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNoPointsModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/25 transition-transform hover:scale-105 shrink-0 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add Points to Play</span>
          </button>
        </div>
      )}

      {/* Hero Showcase Banner */}
      <div className="relative bg-gradient-to-r from-red-700 via-rose-600 to-red-800 border-2 border-red-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden text-white">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-3 max-w-xl mx-auto md:mx-0 flex flex-col items-center md:items-start">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-white text-xs font-black uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Points Casino Arena</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              BET YOUR POINTS.{' '}
              <span className="text-amber-300">
                WIN BIG REWARDS.
              </span>
            </h1>

            <p className="text-sm text-red-100 font-medium leading-relaxed">
              Use your assigned points across Lotto 99, Vegas Slots, European Roulette, Crash Rocket, Blackjack 21, and Dice.
              All game rounds are resolved instantly on the blockchain-grade double entry ledger!
            </p>
          </div>

          {/* Player Balance Card */}
          <div className="bg-white border-2 border-red-200 p-6 rounded-2xl shadow-2xl flex flex-col justify-between w-full max-w-sm md:max-w-none md:w-auto min-w-[270px] self-center md:self-auto text-slate-800 text-center sm:text-left mx-auto md:mx-0">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Available Playing Balance
                </span>
                {balance <= 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[10px] font-black">
                    Empty
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center sm:justify-start space-x-2.5 mt-2">
                <Coins className="w-7 h-7 text-red-600 animate-bounce" />
                <span className="text-3xl font-black font-mono text-red-700">
                  ${balance.toLocaleString()}
                </span>
                <span className="text-xs text-red-800 font-mono font-black bg-red-100 px-2 py-0.5 rounded-lg">$</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsNoPointsModalOpen(true)}
                  className="w-full sm:flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-[1.02]"
                  title="Deposit Points"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                  <span>Deposit</span>
                </button>
                <a
                  href={buildTelegramWithdrawUrl({ user, meData, currentBalance: balance })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-[1.02]"
                  title="Withdraw Points"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
                  <span>Withdraw</span>
                </a>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-red-100 flex justify-between text-xs text-slate-500 font-bold">
              <span>Win Rate: <b className="text-emerald-700 font-mono">{stats.winRate || 0}%</b></span>
              <span>Best Win: <b className="text-red-700 font-mono">${(stats.biggestWin || 0).toLocaleString()}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Games Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <h2 className="text-xl font-black text-slate-900 flex items-center justify-center sm:justify-start gap-2">
              <Gamepad2 className="w-5 h-5 text-red-600" />
              <span>Select Casino Game</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold">Pick any game below to start playing with your points</p>
          </div>

          <button
            onClick={() => onSelectGame('casino-history')}
            className="text-xs font-black text-red-700 hover:text-red-800 flex items-center justify-center gap-1 transition-colors bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 self-center sm:self-auto"
          >
            <span>View Bet History & Stats</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`group cursor-pointer bg-white border-2 ${game.border} rounded-3xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-slate-800 text-center sm:text-left items-center sm:items-stretch`}
            >
              {/* Top Row: Icon & Badge */}
              <div className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform mx-auto sm:mx-0">
                    {game.icon}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${game.badgeColor}`}>
                    {game.badge}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 group-hover:text-red-700 transition-colors">
                  {game.title}
                </h3>
                <p className="text-xs font-semibold text-red-700 mt-0.5">{game.subtitle}</p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-medium">{game.desc}</p>
              </div>

              {/* Bottom Row: Max Win & Play Button */}
              <div className="w-full mt-6 pt-4 border-t-2 border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Max Payout</span>
                  <span className="text-xs font-mono font-black text-red-700">{game.maxWin}</span>
                </div>

                <button
                  className={`w-full sm:w-auto py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-1.5 group-hover:scale-105 bg-gradient-to-r ${game.btnGradient}`}
                >
                  <span>Play</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No Points Notification Modal */}
      <NoPointsNotificationModal
        isOpen={isNoPointsModalOpen}
        onClose={() => setIsNoPointsModalOpen(false)}
        currentBalance={balance}
        intent="deposit"
      />
    </div>
  );
}
