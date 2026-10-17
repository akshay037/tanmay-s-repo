import React, { useState, useEffect } from 'react';
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
  ArrowUpFromLine,
  Wallet,
  History,
  Calendar,
  ShieldCheck,
  Users
} from 'lucide-react';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import WithdrawModal from '../../components/WithdrawModal';

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

function hashString(value) {
  const text = String(value || 'guest');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDailyBaseline(viewerKey) {
  const hash = hashString(viewerKey);
  const hour = new Date().getHours();
  // Scaled for active multi-game casino ecosystem (Lotto 99, Slots, Dice, Roulette, Blackjack, etc.)
  const baseDeposit = 5845000 + Math.floor((hour / 24) * 6350000) + (hash % 240000);
  const baseWithdrawal = Math.floor(baseDeposit * 0.74) + (hash % 90000);
  const baseTotalUsers = 2845000 + (hash % 18000);
  const onlineBuckets = [68450, 74210, 81930, 88480, 94350, 102820];
  const baseOnline = onlineBuckets[hash % onlineBuckets.length] + Math.floor(Math.random() * 350);

  return { baseDeposit, baseWithdrawal, baseTotalUsers, baseOnline };
}

function formatDollarCompact(val) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val}`;
}

function formatPlayerCount(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
  if (val >= 100000) return `${(val / 1000).toFixed(0)}k`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return `${val}`;
}

export default function CasinoLobby({ onSelectGame }) {
  const { user: authUser } = useSelector((state) => state.auth || {});
  const { data: meData } = useGetMeQuery();
  const { data: statsData } = useGetCasinoStatsQuery();

  const user = meData?.user || authUser;
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const balance = meData?.pointAccount?.balance || user?.balance || 0;
  const stats = statsData?.stats || {};

  const viewerKey = user?.username || user?.id || 'guest';
  const initialBase = getDailyBaseline(viewerKey);

  const [liveDeposit, setLiveDeposit] = useState(initialBase.baseDeposit);
  const [liveWithdrawal, setLiveWithdrawal] = useState(initialBase.baseWithdrawal);
  const [liveTotalPlayers, setLiveTotalPlayers] = useState(initialBase.baseTotalUsers);
  const [liveOnlineCount, setLiveOnlineCount] = useState(initialBase.baseOnline);

  const [depositFlash, setDepositFlash] = useState(false);
  const [withdrawFlash, setWithdrawFlash] = useState(false);
  const [totalPlayersFlash, setTotalPlayersFlash] = useState(false);

  // 1. Live Online Players ticker (Lotto 99 live community model)
  useEffect(() => {
    const onlineInterval = setInterval(() => {
      setLiveOnlineCount((prev) => {
        const wander = Math.floor(Math.random() * 115) - 56;
        const next = prev + wander;
        return Math.min(125000, Math.max(62000, next));
      });
    }, 2800);
    return () => clearInterval(onlineInterval);
  }, []);

  // 2. Live Deposits incrementing periodically
  useEffect(() => {
    const depositInterval = setInterval(() => {
      const increments = [1200, 2500, 4800, 8500, 15000, 24000];
      const randomInc = increments[Math.floor(Math.random() * increments.length)];
      setLiveDeposit((prev) => prev + randomInc);
      setDepositFlash(true);
      setTimeout(() => setDepositFlash(false), 900);
    }, 3600);
    return () => clearInterval(depositInterval);
  }, []);

  // 3. Live Withdrawals incrementing periodically
  useEffect(() => {
    const withdrawInterval = setInterval(() => {
      const increments = [1500, 3200, 6000, 11000, 18000, 28000];
      const randomInc = increments[Math.floor(Math.random() * increments.length)];
      setLiveWithdrawal((prev) => prev + randomInc);
      setWithdrawFlash(true);
      setTimeout(() => setWithdrawFlash(false), 900);
    }, 4600);
    return () => clearInterval(withdrawInterval);
  }, []);

  // 4. Total Players slowly incrementing
  useEffect(() => {
    const playerInterval = setInterval(() => {
      setLiveTotalPlayers((prev) => prev + (Math.random() > 0.35 ? 2 : 4));
      setTotalPlayersFlash(true);
      setTimeout(() => setTotalPlayersFlash(false), 900);
    }, 7200);
    return () => clearInterval(playerInterval);
  }, []);

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
      <div className="relative bg-gradient-to-r from-red-700 via-rose-600 to-red-800 border-2 border-red-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-2xl overflow-hidden text-white w-full max-w-full">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 text-center md:text-left">
          <div className="space-y-2.5 sm:space-y-3 max-w-xl mx-auto md:mx-0 flex flex-col items-center md:items-start">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-white text-xs font-black uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Points Casino Arena</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              BET YOUR POINTS.{' '}
              <span className="text-amber-300">
                WIN BIG REWARDS.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-red-100 font-medium leading-relaxed">
              Play your favorite games, use your points, and enjoy fast, transparent results every round.
            </p>

            {/* Platform Trust & Legacy Stats with Live Player Community */}
            <div className="w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 sm:p-3 text-red-100 shadow-xl">
              {/* Trust Legacy Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-[9px] sm:text-[11px] font-semibold text-amber-200/95 mb-2.5 px-1 border-b border-white/10 pb-2 gap-1.5 text-center sm:text-left">
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Started <strong className="text-white font-black">25 Aug 2017</strong> • <strong className="text-amber-300 font-black">9 Years, 1 Mo, 22 Days</strong> (3,340+ Days Active)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider">Live Community</span>
                </div>
              </div>

              {/* 4 Hero Stats Grid */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {/* 1. Today's Deposit */}
                <div
                  className={`min-w-0 text-center px-1 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 ${
                    depositFlash
                      ? 'bg-emerald-500/25 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.4)] scale-[1.03]'
                      : 'bg-black/30 border-white/15 hover:border-emerald-400/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5 text-emerald-400 text-xs sm:text-sm mb-0.5">
                    <ArrowDownToLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="text-[8px] font-bold text-emerald-300">↗</span>
                  </div>
                  <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] uppercase font-bold tracking-tight text-red-200/90 leading-tight truncate">
                    Today's Deposit
                  </p>
                  <p
                    className={`text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-black mt-1 font-mono transition-colors duration-300 ${
                      depositFlash ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    <span className="sm:hidden">{formatDollarCompact(liveDeposit)}</span>
                    <span className="hidden sm:inline">${liveDeposit.toLocaleString()}</span>
                  </p>
                </div>

                {/* 2. Today's Withdrawal */}
                <div
                  className={`min-w-0 text-center px-1 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 ${
                    withdrawFlash
                      ? 'bg-amber-500/25 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.4)] scale-[1.03]'
                      : 'bg-black/30 border-white/15 hover:border-amber-400/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5 text-rose-300 text-xs sm:text-sm mb-0.5">
                    <ArrowUpFromLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="text-[8px] font-bold text-rose-300">↙</span>
                  </div>
                  <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] uppercase font-bold tracking-tight text-red-200/90 leading-tight truncate">
                    Today's Withdrawal
                  </p>
                  <p
                    className={`text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-black mt-1 font-mono transition-colors duration-300 ${
                      withdrawFlash ? 'text-amber-200' : 'text-white'
                    }`}
                  >
                    <span className="sm:hidden">{formatDollarCompact(liveWithdrawal)}</span>
                    <span className="hidden sm:inline">${liveWithdrawal.toLocaleString()}</span>
                  </p>
                </div>

                {/* 3. Total Players */}
                <div
                  className={`min-w-0 text-center px-1 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 ${
                    totalPlayersFlash
                      ? 'bg-amber-500/20 border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.3)] scale-[1.02]'
                      : 'bg-black/30 border-white/15 hover:border-amber-400/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5 text-amber-300 text-xs sm:text-sm mb-0.5">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  </div>
                  <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] uppercase font-bold tracking-tight text-red-200/90 leading-tight truncate">
                    Total Players
                  </p>
                  <p className={`text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-black mt-1 font-mono transition-colors duration-300 ${
                    totalPlayersFlash ? 'text-amber-200' : 'text-amber-300'
                  }`}>
                    <span className="sm:hidden">{formatPlayerCount(liveTotalPlayers)}+</span>
                    <span className="hidden sm:inline">{liveTotalPlayers.toLocaleString('en-IN')}+</span>
                  </p>
                </div>

                {/* 4. Online Players */}
                <div className="min-w-0 text-center bg-black/30 px-1 py-2 sm:py-2.5 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs sm:text-sm mb-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] uppercase font-bold tracking-tight text-red-200/90 leading-tight truncate">
                    Online Players
                  </p>
                  <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-black text-emerald-400 mt-1 font-mono">
                    {liveOnlineCount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Player Balance Card */}
          <div className="bg-white border-2 border-red-200 p-4 sm:p-6 rounded-2xl shadow-2xl flex flex-col justify-between w-full max-w-sm md:max-w-none md:w-auto min-w-0 self-center md:self-auto text-slate-800 text-center sm:text-left mx-auto md:mx-0">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Available Playing Balance
                </span>
                {balance <= 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[10px] font-black">
                    Empty
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center sm:justify-start space-x-2.5 mt-2">
                <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 animate-bounce shrink-0" />
                <span className="text-2xl sm:text-3xl font-black font-mono text-red-700 truncate">
                  ${balance.toLocaleString()}
                </span>
                <span className="text-xs text-red-800 font-mono font-black bg-red-100 px-2 py-0.5 rounded-lg">$</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-row sm:items-center sm:gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsNoPointsModalOpen(true)}
                  className="py-1.5 sm:py-2 px-2 sm:px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-[1.02]"
                  title="Deposit Points"
                >
                  <ArrowDownToLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Deposit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="py-1.5 sm:py-2 px-2 sm:px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-[1.02]"
                  title="Withdraw Points"
                >
                  <ArrowUpFromLine className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Withdraw</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectGame && onSelectGame('balance-history')}
                  className="py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-red-50 text-red-800 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-sm border-2 border-red-200 transition-all hover:scale-[1.02]"
                  title="View Balance History"
                >
                  <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-red-600" />
                  <span>History</span>
                </button>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t-2 border-red-100 flex justify-between text-[11px] sm:text-xs text-slate-500 font-bold">
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

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentBalance={balance}
        onOpenDeposit={() => setIsNoPointsModalOpen(true)}
      />
    </div>
  );
}
