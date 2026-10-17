const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('USER'));

// Configurable Market Odds
const MARKET_ODDS = {
  TOP1: {
    ODD: 1.99,
    EVEN: 1.99,
    BIG: 1.99,
    SMALL: 1.99
  },
  TOP2: {
    ODD: 1.99,
    EVEN: 1.99,
    BIG: 1.99,
    SMALL: 1.99
  },
  'TOP1+2': {
    BIG: 2.127,
    SMALL: 1.893,
    ODD: 1.99,
    EVEN: 1.99
  }
};

// Fixed 3-Minute Wall-Clock Cycle Constants
const INTERVAL_MS = 3 * 60 * 1000; // 3 minutes = 180,000 ms
const REVEAL_WINDOW_MS = 15 * 1000; // 15 seconds display window after 3 min mark

// Helper: Get user's point account
function getUserAccount(userId) {
  let account = db.prepare("SELECT * FROM point_accounts WHERE owner_id = ?").get(userId);
  if (!account) {
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    const role = user ? user.role : 'USER';
    const res = db.prepare(`
      INSERT INTO point_accounts (owner_id, owner_type, balance, total_received, total_distributed)
      VALUES (?, ?, 0, 0, 0)
    `).run(userId, role);
    account = db.prepare("SELECT * FROM point_accounts WHERE id = ?").get(res.lastInsertRowid);
  }
  return account;
}

