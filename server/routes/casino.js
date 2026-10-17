const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('USER'));

// Helper to get or create point account
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

/**
 * 1. GET CASINO USER STATS & RECENT BETS
 */
router.get('/stats', (req, res) => {
  const userId = req.user.id;
  const account = getUserAccount(userId);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalBets,
      COALESCE(SUM(bet_amount), 0) as totalWagered,
      COALESCE(SUM(payout), 0) as totalWon,
      COALESCE(SUM(net_profit), 0) as netProfit,
      COALESCE(MAX(payout), 0) as biggestWin,
      COALESCE(SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END), 0) as winCount
    FROM casino_bets
    WHERE user_id = ?
  `).get(userId);

  const recentBets = db.prepare(`
    SELECT *
    FROM casino_bets
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 25
  `).all(userId);

  const totalBets = stats.totalBets || 0;
  const winCount = stats.winCount || 0;
  const winRate = totalBets > 0 ? Math.round((winCount / totalBets) * 100) : 0;

  return res.json({
    balance: account.balance,
    stats: {
      ...stats,
      winRate
    },
    recentBets
  });
});

/**
 * 2. EXECUTE CASINO BET (SLOTS, ROULETTE, CRASH, BLACKJACK, DICE, COINFLIP)
 */
router.post('/bet', (req, res) => {
  const userId = req.user.id;
  const { gameType, betAmount, gameData = {} } = req.body;

  const parsedBet = parseInt(betAmount, 10);
  if (isNaN(parsedBet) || parsedBet <= 0) {
    return res.status(400).json({ error: 'Bet amount must be a positive integer.' });
  }

  // Check user account
  const account = getUserAccount(userId);
  if (account.balance < parsedBet) {
    return res.status(400).json({
      error: `You don't have enough balance to play! Available balance is $${account.balance.toLocaleString()}. Please deposit to continue playing.`,
      noPoints: true,
      currentBalance: account.balance
    });
  }

  let multiplier = 0;
  let payout = 0;
  let result = 'LOSS';
  let details = {};

  // ===================== 1. SLOTS LOGIC =====================
  if (gameType === 'SLOTS') {
    const symbols = [
      { id: 'SEVEN', icon: '7️⃣', weight: 4, label: 'Lucky 7' },
      { id: 'DIAMOND', icon: '💎', weight: 7, label: 'Diamond' },
      { id: 'BELL', icon: '🔔', weight: 11, label: 'Bell' },
      { id: 'CHERRY', icon: '🍒', weight: 16, label: 'Cherry' },
      { id: 'LEMON', icon: '🍋', weight: 22, label: 'Lemon' },
      { id: 'GRAPE', icon: '🍇', weight: 25, label: 'Grape' },
      { id: 'STAR', icon: '⭐', weight: 30, label: 'Star' }
    ];

    const pickSymbol = () => {
      const totalWeight = symbols.reduce((acc, s) => acc + s.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const s of symbols) {
        if (rand < s.weight) return s;
        rand -= s.weight;
      }
      return symbols[symbols.length - 1];
    };

    const reel1 = pickSymbol();
    const reel2 = pickSymbol();
    const reel3 = pickSymbol();

    details = {
      reels: [reel1, reel2, reel3],
      icons: [reel1.icon, reel2.icon, reel3.icon]
    };

    // Payout table
    if (reel1.id === reel2.id && reel2.id === reel3.id) {
      // 3 Matching
      if (reel1.id === 'SEVEN') multiplier = 50;
      else if (reel1.id === 'DIAMOND') multiplier = 25;
      else if (reel1.id === 'BELL') multiplier = 15;
      else if (reel1.id === 'CHERRY') multiplier = 10;
      else if (reel1.id === 'LEMON') multiplier = 6;
      else if (reel1.id === 'GRAPE') multiplier = 4;
      else if (reel1.id === 'STAR') multiplier = 3;
    } else if (reel1.id === reel2.id || reel2.id === reel3.id || reel1.id === reel3.id) {
      // 2 Matching
      const matched = reel1.id === reel2.id ? reel1.id : reel3.id;
      if (matched === 'SEVEN') multiplier = 5;
      else if (matched === 'DIAMOND') multiplier = 3;
      else if (matched === 'BELL') multiplier = 2;
      else if (matched === 'CHERRY') multiplier = 2;
      else multiplier = 1.5;
    } else if (reel1.id === 'CHERRY' || reel2.id === 'CHERRY' || reel3.id === 'CHERRY') {
      multiplier = 1.0; // 1 Cherry payback
    }

    payout = Math.floor(parsedBet * multiplier);
    result = payout > 0 ? (multiplier >= 1 ? 'WIN' : 'LOSS') : 'LOSS';
  }

  // ===================== 2. ROULETTE LOGIC =====================
  else if (gameType === 'ROULETTE') {
    const winningNumber = Math.floor(Math.random() * 37); // 0 to 36
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const isRed = redNumbers.includes(winningNumber);
    const isBlack = winningNumber !== 0 && !isRed;
    const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
    const isOdd = winningNumber % 2 !== 0;
    const isLow = winningNumber >= 1 && winningNumber <= 18;
    const isHigh = winningNumber >= 19 && winningNumber <= 36;
    const isDozen1 = winningNumber >= 1 && winningNumber <= 12;
    const isDozen2 = winningNumber >= 13 && winningNumber <= 24;
    const isDozen3 = winningNumber >= 25 && winningNumber <= 36;

    const betType = gameData.betType || 'RED';
    const chosenNumber = gameData.chosenNumber !== undefined ? parseInt(gameData.chosenNumber, 10) : null;

    let won = false;
    if (betType === 'RED' && isRed) { won = true; multiplier = 2; }
    else if (betType === 'BLACK' && isBlack) { won = true; multiplier = 2; }
    else if (betType === 'EVEN' && isEven) { won = true; multiplier = 2; }
    else if (betType === 'ODD' && isOdd) { won = true; multiplier = 2; }
    else if (betType === 'LOW' && isLow) { won = true; multiplier = 2; }
    else if (betType === 'HIGH' && isHigh) { won = true; multiplier = 2; }
    else if (betType === 'DOZEN_1' && isDozen1) { won = true; multiplier = 3; }
    else if (betType === 'DOZEN_2' && isDozen2) { won = true; multiplier = 3; }
    else if (betType === 'DOZEN_3' && isDozen3) { won = true; multiplier = 3; }
    else if (betType === 'NUMBER' && chosenNumber === winningNumber) { won = true; multiplier = 36; }

    payout = won ? Math.floor(parsedBet * multiplier) : 0;
    result = won ? 'WIN' : 'LOSS';
    details = {
      winningNumber,
      color: winningNumber === 0 ? 'GREEN' : isRed ? 'RED' : 'BLACK',
      betType,
      chosenNumber
    };
  }

  // ===================== 3. CRASH ROCKET LOGIC =====================
  else if (gameType === 'CRASH') {
    const targetMultiplier = parseFloat(gameData.targetMultiplier) || 2.0;

    // Provably fair distribution: E = 100 / (100 - X) with house edge
    const r = Math.random();
    let crashPoint = 1.0;
    if (r > 0.04) {
      // 96% of the time, crash point is >= 1.01
      crashPoint = Math.max(1.0, parseFloat((0.96 / (1 - r)).toFixed(2)));
    } else {
      crashPoint = 1.0; // Instant bust at 1.00x
    }

    const won = targetMultiplier <= crashPoint;
    multiplier = won ? targetMultiplier : 0;
    payout = won ? Math.floor(parsedBet * multiplier) : 0;
    result = won ? 'WIN' : 'LOSS';
    details = {
      targetMultiplier,
      crashPoint,
      cashedOut: won
    };
  }

  // ===================== 4. DICE ROLL LOGIC =====================
  else if (gameType === 'DICE') {
    const rollTarget = parseInt(gameData.rollTarget, 10) || 50; // roll over this number (1-98)
    const clampedTarget = Math.max(5, Math.min(95, rollTarget));
    const winChance = 100 - clampedTarget;
    const computedMultiplier = parseFloat(((98 / winChance)).toFixed(2));

    const rolledNumber = Math.floor(Math.random() * 100) + 1; // 1 to 100
    const won = rolledNumber > clampedTarget;

    multiplier = won ? computedMultiplier : 0;
    payout = won ? Math.floor(parsedBet * multiplier) : 0;
    result = won ? 'WIN' : 'LOSS';
    details = {
      rolledNumber,
      rollTarget: clampedTarget,
      winChance,
      multiplier: computedMultiplier
    };
  }

  // ===================== 5. COIN FLIP LOGIC =====================
  else if (gameType === 'COINFLIP') {
    const chosenSide = gameData.chosenSide === 'TAILS' ? 'TAILS' : 'HEADS';
    const flippedSide = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const won = chosenSide === flippedSide;

    multiplier = won ? 2.0 : 0;
    payout = won ? Math.floor(parsedBet * 2) : 0;
    result = won ? 'WIN' : 'LOSS';
    details = {
      chosenSide,
      flippedSide
    };
  }

  // ===================== 6. BLACKJACK LOGIC =====================
  else if (gameType === 'BLACKJACK') {
    // Generate card deck
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [
      { name: '2', val: 2 }, { name: '3', val: 3 }, { name: '4', val: 4 },
      { name: '5', val: 5 }, { name: '6', val: 6 }, { name: '7', val: 7 },
      { name: '8', val: 8 }, { name: '9', val: 9 }, { name: '10', val: 10 },
      { name: 'J', val: 10 }, { name: 'Q', val: 10 }, { name: 'K', val: 10 },
      { name: 'A', val: 11 }
    ];

    const drawCard = () => {
      const v = values[Math.floor(Math.random() * values.length)];
      const s = suits[Math.floor(Math.random() * suits.length)];
      return { label: `${v.name}${s}`, value: v.val, name: v.name };
    };

    const calcHandScore = (hand) => {
      let sum = 0;
      let aces = 0;
      hand.forEach(c => {
        sum += c.value;
        if (c.name === 'A') aces++;
      });
      while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
      }
      return sum;
    };

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    let playerScore = calcHandScore(playerHand);
    let dealerScore = calcHandScore(dealerHand);

    // If player action is provided (like auto play simulation or client choice)
    // Standard simulation: Dealer draws until >= 17
    while (dealerScore < 17) {
      dealerHand.push(drawCard());
      dealerScore = calcHandScore(dealerHand);
    }

    const playerBlackjack = playerHand.length === 2 && playerScore === 21;
    const dealerBlackjack = dealerHand.length === 2 && dealerScore === 21;

    if (playerBlackjack && !dealerBlackjack) {
      result = 'WIN';
      multiplier = 2.5;
    } else if (playerScore > 21) {
      result = 'LOSS';
      multiplier = 0;
    } else if (dealerScore > 21 || playerScore > dealerScore) {
      result = 'WIN';
      multiplier = 2.0;
    } else if (playerScore === dealerScore) {
      result = 'PUSH';
      multiplier = 1.0;
    } else {
      result = 'LOSS';
      multiplier = 0;
    }

    payout = Math.floor(parsedBet * multiplier);
    details = {
      playerHand,
      dealerHand,
      playerScore,
      dealerScore,
      playerBlackjack,
      dealerBlackjack
    };
  } else {
    return res.status(400).json({ error: `Unknown game type: ${gameType}` });
  }

  const netProfit = payout - parsedBet;

  // Execute database transaction atomically
  const executeCasinoTxn = db.transaction(() => {
    // 1. Update point_accounts balance
    const currentAcc = db.prepare("SELECT id, balance FROM point_accounts WHERE owner_id = ?").get(userId);
    if (!currentAcc || currentAcc.balance < parsedBet) {
      throw new Error('Insufficient points balance.');
    }

    const newBalance = currentAcc.balance - parsedBet + payout;

    if (netProfit > 0) {
      db.prepare(`
        UPDATE point_accounts
        SET balance = ?, total_received = total_received + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newBalance, netProfit, currentAcc.id);
    } else {
      db.prepare(`
        UPDATE point_accounts
        SET balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newBalance, currentAcc.id);
    }

    // 2. Insert record into casino_bets
    const insertBet = db.prepare(`
      INSERT INTO casino_bets (user_id, game_type, bet_amount, multiplier, payout, net_profit, result, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const betRes = insertBet.run(
      userId,
      gameType,
      parsedBet,
      multiplier,
      payout,
      netProfit,
      result,
      JSON.stringify(details)
    );

    return {
      betId: betRes.lastInsertRowid,
      newBalance
    };
  });

  try {
    const txnRes = executeCasinoTxn();
    return res.json({
      success: true,
      betId: txnRes.betId,
      gameType,
      betAmount: parsedBet,
      multiplier,
      payout,
      netProfit,
      result,
      details,
      newBalance: txnRes.newBalance
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Bet transaction failed.' });
  }
});

/**
 * 3. USER REQUESTS POINTS FROM ASSIGNED ADMIN
 */
router.post('/request-points', (req, res) => {
  const userId = req.user.id;
  const { requestedAmount = 1000 } = req.body;

  const profile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(userId);
  if (!profile || !profile.admin_id) {
    return res.status(400).json({ error: 'No assigned Admin found for this account.' });
  }

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  const { sendNotification } = require('../utils/logger');

  // Notify Admin
  sendNotification(
    profile.admin_id,
    'User Needs Points to Play',
    `User @${user ? user.username : userId} has zero/insufficient points and requested ${parseInt(requestedAmount, 10).toLocaleString()} points to play casino games.`,
    'INFO'
  );

  // Notify User
  sendNotification(
    userId,
    'Point Request Sent',
    `You requested points from your Admin. Please wait for your Admin to distribute points to your account.`,
    'SUCCESS'
  );

  return res.json({
    message: 'Point refill request sent to your Admin successfully!'
  });
});

module.exports = router;
