import React, { useState, useEffect, useRef } from 'react';
import {
  useGetLottoRoundQuery,
  usePlaceLottoBetMutation,
  useGetLottoHistoryQuery,
  useGetMyLottoBetsQuery,
  useGetMeQuery
} from '../../store/apiSlice';
import { casinoAudio } from '../../utils/casinoAudio';
import Modal from '../../components/Modal';
import NoPointsNotificationModal from '../../components/NoPointsNotificationModal';
import {
  ArrowLeft,
  History,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Flame,
  RefreshCw,
  Trophy,
  MessageSquare,
  Send,
  FileText,
  Check,
  Users,
  Volume2,
  VolumeX,
  ChevronRight,
  Coins,
  X
} from 'lucide-react';

const QUICK_STAKES = [10, 50, 100, 200, 500, 1000];

// Color mapping for 10 numbered lottery balls (1 to 10)
const BALL_COLORS = {
  1: 'from-amber-400 to-amber-600 text-slate-950 border-amber-300',
  2: 'from-blue-500 to-blue-700 text-white border-blue-400',
  3: 'from-rose-500 to-rose-700 text-white border-rose-400',
  4: 'from-emerald-500 to-emerald-700 text-white border-emerald-400',
  5: 'from-purple-500 to-purple-700 text-white border-purple-400',
  6: 'from-cyan-400 to-cyan-600 text-slate-950 border-cyan-300',
  7: 'from-yellow-400 to-yellow-600 text-slate-950 border-yellow-300',
  8: 'from-pink-500 to-pink-700 text-white border-pink-400',
  9: 'from-indigo-500 to-indigo-700 text-white border-indigo-400',
  10: 'from-red-600 to-red-800 text-white border-red-400'
};

const CHAT_FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Meera', 'Kabir', 'Ananya',
  'Lucas', 'Mia', 'Noah', 'Sofia', 'Ethan', 'Olivia',
  'Chen', 'Yuki', 'Hiro', 'Minji', 'Wei', 'Hana',
  'Omar', 'Layla', 'Yusuf', 'Amira', 'Hassan', 'Noor',
  'Diego', 'Camila', 'Mateo', 'Lucia', 'Andre', 'Valentina',
  'James', 'Emma', 'Liam', 'Chloe', 'Owen', 'Ava',
  'Niko', 'Elena', 'Marco', 'Ines', 'Lars', 'Freya',
  'Kwame', 'Amina', 'Tariq', 'Zara', 'Kenji', 'Sienna'
];

const CHAT_TAGS = ['Pro', 'VIP', 'Ace', 'Win', 'Play', 'King', 'Live', 'Bet', 'HQ', 'Lucky'];