// Cryptographically secure permutation of numbers 1..10
function generateLottoPermutation() {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = nums.length - 1; i > 0; i--) {
    const rand = crypto.randomBytes(4).readUInt32BE(0);
    const j = rand % (i + 1);
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

// Format sequential round number based on target end time (480 periods per day for 3-minute cycle)
function getRoundNumberForEndTime(endTimeMs) {
  const d = new Date(endTimeMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const totalMinutes = (d.getHours() * 60) + d.getMinutes();
  const period = Math.floor(totalMinutes / 3);
  const periodNum = period === 0 ? 480 : period;
  return `${dateStr}-${String(periodNum).padStart(4, '0')}`;
}

// Format human-readable time string: "3:50 PM"
function formatHumanTime(timestampMs) {
  const d = new Date(timestampMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Settle a round at endTime
function settleRound(roundId) {
  const round = db.prepare("SELECT * FROM lotto_rounds WHERE id = ?").get(roundId);
  if (!round || round.status === 'COMPLETED') return;

  const drawn = generateLottoPermutation();
  const top1 = drawn[0];
  const top2 = drawn[1];
  const sumTop1_2 = top1 + top2;

  const pendingBets = db.prepare("SELECT * FROM lotto_bets WHERE round_id = ? AND status = 'PENDING'").all(roundId);

  const settleTxn = db.transaction(() => {
    // 1. Mark round as COMPLETED with winning balls
    db.prepare(`
      UPDATE lotto_rounds
      SET status = 'COMPLETED',
          drawn_numbers = ?,
          top1 = ?,
          top2 = ?,
          sum_top1_2 = ?
      WHERE id = ?
    `).run(JSON.stringify(drawn), top1, top2, sumTop1_2, roundId);

    // 2. Settle all pending bets
    for (const bet of pendingBets) {
      let isWin = false;

      if (bet.market === 'TOP1') {
        if (bet.selection === 'ODD' && top1 % 2 !== 0) isWin = true;
        if (bet.selection === 'EVEN' && top1 % 2 === 0) isWin = true;
        if (bet.selection === 'BIG' && top1 >= 6) isWin = true;
        if (bet.selection === 'SMALL' && top1 <= 5) isWin = true;
      } else if (bet.market === 'TOP2') {
        if (bet.selection === 'ODD' && top2 % 2 !== 0) isWin = true;
        if (bet.selection === 'EVEN' && top2 % 2 === 0) isWin = true;
        if (bet.selection === 'BIG' && top2 >= 6) isWin = true;
        if (bet.selection === 'SMALL' && top2 <= 5) isWin = true;
      } else if (bet.market === 'TOP1+2') {
        if (bet.selection === 'BIG' && sumTop1_2 > 11) isWin = true;
        if (bet.selection === 'SMALL' && sumTop1_2 <= 11) isWin = true;
        if (bet.selection === 'ODD' && sumTop1_2 % 2 !== 0) isWin = true;
        if (bet.selection === 'EVEN' && sumTop1_2 % 2 === 0) isWin = true;
      }

      if (isWin) {
        const payout = Math.floor(bet.stake * bet.odds);
        const netProfit = payout - bet.stake;

        // Credit point account
        db.prepare("UPDATE point_accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE owner_id = ? AND owner_type = 'USER'")
          .run(payout, bet.user_id);

        // Update bet record
        db.prepare(`
          UPDATE lotto_bets
          SET status = 'WON', payout = ?, net_profit = ?, settled_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(payout, netProfit, bet.id);

        // Log into casino_bets for aggregate user stats
        db.prepare(`
          INSERT INTO casino_bets (user_id, game_type, bet_amount, multiplier, payout, net_profit, result, details)
          VALUES (?, 'LOTTO', ?, ?, ?, ?, 'WIN', ?)
        `).run(
          bet.user_id,
          bet.stake,
          bet.odds,
          payout,
          netProfit,
          JSON.stringify({ roundNumber: bet.round_number, market: bet.market, selection: bet.selection, drawn, top1, top2, sumTop1_2 })
        );
      } else {
        const netProfit = -bet.stake;

        db.prepare(`
          UPDATE lotto_bets
          SET status = 'LOST', payout = 0, net_profit = ?, settled_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(netProfit, bet.id);

        db.prepare(`
          INSERT INTO casino_bets (user_id, game_type, bet_amount, multiplier, payout, net_profit, result, details)
          VALUES (?, 'LOTTO', ?, 0, 0, ?, 'LOSS', ?)
        `).run(
          bet.user_id,
          bet.stake,
          netProfit,
          JSON.stringify({ roundNumber: bet.round_number, market: bet.market, selection: bet.selection, drawn, top1, top2, sumTop1_2 })
        );
      }
    }
  });

  settleTxn();
}

// Ensure a round record exists for a specific end time
function ensureRoundForEndTime(endTimeMs) {
  const roundNumber = getRoundNumberForEndTime(endTimeMs);
  let round = db.prepare("SELECT * FROM lotto_rounds WHERE round_number = ?").get(roundNumber);

  if (!round) {
    const startTime = endTimeMs - INTERVAL_MS + REVEAL_WINDOW_MS;
    const res = db.prepare(`
      INSERT INTO lotto_rounds (
        round_number, duration_seconds, start_time, bet_end_time, end_time, status
      ) VALUES (?, 180, ?, ?, ?, 'OPEN')
    `).run(roundNumber, startTime, endTimeMs, endTimeMs);
    round = db.prepare("SELECT * FROM lotto_rounds WHERE id = ?").get(res.lastInsertRowid);
  }
  return round;
}

// Seed initial history if table is empty
function seedInitialHistoryIfNeeded() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM lotto_rounds").get().cnt;
  if (count === 0) {
    const now = Date.now();
    const prev3Min = Math.floor(now / INTERVAL_MS) * INTERVAL_MS;
    for (let i = 15; i >= 1; i--) {
      const slotEnd = prev3Min - (i * INTERVAL_MS);
      const drawn = generateLottoPermutation();
      const top1 = drawn[0];
      const top2 = drawn[1];
      const sum = top1 + top2;
      const rNum = getRoundNumberForEndTime(slotEnd);

      db.prepare(`
        INSERT INTO lotto_rounds (
          round_number, duration_seconds, start_time, bet_end_time, end_time,
          status, drawn_numbers, top1, top2, sum_top1_2
        ) VALUES (?, 180, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
      `).run(
        rNum,
        slotEnd - INTERVAL_MS,
        slotEnd,
        slotEnd,
        JSON.stringify(drawn),
        top1,
        top2,
        sum
      );
    }
  }
}

// Master wall-clock round state calculator
function getWallClockGameState(now = Date.now()) {
  seedInitialHistoryIfNeeded();

  // Next 3-minute wall-clock boundary: e.g. at 3:47:00 -> 3:50:00
  const currentIntervalStart = Math.floor(now / INTERVAL_MS) * INTERVAL_MS;
  const currentIntervalEnd = currentIntervalStart + INTERVAL_MS;
  const timeSinceIntervalStart = now - currentIntervalStart;

  // 1. Settle any expired rounds before now
  const uncompletedPastRounds = db.prepare(`
    SELECT id FROM lotto_rounds
    WHERE status != 'COMPLETED' AND end_time <= ?
  `).all(now);

  for (const past of uncompletedPastRounds) {
    settleRound(past.id);
  }

  // 2. Check if we are in the 15-second reveal window (e.g. 3:50:00 to 3:50:15)
  const isRevealWindow = timeSinceIntervalStart < REVEAL_WINDOW_MS;

  if (isRevealWindow) {
    // Round that concluded at currentIntervalStart (3:50:00) is displaying results!
    const concludedEndTime = currentIntervalStart;
    let concludedRound = db.prepare("SELECT * FROM lotto_rounds WHERE round_number = ?").get(getRoundNumberForEndTime(concludedEndTime));
    if (!concludedRound) {
      concludedRound = ensureRoundForEndTime(concludedEndTime);
      settleRound(concludedRound.id);
      concludedRound = db.prepare("SELECT * FROM lotto_rounds WHERE id = ?").get(concludedRound.id);
    } else if (concludedRound.status !== 'COMPLETED') {
      settleRound(concludedRound.id);
      concludedRound = db.prepare("SELECT * FROM lotto_rounds WHERE id = ?").get(concludedRound.id);
    }

    const revealTimeLeft = Math.max(0, Math.ceil((REVEAL_WINDOW_MS - timeSinceIntervalStart) / 1000));
    const nextGameStartTime = currentIntervalStart + REVEAL_WINDOW_MS;
    const nextGameEndTime = currentIntervalEnd;

    // Ensure next round is also pre-created in database
    ensureRoundForEndTime(nextGameEndTime);

    return {
      round: concludedRound,
      isRevealWindow: true,
      bettingOpen: false,
      timeLeft: 0,
      revealTimeLeft,
      resultTime: concludedEndTime,
      nextResultTime: nextGameEndTime,
      nextResultTimeFormatted: formatHumanTime(nextGameEndTime),
      resultTimeFormatted: formatHumanTime(concludedEndTime)
    };
  } else {
    // Normal betting window for round ending at currentIntervalEnd (e.g. 3:55:00)!
    const activeEndTime = currentIntervalEnd;
    const activeRound = ensureRoundForEndTime(activeEndTime);
    const timeLeft = Math.max(0, Math.ceil((activeEndTime - now) / 1000));

    return {
      round: activeRound,
      isRevealWindow: false,
      bettingOpen: true,
      timeLeft,
      revealTimeLeft: 0,
      resultTime: activeEndTime,
      resultTimeFormatted: formatHumanTime(activeEndTime),
      nextResultTime: activeEndTime + INTERVAL_MS,
      nextResultTimeFormatted: formatHumanTime(activeEndTime + INTERVAL_MS)
    };
  }
}

// Background ticker to advance rounds seamlessly
setInterval(() => {
  try {
    getWallClockGameState();
  } catch (err) {
    console.error('Lotto ticker error:', err.message);
  }
}, 1000);

/**
 * 1. GET CURRENT GAME STATE & ROUND INFO
 */
router.get('/current-round', (req, res) => {
  const userId = req.user.id;
  const userAccount = getUserAccount(userId);
  const now = Date.now();
  const gameState = getWallClockGameState(now);

  // Most recent completed round
  const previousRound = db.prepare(`
    SELECT * FROM lotto_rounds
    WHERE status = 'COMPLETED'
    ORDER BY end_time DESC, id DESC LIMIT 1
  `).get();

  if (previousRound && previousRound.drawn_numbers) {
    try {
      previousRound.drawn_numbers = JSON.parse(previousRound.drawn_numbers);
    } catch (e) {}
  }

  // Recent 20 completed rounds
  const recentHistory = db.prepare(`
    SELECT id, round_number, top1, top2, sum_top1_2, drawn_numbers, end_time, created_at
    FROM lotto_rounds
    WHERE status = 'COMPLETED'
    ORDER BY end_time DESC, id DESC LIMIT 20
  `).all().map(r => {
    try {
      r.drawn_numbers = JSON.parse(r.drawn_numbers);
    } catch (e) {}
    return r;
  });

  // User's active bets for the current round
  const myActiveBets = db.prepare(`
    SELECT * FROM lotto_bets
    WHERE user_id = ? AND round_id = ?
    ORDER BY id DESC
  `).all(userId, gameState.round.id);

  return res.json({
    currentRound: {
      id: gameState.round.id,
      roundNumber: gameState.round.round_number,
      status: gameState.isRevealWindow ? 'DRAWING' : 'OPEN',
      durationSeconds: 180,
      timeLeft: gameState.timeLeft,
      revealTimeLeft: gameState.revealTimeLeft,
      isRevealWindow: gameState.isRevealWindow,
      bettingOpen: gameState.bettingOpen,
      resultTime: gameState.resultTime,
      resultTimeFormatted: gameState.resultTimeFormatted,
      nextResultTimeFormatted: gameState.nextResultTimeFormatted,
      serverTime: now
    },
    previousRound,
    recentHistory,
    myActiveBets,
    odds: MARKET_ODDS,
    userBalance: userAccount.balance
  });
});

/**
 * 2. PLACE A BET ON A LOTTO MARKET (Supports up to 2 options at a time)
 */
router.post('/bet', (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  const gameState = getWallClockGameState(now);

  if (gameState.isRevealWindow || !gameState.bettingOpen) {
    return res.status(400).json({
      error: `Current game is showing results! Next 3-minute game will open in ${gameState.revealTimeLeft}s.`,
      bettingClosed: true
    });
  }

  const round = gameState.round;

  // Normalize input into an array of bets (allows 1 or 2 options)
  let rawBets = [];
  if (Array.isArray(req.body.bets) && req.body.bets.length > 0) {
    rawBets = req.body.bets;
  } else if (req.body.market && req.body.selection) {
    rawBets = [{
      market: req.body.market,
      selection: req.body.selection,
      stake: req.body.stake,
      idempotencyKey: req.body.idempotencyKey
    }];
  }

  if (rawBets.length === 0) {
    return res.status(400).json({ error: 'Please select at least 1 option (up to 2 options).' });
  }

  if (rawBets.length > 2) {
    return res.status(400).json({ error: 'You can select at most 2 options at a time.' });
  }

  const validMarkets = ['TOP1', 'TOP2', 'TOP1+2'];
  const validSelections = ['ODD', 'EVEN', 'BIG', 'SMALL'];
  const processedBets = [];
  let totalStake = 0;

  for (const b of rawBets) {
    const cleanMarket = (b.market || '').trim();
    const cleanSelection = (b.selection || '').trim();
    const parsedStake = parseInt(b.stake, 10);

    if (isNaN(parsedStake) || parsedStake <= 0) {
      return res.status(400).json({ error: 'Stake must be a positive integer.' });
    }

    if (!validMarkets.includes(cleanMarket)) {
      return res.status(400).json({ error: `Invalid market. Must be one of: ${validMarkets.join(', ')}` });
    }

    if (!validSelections.includes(cleanSelection)) {
      return res.status(400).json({ error: `Invalid selection. Must be one of: ${validSelections.join(', ')}` });
    }

    const odds = MARKET_ODDS[cleanMarket]?.[cleanSelection];
    if (!odds) {
      return res.status(400).json({ error: 'Market selection odds not configured.' });
    }

    const potentialPayout = parseFloat((parsedStake * odds).toFixed(2));
    const potentialProfit = parseFloat((potentialPayout - parsedStake).toFixed(2));

    processedBets.push({
      market: cleanMarket,
      selection: cleanSelection,
      stake: parsedStake,
      odds,
      potentialPayout,
      potentialProfit,
      idempotencyKey: b.idempotencyKey || null
    });

    totalStake += parsedStake;
  }

  // Check User Balance
  const account = getUserAccount(userId);
  if (account.balance < totalStake) {
    return res.status(400).json({
      error: `Insufficient balance! You have $${account.balance.toLocaleString()}. Required: $${totalStake.toLocaleString()}.`,
      noPoints: true,
      currentBalance: account.balance
    });
  }

  // Prevent duplicate idempotency if single bet has key
  for (const pb of processedBets) {
    if (pb.idempotencyKey) {
      const existing = db.prepare("SELECT * FROM lotto_bets WHERE idempotency_key = ?").get(pb.idempotencyKey);
      if (existing) {
        return res.json({
          success: true,
          message: 'Bet already recorded.',
          betId: existing.id,
          newBalance: account.balance
        });
      }
    }
  }

  // Atomic bet transaction
  const executeBets = db.transaction(() => {
    // 1. Deduct total stake
    db.prepare(`
      UPDATE point_accounts
      SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalStake, account.id);

    const createdBets = [];

    // 2. Insert each bet
    for (const pb of processedBets) {
      const betRes = db.prepare(`
        INSERT INTO lotto_bets (
          user_id, round_id, round_number, market, selection, stake, odds,
          potential_payout, status, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `).run(
        userId,
        round.id,
        round.round_number,
        pb.market,
        pb.selection,
        pb.stake,
        pb.odds,
        pb.potentialPayout,
        pb.idempotencyKey
      );

      createdBets.push({
        id: betRes.lastInsertRowid,
        roundNumber: round.round_number,
        market: pb.market,
        selection: pb.selection,
        stake: pb.stake,
        odds: pb.odds,
        potentialPayout: pb.potentialPayout,
        potentialProfit: pb.potentialProfit,
        status: 'PENDING',
        resultTimeFormatted: gameState.resultTimeFormatted
      });
    }

    const updatedAccount = db.prepare("SELECT balance FROM point_accounts WHERE id = ?").get(account.id);

    return {
      bets: createdBets,
      newBalance: updatedAccount.balance
    };
  });

  try {
    const result = executeBets();
    const count = result.bets.length;
    const betDescriptions = result.bets.map(b => `${b.market} [${b.selection}] ($${b.stake})`).join(' & ');

    return res.json({
      success: true,
      message: `${count === 1 ? 'Bet' : '2 Bets'} placed! ${betDescriptions}. Result at ${gameState.resultTimeFormatted}!`,
      bets: result.bets,
      bet: result.bets[0],
      newBalance: result.newBalance
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to place bet.' });
  }
});

/**
 * 3. INSTANT DEMO FUNDS REFILL FOR TESTING
 */
router.post('/refill-demo', (req, res) => {
  const userId = req.user.id;
  const account = getUserAccount(userId);
  const refillAmount = 5000;

  db.prepare(`
    UPDATE point_accounts
    SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(refillAmount, account.id);

  const updated = db.prepare("SELECT balance FROM point_accounts WHERE id = ?").get(account.id);

  return res.json({
    success: true,
    message: `Added +$${refillAmount.toLocaleString()} demo funds to your account!`,
    newBalance: updated.balance
  });
});

/**
 * 4. GET HISTORICAL ROUNDS
 */
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const rounds = db.prepare(`
    SELECT * FROM lotto_rounds
    WHERE status = 'COMPLETED'
    ORDER BY end_time DESC, id DESC LIMIT ?
  `).all(limit).map(r => {
    try {
      r.drawn_numbers = JSON.parse(r.drawn_numbers);
    } catch (e) {}
    return r;
  });

  return res.json({ rounds });
});

/**
 * 5. GET USER'S LOTTO BET HISTORY
 */
router.get('/my-bets', (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const bets = db.prepare(`
    SELECT * FROM lotto_bets
    WHERE user_id = ?
    ORDER BY id DESC LIMIT ?
  `).all(userId, limit);

  return res.json({ bets });
});

module.exports = router;
