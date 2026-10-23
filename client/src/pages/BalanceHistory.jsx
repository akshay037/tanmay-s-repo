import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetMeQuery,
  useGetTransactionsQuery,
  useGetCasinoStatsQuery,
  useGetMyLottoBetsQuery,
  useGetUserWithdrawalRequestsQuery
} from '../store/apiSlice';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ExportButtons from '../components/ExportButtons';
import NoPointsNotificationModal from '../components/NoPointsNotificationModal';
import WithdrawModal from '../components/WithdrawModal';
import TransferModal from '../components/TransferModal';
import {
  History,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Gamepad2,
  Trophy,
  Search,
  Filter,
  RefreshCw,
  Eye,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function BalanceHistory({ initialTab = 'ALL', onNavigate }) {
  const { user: authUser } = useSelector((state) => state.auth || {});

  // Polling data sources
  const { data: meData, refetch: refetchMe } = useGetMeQuery(undefined, { pollingInterval: 4000 });
  const { data: casinoData, isLoading: isLoadingCasino, isFetching: isFetchingCasino, refetch: refetchCasino } = useGetCasinoStatsQuery(undefined, { pollingInterval: 4000 });
  const { data: txnData, isLoading: isLoadingTxns, isFetching: isFetchingTxns, refetch: refetchTxns } = useGetTransactionsQuery(undefined, { pollingInterval: 4000 });
  const { data: lottoBets = [], refetch: refetchLotto } = useGetMyLottoBetsQuery(undefined, { pollingInterval: 4000 });
  const { data: userWithdrawalRequests = [], refetch: refetchWithdrawalRequests } = useGetUserWithdrawalRequestsQuery(undefined, { pollingInterval: 4000 });

  const [activeTab, setActiveTab] = useState(initialTab || 'ALL'); // 'ALL' | 'DEPOSITS' | 'WITHDRAWALS' | 'GAMES'
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Modals
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const user = meData?.user || authUser || {};
  const currentBalance = meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : (user?.balance ?? 0));

  const stats = casinoData?.stats || {};
  const recentCasinoBets = casinoData?.recentBets || [];
  const rawTransactions = txnData?.transactions || [];

  const handleRefreshAll = () => {
    refetchMe();
    refetchCasino();
    refetchTxns();
    refetchLotto();
    refetchWithdrawalRequests();
  };

  const isFetching = isFetchingCasino || isFetchingTxns;
  const isLoading = isLoadingCasino && isLoadingTxns;

  // 1. Separate Deposits (Point Allocations to this user)
  const depositsList = useMemo(() => {
    return rawTransactions
      .filter((t) => {
        if (t.transactionType === 'USER_TRANSFER') return false;
        const isRecipient =
          t.toOwnerId === user.id ||
          t.toUsername === user.username ||
          t.transactionType === 'USER_ALLOCATION';
        const isNotSender = t.fromOwnerId !== user.id;
        return isRecipient && isNotSender;
      })
      .map((t) => ({
        id: t.transactionId || `TXN-${t.id}`,
        type: 'DEPOSIT',
        category: 'DEPOSIT',
        title: `Deposit ID`,
        amount: t.amount,
        direction: '+',
        balanceBefore: t.toBalanceBefore,
        balanceAfter: t.toBalanceAfter,
        status: t.status || 'COMPLETED',
        reference: t.reference || 'ADMIN_USER_ALLOCATION',
        description: t.description || 'Points credited to account',
        fromUser: t.fromUsername || t.fromName || 'Admin',
        toUser: t.toUsername || user.username,
        createdAt: t.createdAt,
        raw: t
      }));
  }, [rawTransactions, user]);

  // 2. Separate Withdrawals (Point deductions / cashouts from this user + pending portal requests)
  const withdrawalsList = useMemo(() => {
    // 2a. Completed ledger transactions
    const txnWithdrawals = rawTransactions
      .filter((t) => {
        if (t.transactionType === 'USER_TRANSFER') return false;
        const isSender =
          t.fromOwnerId === user.id ||
          t.fromUsername === user.username ||
          t.transactionType === 'USER_WITHDRAWAL' ||
          t.transactionType === 'USER_REVERSAL';
        return isSender;
      })
      .map((t) => ({
        id: t.transactionId || `TXN-${t.id}`,
        type: 'WITHDRAWAL',
        category: 'WITHDRAWAL',
        title: `Withdrawal ID`,
        amount: t.amount,
        direction: '-',
        balanceBefore: t.fromBalanceBefore,
        balanceAfter: t.fromBalanceAfter,
        status: t.status || 'COMPLETED',
        reference: t.reference || t.transactionType || 'USER_WITHDRAWAL',
        description: t.description || 'Points withdrawal cashout',
        fromUser: t.fromUsername || user.username,
        toUser: t.toUsername || t.toName || 'Admin',
        createdAt: t.createdAt,
        raw: t
      }));

    // 2b. Pending or rejected portal withdrawal requests (approved requests are already in txnWithdrawals)
    const requestWithdrawals = (Array.isArray(userWithdrawalRequests) ? userWithdrawalRequests : [])
      .filter((r) => r.status === 'PENDING' || r.status === 'REJECTED')
      .map((r) => ({
        id: `REQ-${r.id}`,
        type: 'WITHDRAWAL',
        category: 'WITHDRAWAL',
        title: `Withdrawal Request (@${r.adminUsername || 'Admin'})`,
        amount: r.amount,
        direction: '-',
        balanceBefore: r.userCurrentBalance,
        balanceAfter: r.userCurrentBalance,
        status: r.status,
        reference: r.requestCode,
        description: r.status === 'PENDING'
          ? 'Pending Admin review & approval on portal'
          : `Rejected by Admin${r.adminNote ? `: ${r.adminNote}` : ''}`,
        fromUser: r.username || user.username,
        toUser: r.adminUsername || 'Admin',
        createdAt: r.createdAt,
        raw: r
      }));

    return [...requestWithdrawals, ...txnWithdrawals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rawTransactions, user, userWithdrawalRequests]);

  // 3. Normalized Game Bets (Casino + Lotto)
  const gameBetsList = useMemo(() => {
    const casinoItems = recentCasinoBets.map((b) => {
      const isWin = b.result === 'WIN';
      const isPush = b.result === 'PUSH';
      return {
        id: `CASINO-${b.id}`,
        type: 'GAME',
        category: 'GAME',
        gameType: b.game_type,
        title:
          b.game_type === 'SLOTS'
            ? '777 Vegas Slots'
            : b.game_type === 'ROULETTE'
            ? 'Vegas Roulette'
            : b.game_type === 'CRASH'
            ? 'Crash Rocket'
            : b.game_type === 'BLACKJACK'
            ? 'Blackjack 21'
            : b.game_type === 'DICE'
            ? 'Crypto Dice'
            : b.game_type === 'LOTTO'
            ? 'Lotto 99'
            : b.game_type,
        wager: b.bet_amount,
        multiplier: b.multiplier,
        payout: b.payout,
        netProfit: b.net_profit,
        amount: b.net_profit !== 0 ? Math.abs(b.net_profit) : b.bet_amount,
        direction: b.net_profit > 0 ? '+' : b.net_profit < 0 ? '-' : '=',
        status: b.result,
        reference: b.game_type,
        description: `Wager: $${b.bet_amount.toLocaleString()} • Payout: $${b.payout.toLocaleString()}${b.multiplier > 0 ? ` (${b.multiplier}x)` : ''}`,
        createdAt: b.created_at,
        raw: b
      };
    });

    const lottoItems = (Array.isArray(lottoBets) ? lottoBets : []).map((lb) => ({
      id: `LOTTO-${lb.id}`,
      type: 'GAME',
      category: 'GAME',
      gameType: 'LOTTO',
      title: `Lotto 99 - ${lb.market || 'Draw'}`,
      wager: lb.stake,
      multiplier: lb.odds,
      payout: lb.payout || 0,
      netProfit: lb.net_profit || (lb.status === 'WON' ? (lb.payout || 0) - lb.stake : -lb.stake),
      amount: lb.net_profit !== 0 ? Math.abs(lb.net_profit || lb.stake) : lb.stake,
      direction: lb.status === 'WON' ? '+' : lb.status === 'LOST' ? '-' : '=',
      status: lb.status,
      reference: `Round #${lb.round_number}`,
      description: `Stake: $${lb.stake.toLocaleString()} • Odds: ${lb.odds}x • Pick: ${lb.selection}`,
      createdAt: lb.created_at,
      raw: lb
    }));

    return [...casinoItems, ...lottoItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [recentCasinoBets, lottoBets]);

  // 2c. Separate P2P Transfers (User-to-User)
  const transfersList = useMemo(() => {
    return rawTransactions
      .filter((t) => t.transactionType === 'USER_TRANSFER')
      .map((t) => {
        const isSender = t.fromOwnerId === user.id || t.fromUsername === user.username;
        return {
          id: t.transactionId || `TXN-${t.id}`,
          type: 'TRANSFER',
          category: 'TRANSFER',
          title: isSender ? `Sent to @${t.toUsername || 'User'}` : `Received from @${t.fromUsername || 'User'}`,
          amount: t.amount,
          direction: isSender ? '-' : '+',
          balanceBefore: isSender ? t.fromBalanceBefore : t.toBalanceBefore,
          balanceAfter: isSender ? t.fromBalanceAfter : t.toBalanceAfter,
          status: t.status || 'COMPLETED',
          reference: t.reference || 'P2P_TRANSFER',
          description: t.description || (isSender ? `Transfer sent to @${t.toUsername}` : `Transfer received from @${t.fromUsername}`),
          fromUser: t.fromUsername || user.username,
          toUser: t.toUsername || 'User',
          createdAt: t.createdAt,
          raw: t
        };
      });
  }, [rawTransactions, user]);

  // 4. Combined All Activity Timeline
  const allActivityList = useMemo(() => {
    const combined = [...depositsList, ...withdrawalsList, ...transfersList, ...gameBetsList];
    return combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [depositsList, withdrawalsList, transfersList, gameBetsList]);

  // Determine current active list based on tab
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'DEPOSITS') list = depositsList;
    else if (activeTab === 'WITHDRAWALS') list = withdrawalsList;
    else if (activeTab === 'TRANSFERS') list = transfersList;
    else if (activeTab === 'GAMES') list = gameBetsList;
    else list = allActivityList;

    // Filters
    return list.filter((item) => {
      const matchSearch =
        !search ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.id?.toLowerCase().includes(search.toLowerCase()) ||
        item.reference?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());

      const itemDate = new Date(item.createdAt);
      const matchStart = !startDate || itemDate >= new Date(startDate);
      const matchEnd = !endDate || itemDate <= new Date(endDate + ' 23:59:59');

      return matchSearch && matchStart && matchEnd;
    });
  }, [activeTab, depositsList, withdrawalsList, gameBetsList, allActivityList, search, startDate, endDate]);

  const totalEvents = currentList.length;
  const totalPages = Math.ceil(totalEvents / limit);
  const pagedList = currentList.slice(page * limit, (page + 1) * limit);

  // Totals for KPIs
  const totalDeposited = depositsList.reduce((acc, d) => acc + (d.amount || 0), 0);
  const totalWithdrawn = withdrawalsList.reduce((acc, w) => acc + (w.amount || 0), 0);
  const totalWagered = stats.totalWagered || gameBetsList.reduce((acc, g) => acc + (g.wager || 0), 0);
  const totalWon = stats.totalWon || gameBetsList.reduce((acc, g) => acc + (g.payout || 0), 0);
  const netGameProfit = stats.netProfit !== undefined ? stats.netProfit : totalWon - totalWagered;
  const isNetPositive = netGameProfit >= 0;

  const exportColumns = [
    { header: 'ID', key: 'id' },
    { header: 'Date/Time', key: 'createdAt' },
    { header: 'Category', key: 'category' },
    { header: 'Title', key: 'title' },
    { header: 'Amount ($)', key: 'amount' },
    { header: 'Direction', key: 'direction' },
    { header: 'Status', key: 'status' },
    { header: 'Reference', key: 'reference' },
    { header: 'Description', key: 'description' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto font-sans w-full min-w-0 overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white border-2 border-red-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-500/25 shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-red-950 tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span>Balance & Game History</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
              Live ledger of all deposits, cashout withdrawals, and casino game rounds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsDepositModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-105"
            title="Deposit Points"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
            <span>Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 border border-amber-400/30 transition-all hover:scale-105"
            title="Transfer Points"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWithdrawModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-105"
            title="Withdraw Points"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
            <span>Withdraw</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-1.5 sm:p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl border-2 border-red-200 transition-colors shadow-sm shrink-0"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Available Wallet Balance */}
        <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-red-100 uppercase tracking-wider">
            <span>Available Balance</span>
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-bounce shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2.5">
            <span className="text-lg sm:text-3xl font-black font-mono tracking-tight truncate block">
              ${Number(currentBalance || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] sm:text-[11px] text-red-100/90 font-medium mt-0.5 truncate">
            Current spendable points
          </p>
        </div>

        {/* Total Deposited */}
        <div className="bg-white border-2 border-emerald-100 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm text-slate-800">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Deposited</span>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <ArrowDownToLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2.5">
            <span className="text-base sm:text-2xl font-black font-mono text-emerald-700 truncate block">
              +${totalDeposited.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
            {depositsList.length} allocations received
          </p>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white border-2 border-red-100 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm text-slate-800">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Withdrawn</span>
            <div className="p-1 rounded-lg bg-red-50 text-red-600 shrink-0">
              <ArrowUpFromLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2.5">
            <span className="text-base sm:text-2xl font-black font-mono text-red-700 truncate block">
              -${totalWithdrawn.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
            {withdrawalsList.length} cashouts processed
          </p>
        </div>

        {/* Net Gaming Outcome */}
        <div className="bg-white border-2 border-red-100 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm text-slate-800">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Game Profit / Loss</span>
            <div className={`p-1 rounded-lg shrink-0 ${isNetPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isNetPositive ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2.5">
            <span className={`text-base sm:text-2xl font-black font-mono truncate block ${isNetPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isNetPositive ? '+$' : '-$'}
              {Math.abs(netGameProfit).toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
            {stats.winRate !== undefined ? `${stats.winRate}% win rate` : `${gameBetsList.length} rounds`}
          </p>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="bg-white border-2 border-red-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 border-b border-red-100 no-scrollbar">
          {[
            { id: 'ALL', label: 'All Activity', count: allActivityList.length, icon: History },
            { id: 'DEPOSITS', label: 'Deposits (+)', count: depositsList.length, icon: ArrowDownToLine },
            { id: 'TRANSFERS', label: 'P2P Transfers', count: transfersList.length, icon: ArrowLeftRight },
            { id: 'WITHDRAWALS', label: 'Withdrawals (-)', count: withdrawalsList.length, icon: ArrowUpFromLine },
            { id: 'GAMES', label: 'Game Bets & Wins', count: gameBetsList.length, icon: Gamepad2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(0);
                }}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 ring-2 ring-red-400'
                    : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by ID, game, reference, admin..."
              className="w-full pl-9 pr-3 py-2 bg-red-50/40 border-2 border-red-100 rounded-xl sm:rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400 font-semibold"
            />
            <Search className="w-4 h-4 text-red-400 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-2 py-2 bg-red-50/40 border-2 border-red-100 rounded-xl sm:rounded-2xl text-[11px] text-slate-700 font-bold focus:outline-none focus:border-red-400"
              title="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-2 py-2 bg-red-50/40 border-2 border-red-100 rounded-xl sm:rounded-2xl text-[11px] text-slate-700 font-bold focus:outline-none focus:border-red-400"
              title="End Date"
            />
          </div>

          <div className="flex items-center justify-end">
            <ExportButtons data={currentList} filename={`history-${activeTab.toLowerCase()}`} columns={exportColumns} />
          </div>
        </div>
      </div>

      {/* Main Table: Render customized view based on activeTab */}
      <div className="bg-white border-2 border-red-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
        {activeTab === 'GAMES' ? (
          /* Specialized Game Bets & Wins / Loss View (matches CasinoHistory perfectly) */
          <div>
            <div className="p-3.5 sm:p-4 border-b-2 border-red-100 bg-red-50/50 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-red-900 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-red-600" />
                <span>Casino & Lotto Bets Ledger</span>
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">{gameBetsList.length} total rounds</span>
            </div>

            {/* Mobile Card List (< sm screens) */}
            <div className="sm:hidden p-2.5 space-y-2.5">
              {pagedList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-semibold space-y-2">
                  <Gamepad2 className="w-8 h-8 text-red-200 mx-auto" />
                  <p className="font-bold text-slate-600 text-xs">No game rounds played yet.</p>
                  <p className="text-[11px] text-slate-400">Head to the Casino Lobby to place your first bet!</p>
                </div>
              ) : (
                pagedList.map((b) => {
                  const isWin = b.status === 'WIN' || b.status === 'WON';
                  const isPush = b.status === 'PUSH';

                  return (
                    <div key={b.id} className="p-3 bg-white rounded-2xl border border-red-100 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          {b.gameType === 'LOTTO'
                            ? '🎱 Lotto 99'
                            : b.gameType === 'SLOTS'
                            ? '🎰 Slots'
                            : b.gameType === 'ROULETTE'
                            ? '🎡 Roulette'
                            : b.gameType === 'CRASH'
                            ? '🚀 Crash'
                            : b.gameType === 'BLACKJACK'
                            ? '🃏 Blackjack'
                            : '🎲 Dice'}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isWin
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isPush
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-red-50/50 rounded-xl text-center font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Wager</span>
                          <span className="text-xs font-bold text-slate-700">${(b.wager || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Multiplier</span>
                          <span className="text-xs font-black text-red-700">{b.multiplier > 0 ? `${b.multiplier}x` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Net ($)</span>
                          <span
                            className={`text-xs font-black ${
                              b.netProfit > 0
                                ? 'text-emerald-700'
                                : b.netProfit === 0
                                ? 'text-slate-500'
                                : 'text-rose-600'
                            }`}
                          >
                            {b.netProfit > 0
                              ? `+$${b.netProfit.toLocaleString()}`
                              : b.netProfit < 0
                              ? `-$${Math.abs(b.netProfit).toLocaleString()}`
                              : '$0'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>
                          {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-emerald-700 font-bold">Payout: ${Number(b.payout || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
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
                <tbody className="divide-y divide-red-100 font-medium">
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-slate-400 font-semibold space-y-2">
                        <Gamepad2 className="w-8 h-8 text-red-200 mx-auto" />
                        <p className="font-bold text-slate-600">No game rounds played yet.</p>
                        <p className="text-xs text-slate-400">Head to the Casino Lobby to place your first bet!</p>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((b) => {
                      const isWin = b.status === 'WIN' || b.status === 'WON';
                      const isPush = b.status === 'PUSH';

                      return (
                        <tr key={b.id} className="hover:bg-red-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-black text-slate-900 flex items-center gap-1.5">
                            <span>
                              {b.gameType === 'LOTTO'
                                ? '🎱 Lotto 99'
                                : b.gameType === 'SLOTS'
                                ? '🎰 Slots'
                                : b.gameType === 'ROULETTE'
                                ? '🎡 Roulette'
                                : b.gameType === 'CRASH'
                                ? '🚀 Crash'
                                : b.gameType === 'BLACKJACK'
                                ? '🃏 Blackjack'
                                : '🎲 Dice'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                            {new Date(b.createdAt).toLocaleDateString()}
                            <span className="block text-[10px] text-slate-400">
                              {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">
                            ${(b.wager || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-black text-red-700">
                            {b.multiplier > 0 ? `${b.multiplier}x` : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-bold">
                            {b.payout > 0 ? `$${b.payout.toLocaleString()}` : '$0'}
                          </td>
                          <td
                            className={`px-5 py-3.5 text-right font-mono font-black ${
                              b.netProfit > 0
                                ? 'text-emerald-700'
                                : b.netProfit === 0
                                ? 'text-slate-500'
                                : 'text-rose-600'
                            }`}
                          >
                            {b.netProfit > 0
                              ? `+$${b.netProfit.toLocaleString()}`
                              : b.netProfit < 0
                              ? `-$${Math.abs(b.netProfit).toLocaleString()}`
                              : '$0'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isWin
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isPush
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {b.status}
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
        ) : (
          /* Unified / Deposits / Withdrawals */
          <div>
            {/* Mobile Card List (< sm screens) */}
            <div className="sm:hidden p-2.5 space-y-2.5">
              {isLoading ? (
                <div className="py-10 text-center text-slate-400 font-semibold">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-red-600 mb-2"></div>
                  <p className="text-xs">Loading history records...</p>
                </div>
              ) : pagedList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <Coins className="w-8 h-8 text-red-200 mx-auto" />
                  <p className="font-bold text-slate-600 text-xs">No records found for this view.</p>
                  <p className="text-[11px] text-slate-400">
                    {search
                      ? 'Try clearing your search query or adjusting the date range.'
                      : activeTab === 'DEPOSITS'
                      ? 'No deposit allocations received yet. Request points from your Admin.'
                      : activeTab === 'WITHDRAWALS'
                      ? 'No withdrawals processed yet.'
                      : 'Play casino games or request deposits to see records.'}
                  </p>
                </div>
              ) : (
                pagedList.map((item) => {
                  const isDeposit = item.type === 'DEPOSIT';
                  const isWithdrawal = item.type === 'WITHDRAWAL';
                  const isPositive = item.direction === '+';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="p-3 bg-white rounded-2xl border border-red-100 shadow-xs space-y-2 active:bg-red-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 ${
                              isDeposit
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : isWithdrawal
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : isPositive
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}
                          >
                            {isDeposit ? (
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            ) : isWithdrawal ? (
                              <ArrowUpFromLine className="w-3.5 h-3.5" />
                            ) : isPositive ? (
                              <Trophy className="w-3.5 h-3.5" />
                            ) : (
                              <Gamepad2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-xs text-slate-900 leading-tight truncate">
                              {item.title} {item.id}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span
                            className={`font-mono font-black text-sm block ${
                              isPositive
                                ? 'text-emerald-600'
                                : item.direction === '-'
                                ? 'text-red-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.direction === '+' ? '+' : item.direction === '-' ? '-' : ''}
                            ${(item.amount || 0).toLocaleString()}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              item.status === 'COMPLETED' || item.status === 'WON' || item.status === 'WIN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'LOST' || item.status === 'LOSS'
                                ? 'bg-red-100 text-red-800'
                                : item.status === 'PUSH' || item.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-red-50 text-slate-500">
                        <span className="truncate max-w-[200px] text-slate-600 font-medium">
                          {item.description || item.reference || 'N/A'}
                        </span>
                        {item.balanceAfter !== null && item.balanceAfter !== undefined && (
                          <span className="font-mono text-[10px] text-slate-700 shrink-0 font-bold ml-2">
                            Bal: ${item.balanceAfter.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-red-50/80 border-b-2 border-red-100 text-[11px] font-black text-red-800 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Event / Type</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Details / Description</th>
                    <th className="py-3.5 px-4 text-right">Balance Change</th>
                    <th className="py-3.5 px-4 text-right">Balance After</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 text-slate-700 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
                        <p>Loading history records...</p>
                      </td>
                    </tr>
                  ) : pagedList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 space-y-2">
                        <Coins className="w-10 h-10 text-red-200 mx-auto" />
                        <p className="font-bold text-slate-600">No records found for this view.</p>
                        <p className="text-xs text-slate-400">
                          {search
                            ? 'Try clearing your search query or adjusting the date range.'
                            : activeTab === 'DEPOSITS'
                            ? 'No deposit allocations received yet. Request points from your Admin.'
                            : activeTab === 'WITHDRAWALS'
                            ? 'No withdrawals processed yet.'
                            : 'Play casino games or request deposits to see records.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((item) => {
                      const isDeposit = item.type === 'DEPOSIT';
                      const isWithdrawal = item.type === 'WITHDRAWAL';
                      const isPositive = item.direction === '+';

                      return (
                        <tr key={item.id} className="hover:bg-red-50/40 transition-colors">
                          {/* Event Title & Icon */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
                                  isDeposit
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : isWithdrawal
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : isPositive
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}
                              >
                                {isDeposit ? (
                                  <ArrowDownToLine className="w-4 h-4" />
                                ) : isWithdrawal ? (
                                  <ArrowUpFromLine className="w-4 h-4" />
                                ) : isPositive ? (
                                  <Trophy className="w-4 h-4" />
                                ) : (
                                  <Gamepad2 className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{item.title} {item.id}</p>
                              </div>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleDateString()}
                            <span className="block text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </td>

                          {/* Details */}
                          <td className="py-3.5 px-4">
                            <div className="max-w-xs truncate text-[11px]">
                              <span className="font-semibold text-slate-700">{item.description || item.reference || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Balance Change */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                            <span
                              className={
                                isPositive
                                  ? 'text-emerald-600'
                                  : item.direction === '-'
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }
                            >
                              {item.direction === '+' ? '+' : item.direction === '-' ? '-' : ''}
                              ${(item.amount || 0).toLocaleString()}
                            </span>
                          </td>

                          {/* Balance After */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-600">
                            {item.balanceAfter !== null && item.balanceAfter !== undefined ? (
                              <span className="text-slate-900 font-black">${item.balanceAfter.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.status === 'COMPLETED' || item.status === 'WON' || item.status === 'WIN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'LOST' || item.status === 'LOSS'
                                  ? 'bg-red-100 text-red-800'
                                  : item.status === 'PUSH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                              title="View Record Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t-2 border-red-100 bg-red-50/40 text-xs text-slate-600 font-semibold">
            <span>
              Showing page {page + 1} of {totalPages} ({totalEvents} total records)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-800 rounded-xl font-bold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-800 rounded-xl font-bold disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}  title="Transaction Record Details">
        {selectedItem && (
          <div className="space-y-4 text-xs font-sans text-slate-700">
            {/* Top Summary Box */}
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Record ID</p>
                <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{selectedItem.id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount</p>
                <p
                  className={`text-lg font-black font-mono ${
                    selectedItem.direction === '+' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {selectedItem.direction === '+' ? '+' : selectedItem.direction === '-' ? '-' : ''}
                  ${(selectedItem.amount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Balances Before & After if available */}
            {selectedItem.balanceBefore !== null && selectedItem.balanceBefore !== undefined && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs">
                <div>
                  <p className="text-[11px] text-slate-400 font-sans font-bold">Balance Before:</p>
                  <p className="text-slate-800 font-black text-sm">${selectedItem.balanceBefore.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-sans font-bold">Balance After:</p>
                  <p className="text-red-700 font-black text-sm">${selectedItem.balanceAfter.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Attributes Breakdown */}
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl p-3 text-xs space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Type:</span>
                <span className="font-black text-slate-800">{selectedItem.title}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Category:</span>
                <span className="font-bold text-slate-800">{selectedItem.category}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Status:</span>
                <span className="font-black uppercase text-emerald-700">{selectedItem.status}</span>
              </div>
              {selectedItem.fromUser && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold">From:</span>
                  <span className="font-mono text-slate-800">@{selectedItem.fromUser}</span>
                </div>
              )}
              {selectedItem.toUser && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold">To:</span>
                  <span className="font-mono text-slate-800">@{selectedItem.toUser}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Reference:</span>
                <span className="font-mono text-slate-800">{selectedItem.reference || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold">Date & Time:</span>
                <span className="font-mono text-slate-800">{new Date(selectedItem.createdAt).toLocaleString()}</span>
              </div>
              {selectedItem.description && (
                <div className="pt-2">
                  <span className="text-slate-400 font-bold block mb-1">Details:</span>
                  <p className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs font-medium">
                    {selectedItem.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-800 font-bold rounded-xl transition-colors border border-red-200 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deposit Modal */}
      <NoPointsNotificationModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        currentBalance={currentBalance}
        intent="deposit"
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentBalance={currentBalance}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        currentBalance={currentBalance}
      />
    </div>
  );
}