const CHAT_LINES = [
  'TOP1 ODD is trending hot today! 🔥',
  'Just won +$3,980 on TOP1 BIG! Lets gooo',
  'Bet placed for the 3-minute round. Good luck all!',
  'Waiting for 15s reveal countdown, intense! ⚡',
  'TOP1+2 Sum > 11 is paying 2.127x multiplier',
  'Placed $500 on TOP1 [BIG]. Result at next 3-min mark!',
  'TOP2 EVEN hits 3 times in a row!',
  'Next game starts after 15s reveal, getting ready!',
  '$1,000 on TOP1+2 BIG 🚀',
  'Result at the 3-min mark, fingers crossed! 🤞',
  'Ball 1 will be 7 or 9 for sure!',
  'Won previous round +$995! 🎉',
  'Big multiplier 2.127x on TOP1+2!',
  'Continuous 3-minute cycle is super smooth 👌',
  '15s reveal animation is so cool',
  'Placed bet on TOP1 SMALL (1-5)',
  'Going SMALL this round, feeling lucky',
  'Anyone else riding TOP2 ODD?',
  'Cashout looking good this cycle',
  'Nice hit last draw, stacking again'
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildChatUsername() {
  const first = pickRandom(CHAT_FIRST_NAMES);
  const style = Math.floor(Math.random() * 6);
  if (style === 0) return `${first}_${pickRandom(CHAT_TAGS)}`;
  if (style === 1) return `${first}${Math.floor(Math.random() * 90) + 10}`;
  if (style === 2) return `${first}_${Math.floor(Math.random() * 90) + 10}`;
  if (style === 3) return `${first}${pickRandom(CHAT_TAGS)}`;
  if (style === 4) return `${first.charAt(0)}${first.slice(1)}_${Math.floor(Math.random() * 9) + 1}`;
  return first;
}

function nextChatUsername(recentNames, olderNames = []) {
  // Rare return visit from an older chatter so repeats exist, but not in a loop.
  if (olderNames.length > 0 && Math.random() < 0.12) {
    const candidate = pickRandom(olderNames);
    if (candidate && !recentNames.includes(candidate)) return candidate;
  }

  for (let i = 0; i < 24; i += 1) {
    const candidate = buildChatUsername();
    if (!recentNames.includes(candidate)) return candidate;
  }
  return buildChatUsername();
}

const INITIAL_CHAT_MESSAGES = [
  { id: 1, user: 'Lucas_VIP', text: CHAT_LINES[0], time: '1m ago', isVip: true },
  { id: 2, user: 'Minji88', text: CHAT_LINES[1], time: '1m ago', isVip: false },
  { id: 3, user: 'Omar_Ace', text: CHAT_LINES[2], time: '45s ago', isVip: true },
  { id: 4, user: 'Sofia_Play', text: CHAT_LINES[3], time: '30s ago', isVip: false },
  { id: 5, user: 'Chen_77', text: CHAT_LINES[4], time: '15s ago', isVip: false },
  { id: 6, user: 'Priya_Live', text: CHAT_LINES[5], time: 'Just now', isVip: true }
];

function formatTime(seconds = 0) {
  const safeSec = Math.max(0, parseInt(seconds, 10) || 0);
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function hashString(value) {
  const text = String(value || 'guest');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getUserOnlineBaseline(username) {
  const buckets = [10482, 12890, 15140, 17625, 20118, 22470];
  return buckets[hashString(username) % buckets.length];
}

function parseDrawnNumbers(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

// Fallback calculations for wall-clock 3-minute schedule
function computeLocalWallClockSchedule() {
  const now = Date.now();
  const INTERVAL_MS = 3 * 60 * 1000;
  const REVEAL_MS = 15 * 1000;
  const intervalStart = Math.floor(now / INTERVAL_MS) * INTERVAL_MS;
  const intervalEnd = intervalStart + INTERVAL_MS;
  const timeSinceStart = now - intervalStart;

  const isReveal = timeSinceStart < REVEAL_MS;
  const timeLeft = isReveal ? 0 : Math.max(0, Math.ceil((intervalEnd - now) / 1000));
  const revealLeft = isReveal ? Math.max(0, Math.ceil((REVEAL_MS - timeSinceStart) / 1000)) : 0;

  const currentResultTime = isReveal ? intervalStart : intervalEnd;
  const nextGameStart = intervalStart + REVEAL_MS;
  const nextGameResult = intervalEnd + (isReveal ? 0 : INTERVAL_MS);

  const formatHTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    isReveal,
    timeLeft,
    revealLeft,
    resultTimeFormatted: formatHTime(currentResultTime),
    nextGameStartFormatted: formatHTime(nextGameStart),
    nextResultTimeFormatted: formatHTime(nextGameResult)
  };
}

export default function LottoGame({ onNavigate }) {
  const { data: meData } = useGetMeQuery();

  // Polling every 1 second to keep round timer and game status live
  const { data: lottoData, refetch: refetchRound } = useGetLottoRoundQuery(undefined, {
    pollingInterval: 1000
  });
  const { data: historyData, refetch: refetchHistory } = useGetLottoHistoryQuery({ limit: 30 });
  const { data: myBetsData, refetch: refetchMyBets } = useGetMyLottoBetsQuery(undefined, {
    pollingInterval: 3000
  });

  const [placeBet, { isLoading: isSubmittingBet }] = usePlaceLottoBetMutation();

  // Local fallback clock calculations
  const [localClock, setLocalClock] = useState(computeLocalWallClockSchedule());

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalClock(computeLocalWallClockSchedule());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const balance = lottoData?.userBalance ?? meData?.pointAccount?.balance ?? (meData?.balance !== undefined ? meData.balance : 0);
  const currentRound = lottoData?.currentRound;
  const previousRound = lottoData?.previousRound;

  const odds = lottoData?.odds || {
    TOP1: { ODD: 1.99, EVEN: 1.99, BIG: 1.99, SMALL: 1.99 },
    TOP2: { ODD: 1.99, EVEN: 1.99, BIG: 1.99, SMALL: 1.99 },
    'TOP1+2': { BIG: 2.127, SMALL: 1.893, ODD: 1.99, EVEN: 1.99 }
  };

  // State: Allows selecting up to 2 options at a time
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [stake, setStake] = useState('');
  const [activeTab, setActiveTab] = useState('bet'); // 'bet', 'history', 'my-bets'
  const [isNoPointsModalOpen, setIsNoPointsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [betSuccessMsg, setBetSuccessMsg] = useState('');
  const [betErrorMsg, setBetErrorMsg] = useState('');

  // Auto-dismiss alert messages after 5 seconds
  useEffect(() => {
    if (!betSuccessMsg) return;
    const timer = setTimeout(() => {
      setBetSuccessMsg('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [betSuccessMsg]);

  useEffect(() => {
    if (!betErrorMsg) return;
    const timer = setTimeout(() => {
      setBetErrorMsg('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [betErrorMsg]);

  // Fake Live Chat State
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [isChatMuted, setIsChatMuted] = useState(false);
  const chatScrollContainerRef = useRef(null);
  const recentChatNamesRef = useRef(INITIAL_CHAT_MESSAGES.map((msg) => msg.user));
  const viewerKey = meData?.user?.username || meData?.user?.id || 'guest';
  const [onlineCount, setOnlineCount] = useState(() => getUserOnlineBaseline(viewerKey));

  // Live player count: each user gets a different baseline (~10k to 22k+)
  // then the number slowly ticks so it feels natural rather than a fixed 20,000.
  useEffect(() => {
    const baseline = getUserOnlineBaseline(viewerKey);
    setOnlineCount(baseline + Math.floor(Math.random() * 220) - 90);

    const tick = () => {
      setOnlineCount((prev) => {
        const wander = Math.floor(Math.random() * 63) - 24;
        const next = prev + wander;
        return Math.min(23840, Math.max(9720, next));
      });
    };

    const interval = setInterval(tick, 2600);
    return () => clearInterval(interval);
  }, [viewerKey]);

  // Periodic simulated live chat messages
  useEffect(() => {
    const interval = setInterval(() => {
      setChatMessages((prev) => {
        const visible = prev.slice(-25);
        const recentNames = recentChatNamesRef.current.slice(-14);
        const olderNames = recentChatNamesRef.current.slice(0, -8);
        const user = nextChatUsername(recentNames, olderNames);
        recentChatNamesRef.current = [...recentChatNamesRef.current, user].slice(-40);

        return [
          ...visible,
          {
            id: Date.now() + Math.random(),
            user,
            text: pickRandom(CHAT_LINES),
            time: 'Just now',
            isVip: Math.random() > 0.62
          }
        ];
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Keep internal scroll inside chat box without scrolling the outer page/screen
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const myUsername = meData?.user?.username || 'You';
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        user: `${myUsername} (Me)`,
        text: chatInput.trim(),
        time: 'Just now',
        isVip: true,
        isSelf: true
      }
    ]);
    setChatInput('');
    if (!isChatMuted) {
      casinoAudio.coinClick();
    }
  };

  // Ball rolling animation during drawing (15-second reveal window)
  const isRevealWindow = currentRound ? Boolean(currentRound.isRevealWindow) : localClock.isReveal;
  const isBettingOpen = currentRound ? Boolean(currentRound.bettingOpen) : !localClock.isReveal;

  const [animatedBalls, setAnimatedBalls] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  useEffect(() => {
    let interval = null;
    if (isRevealWindow) {
      interval = setInterval(() => {
        setAnimatedBalls(prev => [...prev].sort(() => Math.random() - 0.5));
      }, 130);
    } else if (previousRound?.drawn_numbers) {
      const parsed = parseDrawnNumbers(previousRound.drawn_numbers);
      setAnimatedBalls(parsed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRevealWindow, previousRound]);

  const activeStake = parseInt(stake, 10) || 0;
  const totalRequiredStake = activeStake * selectedOptions.length;

  const optionDetails = selectedOptions.map((opt) => {
    const o = odds[opt.market]?.[opt.selection] || 1.99;
    const gross = (activeStake * o).toFixed(2);
    const profit = (activeStake * o - activeStake).toFixed(2);
    return {
      ...opt,
      odds: o,
      gross,
      profit
    };
  });

  const totalGrossPayout = optionDetails.reduce((sum, d) => sum + parseFloat(d.gross), 0).toFixed(2);
  const totalNetProfit = optionDetails.reduce((sum, d) => sum + parseFloat(d.profit), 0).toFixed(2);

  // Toggle selection: allows up to 2 options at a time
  const handleSelectMarketOption = (market, option) => {
    casinoAudio.coinClick();
    setBetSuccessMsg('');
    setBetErrorMsg('');

    const existsIndex = selectedOptions.findIndex(
      (item) => item.market === market && item.selection === option
    );

    if (existsIndex !== -1) {
      // Deselect if already selected
      setSelectedOptions(prev => prev.filter((_, idx) => idx !== existsIndex));
    } else {
      // Select up to 2 options
      if (selectedOptions.length >= 2) {
        // Shift out oldest option, add new option
        setSelectedOptions([selectedOptions[1], { market, selection: option }]);
      } else {
        setSelectedOptions(prev => [...prev, { market, selection: option }]);
      }
    }
  };

  const handleRemoveOption = (index) => {
    casinoAudio.coinClick();
    setSelectedOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlaceBet = async () => {
    setBetErrorMsg('');
    setBetSuccessMsg('');

    if (selectedOptions.length === 0) {
      setBetErrorMsg('Please select at least 1 market option (up to 2 options).');
      return;
    }
    if (activeStake <= 0) {
      setBetErrorMsg('Please enter a valid stake amount greater than $0.');
      return;
    }
    if (balance <= 0 || balance < totalRequiredStake) {
      setIsNoPointsModalOpen(true);
      return;
    }
    if (!isBettingOpen) {
      const waitTime = currentRound?.revealTimeLeft || localClock.revealLeft || 15;
      setBetErrorMsg(`Current round is revealing results! Next 3-minute round starts in ${waitTime}s.`);
      return;
    }

    try {
      const targetRoundId = currentRound?.id || 1;
      const betsPayload = selectedOptions.map((opt) => ({
        market: opt.market,
        selection: opt.selection,
        stake: activeStake,
        idempotencyKey: `lotto-${targetRoundId}-${opt.market}-${opt.selection}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      }));

      const res = await placeBet({
        bets: betsPayload,
        market: selectedOptions[0].market,
        selection: selectedOptions[0].selection,
        stake: activeStake
      }).unwrap();

      casinoAudio.coinClick();
      const resTime = currentRound?.resultTimeFormatted || localClock.resultTimeFormatted;
      setBetSuccessMsg(res.message || `Order Placed! Result at ${resTime}!`);
      setIsConfirmModalOpen(false);
      setSelectedOptions([]);
      setStake('');
      refetchRound();
      refetchMyBets();
    } catch (err) {
      setIsConfirmModalOpen(false);
      if (err?.data?.noPoints) {
        setIsNoPointsModalOpen(true);
      } else {
        setBetErrorMsg(err?.data?.error || 'Failed to place bet order.');
      }
    }
  };

  const handleOpenConfirm = () => {
    if (selectedOptions.length === 0) {
      setBetErrorMsg('Please select at least 1 market option (up to 2 options).');
      return;
    }
    if (balance <= 0 || balance < totalRequiredStake) {
      setIsNoPointsModalOpen(true);
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const safeBalls = Array.isArray(animatedBalls) && animatedBalls.length === 10
    ? animatedBalls
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const displayTimeLeft = currentRound?.timeLeft !== undefined ? currentRound.timeLeft : localClock.timeLeft;
  const displayRevealLeft = currentRound?.revealTimeLeft !== undefined ? currentRound.revealTimeLeft : localClock.revealLeft;
  const displayResultTime = currentRound?.resultTimeFormatted || localClock.resultTimeFormatted;
  const displayNextGameStart = currentRound?.resultTimeFormatted
    ? `${currentRound.resultTimeFormatted} + 15s`
    : localClock.nextGameStartFormatted;
  const displayNextResultTime = currentRound?.nextResultTimeFormatted || localClock.nextResultTimeFormatted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50/60 text-slate-800 font-sans pb-16 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-5 pt-2 sm:pt-3 w-full max-w-full">
        {/* 1. Game title header — matches slots, roulette, crash, etc. */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white border-2 border-red-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md text-center sm:text-left w-full max-w-full">
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
                <span>LOTTO 99 • NUMBER PREDICTION</span>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] uppercase font-black bg-red-600 text-white rounded-full">
                  2.127x Max
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">
                Live 3-minute 10-ball draws. Predict TOP 1, TOP 2, or TOP 1+2.
              </p>
            </div>
          </div>
        </header>

        {/* 2. CONTINUOUS 3-MINUTE CYCLE BANNER (RED & WHITE THEME) */}
        <div className="bg-white border-2 border-red-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl relative overflow-hidden w-full max-w-full">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
            {/* Left: Round ID & Status */}
            <div className="space-y-1.5 sm:space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="flex items-center justify-center sm:justify-start space-x-2 text-[11px] sm:text-xs font-bold text-red-700 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Continuous 3-Minute Draw System</span>
              </div>

              <div className="text-2xl sm:text-4xl font-mono font-black text-slate-900 tracking-tight">
                #{currentRound?.roundNumber || '20261012-0001'}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm ${
                    isBettingOpen
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                      : 'bg-red-100 text-red-800 border-2 border-red-400 animate-pulse'
                  }`}
                >
                  <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isBettingOpen ? 'bg-emerald-500' : 'bg-red-600'}`} />
                  <span>{isBettingOpen ? 'BETTING OPEN' : 'DRAWING WINNING BALLS'}</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-200">
                  Fixed 3-Min Intervals
                </span>
              </div>
            </div>

            {/* Middle: Big Countdown Clock */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-center shadow-inner">
              <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-red-700 block mb-1">
                {isBettingOpen ? 'Betting Closes & Result At' : '15-Sec Reveal Window Ending In'}
              </span>

              <div className="text-4xl sm:text-6xl font-mono font-black text-red-600 tracking-tight drop-shadow-sm">
                {isBettingOpen ? formatTime(displayTimeLeft) : `${displayRevealLeft}s`}
              </div>

              <p className="text-[11px] sm:text-xs font-bold text-slate-600 mt-1">
                {isBettingOpen ? (
                  <span>Result Shown At: <b className="text-red-700 font-mono text-xs sm:text-sm">{displayResultTime}</b></span>
                ) : (
                  <span className="text-red-700 font-black">Revealing numbers! Next round opens after 15s.</span>
                )}
              </p>
            </div>

            {/* Right: Wall-Clock Schedule Details */}
            <div className="bg-white border-2 border-red-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs shadow-sm">
              <div className="flex items-center justify-between border-b border-red-100 pb-1">
                <span className="font-semibold text-slate-500">Current Round Result:</span>
                <span className="font-mono font-black text-red-700">{displayResultTime}</span>
              </div>
              <div className="flex items-center justify-between border-b border-red-100 pb-1">
                <span className="font-semibold text-slate-500">Next Game Starts:</span>
                <span className="font-mono font-bold text-slate-800">{displayNextGameStart}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Next Game Result:</span>
                <span className="font-mono font-bold text-emerald-700">{displayNextResultTime}</span>
              </div>
              <div className="p-1.5 sm:p-2 bg-red-50/80 rounded-xl text-[10px] sm:text-[11px] text-red-800 leading-snug">
                <b>Rule:</b> Orders placed now reveal results at <b>{displayResultTime}</b>. Next round begins 15 seconds after reveal!
              </div>
            </div>
          </div>

          {/* 3. TEN NUMBERED BALLS DISPLAY (1 TO 10) */}
          <div className="mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t-2 border-red-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-center sm:text-left mb-2.5 sm:mb-3">
              <div className="flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800">
                  {isRevealWindow ? 'Drawing Numbers (15-Second Window)...' : 'Drawn Numbers Sequence (Positions 1 to 10)'}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                Pos 1 = TOP 1 • Pos 2 = TOP 2
              </span>
            </div>

            {/* 10 Numbered Balls Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2.5">
              {safeBalls.map((num, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const colorClass = BALL_COLORS[num] || 'from-red-600 to-rose-700 text-white border-red-400';

                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center p-1 sm:p-2 rounded-xl sm:rounded-2xl bg-white border-2 ${
                      isTop1
                        ? 'border-red-500 shadow-md ring-2 ring-red-400/40 bg-red-50/50'
                        : isTop2
                        ? 'border-rose-400 shadow-md ring-2 ring-rose-300/40 bg-rose-50/50'
                        : 'border-red-100'
                    } transition-all duration-300 hover:-translate-y-0.5`}
                  >
                    <span className={`text-[8px] sm:text-[10px] font-black mb-0.5 sm:mb-1 ${isTop1 ? 'text-red-700' : isTop2 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {idx === 0 ? 'TOP 1' : idx === 1 ? 'TOP 2' : `#${idx + 1}`}
                    </span>
                    <div
                      className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${colorClass} border-2 flex items-center justify-center font-black text-xs sm:text-xl shadow-sm sm:shadow-lg transform transition-transform hover:scale-110`}
                    >
                      {num}
                    </div>
                    <span className="text-[7px] sm:text-[9px] font-mono font-bold text-slate-500 mt-0.5 sm:mt-1">
                      {num % 2 === 0 ? 'EVEN' : 'ODD'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Previous Round Winning Result Strip */}
            {previousRound && (
              <div className="mt-4 p-3.5 bg-gradient-to-r from-red-50 via-white to-red-50 border-2 border-red-200 rounded-2xl flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-black text-red-800">Previous Round #{previousRound.round_number}:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-black shadow-sm">
                    TOP 1: {previousRound.top1} ({previousRound.top1 >= 6 ? 'BIG' : 'SMALL'} • {previousRound.top1 % 2 === 0 ? 'EVEN' : 'ODD'})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-black shadow-sm">
                    TOP 2: {previousRound.top2} ({previousRound.top2 >= 6 ? 'BIG' : 'SMALL'} • {previousRound.top2 % 2 === 0 ? 'EVEN' : 'ODD'})
                  </span>
                </div>
                <div className="font-mono text-slate-800 font-bold bg-white px-3 py-1 rounded-xl border border-red-200">
                  TOP 1+2 Sum: <b className="text-red-700 text-sm font-black">{previousRound.sum_top1_2}</b> ({previousRound.sum_top1_2 > 11 ? 'BIG' : 'SMALL'} • {previousRound.sum_top1_2 % 2 === 0 ? 'EVEN' : 'ODD'})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FLOATING TOAST NOTIFICATION (TOP OF SCREEN) */}
        {(betSuccessMsg || betErrorMsg) && (
          <div className="fixed top-4 sm:top-5 left-1/2 z-50 w-[92%] sm:w-auto min-w-[280px] max-w-md animate-toast pointer-events-auto">
            {betSuccessMsg && (
              <div className="bg-emerald-950/95 text-white border-2 border-emerald-400/80 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-emerald-950/50 flex items-center justify-between gap-3 ring-4 ring-emerald-500/20">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/40">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Order Successful</p>
                    <p className="text-xs font-bold text-white truncate">{betSuccessMsg}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBetSuccessMsg('')}
                  className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {betErrorMsg && (
              <div className="bg-rose-950/95 text-white border-2 border-rose-400/80 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-rose-950/50 flex items-center justify-between gap-3 ring-4 ring-rose-500/20">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/40">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-rose-400 tracking-wider">Order Alert</p>
                    <p className="text-xs font-bold text-white truncate">{betErrorMsg}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBetErrorMsg('')}
                  className="p-1.5 text-rose-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. MAIN CONTENT GRID: BETTING ENGINE + FAKE LIVE CHAT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT 2 COLUMNS: BETTING WORKSPACE & TABS */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border-2 border-red-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              {/* Tabs Navigation Header */}
              <div className="flex items-center border-b-2 border-red-100 pb-3 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap w-full">
                <button
                  onClick={() => setActiveTab('bet')}
                  className={`flex-1 sm:flex-initial shrink-0 whitespace-nowrap text-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'bet'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'text-slate-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100'
                  }`}
                >
                  Place Bets
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 sm:flex-initial shrink-0 whitespace-nowrap text-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'history'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'text-slate-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100'
                  }`}
                >
                  History 
                  {/* ({historyData?.rounds?.length || 0}) */}
                </button>
                <button
                  onClick={() => setActiveTab('my-bets')}
                  className={`flex-1 sm:flex-initial shrink-0 whitespace-nowrap text-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'my-bets'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'text-slate-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100'
                  }`}
                >
                  My Slips 
                  {/* ({myBetsData?.bets?.length || 0}) */}
                </button>
              </div>

              {/* TAB 1: BETTING SELECTIONS */}
              {activeTab === 'bet' && (
                <div className="space-y-5">
                  {/* Market 1: TOP 1 (First Ball) */}
                  <div className="bg-gradient-to-br from-red-50/50 via-white to-red-50/30 border-2 border-red-100 rounded-3xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shadow">
                          1
                        </span>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          MARKET: TOP 1 (Position 1 Ball)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 bg-white px-2.5 py-1 rounded-xl border border-red-200">
                        Big (6–10) • Small (1–5)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                      {[
                        { key: 'ODD', label: '1, 3, 5, 7, 9', odds: odds.TOP1?.ODD || 1.99 },
                        { key: 'EVEN', label: '2, 4, 6, 8, 10', odds: odds.TOP1?.EVEN || 1.99 },
                        { key: 'BIG', label: '6 to 10', odds: odds.TOP1?.BIG || 1.99 },
                        { key: 'SMALL', label: '1 to 5', odds: odds.TOP1?.SMALL || 1.99 }
                      ].map((item) => {
                        const selIdx = selectedOptions.findIndex(
                          (o) => o.market === 'TOP1' && o.selection === item.key
                        );
                        const isSelected = selIdx !== -1;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectMarketOption('TOP1', item.key)}
                            className={`p-2 sm:p-3 rounded-2xl border-2 text-center transition-all relative flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-500/25 ring-2 ring-red-400'
                                : 'bg-white border-red-100 hover:border-red-300 hover:bg-red-50/50 text-slate-800'
                            } hover:-translate-y-0.5`}
                          >
                            <span className="font-black text-xs sm:text-sm tracking-tight">
                              {item.key}
                            </span>
                            <span className={`font-mono font-black text-[10px] sm:text-xs px-1.5 py-0.5 mt-0.5 rounded-md border ${
                              isSelected ? 'bg-white text-red-700 border-white' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {item.odds}x
                            </span>
                            <p className={`text-[9px] sm:text-[10px] mt-1 font-medium truncate w-full ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                              {item.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Market 2: TOP 1+2 (Sum of Ball 1 & Ball 2) */}
                  <div className="bg-gradient-to-br from-red-50/50 via-white to-red-50/30 border-2 border-red-100 rounded-3xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-xl bg-red-700 text-white font-black text-xs flex items-center justify-center shadow">
                          1+2
                        </span>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          MARKET: TOP 1+2 (Sum of Balls 1 & 2)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 bg-white px-2.5 py-1 rounded-xl border border-red-200">
                        Median: 11
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                      {[
                        { key: 'BIG', label: 'Sum > 11', odds: odds['TOP1+2']?.BIG || 2.127 },
                        { key: 'SMALL', label: 'Sum <= 11', odds: odds['TOP1+2']?.SMALL || 1.893 },
                        { key: 'ODD', label: 'Odd Sum', odds: odds['TOP1+2']?.ODD || 1.99 },
                        { key: 'EVEN', label: 'Even Sum', odds: odds['TOP1+2']?.EVEN || 1.99 }
                      ].map((item) => {
                        const selIdx = selectedOptions.findIndex(
                          (o) => o.market === 'TOP1+2' && o.selection === item.key
                        );
                        const isSelected = selIdx !== -1;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectMarketOption('TOP1+2', item.key)}
                            className={`p-2 sm:p-3 rounded-2xl border-2 text-center transition-all relative flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-500/25 ring-2 ring-red-400'
                                : 'bg-white border-red-100 hover:border-red-300 hover:bg-red-50/50 text-slate-800'
                            } hover:-translate-y-0.5`}
                          >
                            <span className="font-black text-xs sm:text-sm tracking-tight">
                              {item.key}
                            </span>
                            <span className={`font-mono font-black text-[10px] sm:text-xs px-1.5 py-0.5 mt-0.5 rounded-md border ${
                              isSelected ? 'bg-white text-red-700 border-white' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {item.odds}x
                            </span>
                            <p className={`text-[9px] sm:text-[10px] mt-1 font-medium truncate w-full ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                              {item.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Market 3: TOP 2 (Second Ball) */}
                  <div className="bg-gradient-to-br from-red-50/50 via-white to-red-50/30 border-2 border-red-100 rounded-3xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow">
                          2
                        </span>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          MARKET: TOP 2 (Position 2 Ball)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 bg-white px-2.5 py-1 rounded-xl border border-red-200">
                        Big (6–10) • Small (1–5)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                      {[
                        { key: 'ODD', label: '1, 3, 5, 7, 9', odds: odds.TOP2?.ODD || 1.99 },
                        { key: 'EVEN', label: '2, 4, 6, 8, 10', odds: odds.TOP2?.EVEN || 1.99 },
                        { key: 'BIG', label: '6 to 10', odds: odds.TOP2?.BIG || 1.99 },
                        { key: 'SMALL', label: '1 to 5', odds: odds.TOP2?.SMALL || 1.99 }
                      ].map((item) => {
                        const selIdx = selectedOptions.findIndex(
                          (o) => o.market === 'TOP2' && o.selection === item.key
                        );
                        const isSelected = selIdx !== -1;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectMarketOption('TOP2', item.key)}
                            className={`p-2 sm:p-3 rounded-2xl border-2 text-center transition-all relative flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-500/25 ring-2 ring-red-400'
                                : 'bg-white border-red-100 hover:border-red-300 hover:bg-red-50/50 text-slate-800'
                            } hover:-translate-y-0.5`}
                          >
                            <span className="font-black text-xs sm:text-sm tracking-tight">
                              {item.key}
                            </span>
                            <span className={`font-mono font-black text-[10px] sm:text-xs px-1.5 py-0.5 mt-0.5 rounded-md border ${
                              isSelected ? 'bg-white text-red-700 border-white' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {item.odds}x
                            </span>
                            <p className={`text-[9px] sm:text-[10px] mt-1 font-medium truncate w-full ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                              {item.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DIRECT STAKE INPUT (REPLACED AMOUNT BUTTONS) */}
                  <div className="bg-gradient-to-br from-red-50/60 via-white to-red-50/40 border-2 border-red-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Enter Amount (Per Option)</span>
                      </h4>

                      <div className="flex items-center space-x-1.5 bg-red-50/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-red-200 shrink-0">
                        <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold">Available:</span>
                        <span className="font-mono font-black text-xs text-red-700">${balance.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-mono font-black text-base">$</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Enter bet amount (e.g. 50, 100, 500)"
                        value={stake}
                        onChange={(e) => {
                          setStake(e.target.value);
                          setBetErrorMsg('');
                        }}
                        className="w-full pl-8 pr-20 py-3 bg-white border-2 border-red-200 rounded-2xl font-mono text-base font-black text-red-700 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-400/20 shadow-inner transition-all"
                      />
                      {stake && (
                        <button
                          type="button"
                          onClick={() => setStake('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                      <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-500">
                          Selected Options ({selectedOptions.length}/2):
                        </span>
                        {selectedOptions.length === 0 ? (
                          <span className="text-slate-400 italic">No option selected (click 1 or 2 options)</span>
                        ) : (
                          selectedOptions.map((opt, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200"
                            >
                              <span>#{idx + 1}: {opt.market} • {opt.selection} ({odds[opt.market]?.[opt.selection] || 1.99}x)</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveOption(idx);
                                }}
                                className="text-red-500 hover:text-red-800 font-bold ml-0.5"
                                title="Remove option"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="text-slate-600">
                          Stake/Bet: <b className="text-slate-900 font-mono font-black">${activeStake.toLocaleString()}</b>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600">
                          Total Wager: <b className="text-red-700 font-mono font-black">${totalRequiredStake.toLocaleString()}</b>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600">
                          Gross Return: <b className="text-emerald-700 font-mono font-black">${totalGrossPayout}</b>
                        </span>
                        <span className="text-slate-600">
                          Profit: <b className="text-red-700 font-mono font-black">+${totalNetProfit}</b>
                        </span>
                      </div>
                    </div>

                    {/* Direct Order Placement Button */}
                    <button
                      type="button"
                      onClick={handlePlaceBet}
                      disabled={!isBettingOpen || isSubmittingBet || selectedOptions.length === 0 || activeStake <= 0}
                      className="w-full sm:w-auto px-5 sm:px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 shrink-0"
                    >
                      <Flame className="w-4 h-4 text-amber-300" />
                      <span>
                        {!isBettingOpen
                          ? `Drawing Results (${displayRevealLeft}s)`
                          : selectedOptions.length === 0
                          ? 'Select Options (Max 2)'
                          : activeStake <= 0
                          ? 'Enter Bet Amount'
                          : selectedOptions.length === 1
                          ? `Place 1 Bet ($${totalRequiredStake.toLocaleString()})`
                          : `Place 2 Bets ($${totalRequiredStake.toLocaleString()})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: ROUND HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-red-600" />
                      <span>Past Round Results History</span>
                    </h3>
                    <button
                      onClick={() => refetchHistory()}
                      className="text-xs text-red-700 hover:text-red-900 font-bold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border-2 border-red-100 rounded-2xl">
                    <table className="w-full min-w-[580px] text-xs text-left">
                      <thead className="bg-red-50 text-red-800 font-black uppercase text-[10px] tracking-wider border-b border-red-200">
                        <tr>
                          <th className="py-3 px-3">Round ID</th>
                          <th className="py-3 px-3">Drawn 10 Numbers</th>
                          <th className="py-3 px-3">TOP 1</th>
                          <th className="py-3 px-3">TOP 2</th>
                          <th className="py-3 px-3">TOP 1+2 Sum</th>
                          <th className="py-3 px-3">Settled At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 font-mono">
                        {historyData?.rounds?.map((r) => {
                          const drawnArr = parseDrawnNumbers(r.drawn_numbers);
                          return (
                            <tr key={r.id} className="hover:bg-red-50/50 transition-colors">
                              <td className="py-3 px-3 font-bold text-red-700">#{r.round_number}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1">
                                  {drawnArr.map((n, i) => (
                                    <span
                                      key={i}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                        i === 0
                                          ? 'bg-red-600 text-white shadow'
                                          : i === 1
                                          ? 'bg-rose-500 text-white shadow'
                                          : 'bg-slate-200 text-slate-800'
                                      }`}
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-red-700 font-bold">{r.top1}</span>
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({r.top1 >= 6 ? 'BIG' : 'SMALL'} • {r.top1 % 2 === 0 ? 'EVEN' : 'ODD'})
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-rose-600 font-bold">{r.top2}</span>
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({r.top2 >= 6 ? 'BIG' : 'SMALL'} • {r.top2 % 2 === 0 ? 'EVEN' : 'ODD'})
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-slate-900 font-black">{r.sum_top1_2}</span>
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({r.sum_top1_2 > 11 ? 'BIG' : 'SMALL'} • {r.sum_top1_2 % 2 === 0 ? 'EVEN' : 'ODD'})
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-500 text-[11px]">
                                {new Date(r.created_at || r.end_time).toLocaleTimeString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: MY BET SLIPS */}
              {activeTab === 'my-bets' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-red-600" />
                      <span>My Lotto Bets & Wager History</span>
                    </h3>
                    <button
                      onClick={() => refetchMyBets()}
                      className="text-xs text-red-700 hover:text-red-900 font-bold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {myBetsData?.bets?.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-red-50/40 rounded-2xl border-2 border-dashed border-red-100">
                      No bets placed yet. Select a market above to submit your first 3-minute order!
                    </div>
                  ) : (
                    <div className="divide-y divide-red-100">
                      {myBetsData?.bets?.map((bet) => (
                        <div key={bet.id} className="py-3.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-red-700 font-mono">#{bet.round_number}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                                {bet.market} • {bet.selection}
                              </span>
                              <span className="text-slate-500 font-mono">({bet.odds}x)</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Stake: <b className="text-slate-800 font-mono">${bet.stake}</b> • Placed at {new Date(bet.created_at).toLocaleTimeString()}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase font-mono ${
                                bet.status === 'WON'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : bet.status === 'LOST'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {bet.status}
                            </span>
                            <p className="font-mono font-black mt-1">
                              {bet.status === 'WON' && (
                                <span className="text-emerald-700">+${bet.payout?.toLocaleString()}</span>
                              )}
                              {bet.status === 'LOST' && (
                                <span className="text-rose-700">-${bet.stake?.toLocaleString()}</span>
                              )}
                              {bet.status === 'PENDING' && (
                                <span className="text-amber-700">Pot. ${bet.potential_payout}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 1 COLUMN: FAKE LIVE CHAT PANEL (RED & WHITE THEME) */}
          <div className="space-y-5">
            <div className="bg-white border-2 border-red-200 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col h-[420px] lg:h-[680px]">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b-2 border-red-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Live Player Community
                    </h3>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-bold text-emerald-600">
                        {onlineCount.toLocaleString()} Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Feed */}
              <div
                ref={chatScrollContainerRef}
                className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs scrollbar-thin"
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      msg.isSelf
                        ? 'bg-red-50 border-red-200 ml-4'
                        : 'bg-white border-red-100 hover:border-red-200 mr-2'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-sm">
                          {msg.user.charAt(0).toUpperCase()}
                        </span>
                        <span className={`font-black text-[11px] truncate max-w-[110px] ${msg.isSelf ? 'text-red-700' : 'text-slate-800'}`}>
                          {msg.user}
                        </span>
                        {msg.isVip && (
                          <span className="text-[9px] font-black uppercase bg-amber-400 text-slate-950 px-1 rounded">
                            VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">{msg.time}</span>
                    </div>
                    <p className="text-slate-700 text-[11px] pl-6 leading-relaxed break-words font-medium">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat Input Box */}
              <form onSubmit={handleSendChatMessage} className="pt-3 border-t-2 border-red-100 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Share prediction or cheer..."
                    className="flex-1 px-3.5 py-2.5 bg-red-50/50 border-2 border-red-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md transition-all hover:scale-105 active:scale-95 shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
                  Chat is live with verified active players
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Lotto 99 Order"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50/60 border-2 border-red-200 rounded-2xl space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Round ID:</span>
              <span className="font-mono font-black text-red-700">#{currentRound?.roundNumber}</span>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-slate-600 block font-semibold">Selected Options ({selectedOptions.length}):</span>
              {selectedOptions.map((opt, i) => {
                const optOdds = odds[opt.market]?.[opt.selection] || 1.99;
                return (
                  <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-red-200 shadow-xs font-mono">
                    <span className="font-black text-slate-800">
                      #{i + 1}: {opt.market} • {opt.selection}
                    </span>
                    <span className="text-red-700 font-bold">
                      {optOdds}x (${activeStake.toLocaleString()})
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between border-t border-red-200 pt-2 font-mono">
              <span className="text-slate-600 font-sans">Total Stake:</span>
              <span className="font-black text-slate-900">${totalRequiredStake.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600 font-sans">Total Gross Return:</span>
              <span className="font-black text-emerald-700">${totalGrossPayout}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600 font-sans">Potential Profit:</span>
              <span className="font-black text-emerald-600">+${totalNetProfit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Estimated Result Time:</span>
              <span className="font-mono font-black text-red-700">{displayResultTime}</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={isSubmittingBet}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
            >
              {isSubmittingBet ? 'Submitting...' : `Confirm Order ($${totalRequiredStake.toLocaleString()})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. ZERO BALANCE MODAL */}
      <NoPointsNotificationModal
        isOpen={isNoPointsModalOpen}
        onClose={() => setIsNoPointsModalOpen(false)}
        currentBalance={balance}
        requiredAmount={totalRequiredStake}
      />
    </div>
  );
}
