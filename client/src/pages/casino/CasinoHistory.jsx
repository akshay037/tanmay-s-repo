import React from 'react';
import { useGetCasinoStatsQuery } from '../../store/apiSlice';
import { History, Trophy, TrendingUp, TrendingDown, Coins, RefreshCw } from 'lucide-react';

export default function CasinoHistory({ onNavigate }) {
  const { data, isLoading, refetch } = useGetCasinoStatsQuery(undefined, { pollingInterval: 10000 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentBets = data?.recentBets || [];
  const isNetPositive = (stats.netProfit || 0) >= 0;

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
            <History className="w-5 h-5 text-red-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-red-800 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span>Casino Bet Ledger & Player Statistics</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">Transparent record of all game rounds, wagers, and payouts</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl border-2 border-red-200 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold self-center sm:self-auto shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-red-100 p-4 rounded-3xl shadow-sm text-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Wagered</span>
          <p className="text-lg font-black font-mono text-red-700 mt-1">
            ${(stats.totalWagered || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{stats.totalBets || 0} rounds played</p>
        </div>

        <div className="bg-white border-2 border-red-100 p-4 rounded-3xl shadow-sm text-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Won</span>
          <p className="text-lg font-black font-mono text-emerald-700 mt-1">
            ${(stats.totalWon || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-700/80 font-bold mt-0.5">{stats.winRate || 0}% win rate</p>
        </div>

        <div className="bg-white border-2 border-red-100 p-4 rounded-3xl shadow-sm text-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Profit / Loss</span>
          <p
            className={`text-lg font-black font-mono mt-1 ${
              isNetPositive ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {isNetPositive ? '+$' : (stats.netProfit < 0 ? '-$' : '$')}
            {Math.abs(stats.netProfit || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{isNetPositive ? 'Profitable' : 'Down'}</p>
        </div>

        <div className="bg-white border-2 border-red-100 p-4 rounded-3xl shadow-sm text-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Biggest Win</span>
          <p className="text-lg font-black font-mono text-red-700 mt-1">
            ${(stats.biggestWin || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-red-600 font-bold mt-0.5">Top payout</p>
        </div>
      </div>

      {/* Bets Table */}
      <div className="bg-white border-2 border-red-100 rounded-3xl overflow-hidden shadow-lg">
        <div className="p-4 border-b-2 border-red-100 bg-red-50/50">
          <h3 className="text-sm font-black text-red-800">Recent Game Rounds</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-red-50 text-red-800 uppercase tracking-wider text-[10px] font-black border-b border-red-200">
              <tr>
                <th className="px-5 py-3.5">Game</th>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5 text-right">Wager</th>
                <th className="px-5 py-3.5 text-right">Multiplier</th>
                <th className="px-5 py-3.5 text-right">Payout</th>
                <th className="px-5 py-3.5 text-right">Net ($)</th>
                <th className="px-5 py-3.5 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {recentBets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400 font-semibold">
                    No casino rounds played yet. Place your first bet in the lobby!
                  </td>
                </tr>
              ) : (
                recentBets.map((b) => {
                  const isWin = b.result === 'WIN';
                  const isPush = b.result === 'PUSH';

                  return (
                    <tr key={b.id} className="hover:bg-red-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-900 flex items-center gap-1.5">
                        <span>
                          {b.game_type === 'LOTTO'
                            ? '🎱 Lotto 99'
                            : b.game_type === 'SLOTS'
                            ? '🎰 Slots'
                            : b.game_type === 'ROULETTE'
                            ? '🎡 Roulette'
                            : b.game_type === 'CRASH'
                            ? '🚀 Crash'
                            : b.game_type === 'BLACKJACK'
                            ? '🃏 Blackjack'
                            : '🎲 Dice'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">
                        ${b.bet_amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-red-700">
                        {b.multiplier > 0 ? `${b.multiplier}x` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-bold">
                        {b.payout > 0 ? `$${b.payout.toLocaleString()}` : '$0'}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono font-black ${
                          b.net_profit > 0
                            ? 'text-emerald-700'
                            : b.net_profit === 0
                            ? 'text-slate-500'
                            : 'text-rose-600'
                        }`}
                      >
                        {b.net_profit > 0
                          ? `+$${b.net_profit.toLocaleString()}`
                          : b.net_profit < 0
                          ? `-$${Math.abs(b.net_profit).toLocaleString()}`
                          : '$0'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isWin
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : isPush
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {b.result}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
