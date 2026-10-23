# 🤝 Draikola "Internal Refer" (Internal Referral System)
## Comprehensive Technical & Functional Specification Document

**Version:** 1.0.0  
**Target Platform:** Draikola Hierarchical Point Management & Live Casino Platform  
**Architecture:** Node.js / Express 5, React 19 + Redux Toolkit, SQLite (WAL Mode), Double-Entry Ledger  
**Date:** October 2026  

---

## 📑 Table of Contents
1. [Executive Summary & Concept Definition](#1-executive-summary--concept-definition)
2. [Why "Internal" Refer? (Hierarchy & Cluster Isolation)](#2-why-internal-refer-hierarchy--cluster-isolation)
3. [Core Actors & Permissions Matrix](#3-core-actors--permissions-matrix)
4. [End-to-End Workflow & User Journeys](#4-end-to-end-workflow--user-journeys)
5. [Reward Models & Mathematical Formulations](#5-reward-models--mathematical-formulations)
6. [Double-Entry Ledger & Financial Integrity](#6-double-entry-ledger--financial-integrity)
7. [Database Schema & Migration Scripts](#7-database-schema--migration-scripts)
8. [Backend API Specifications](#8-backend-api-specifications)
9. [Frontend UI/UX Specifications](#9-frontend-uiux-specifications)
10. [Anti-Abuse, Sybil Protection & Security](#10-anti-abuse-sybil-protection--security)
11. [Step-by-Step Implementation Roadmap](#11-step-by-step-implementation-roadmap)

---

## 1. Executive Summary & Concept Definition

### 1.1 What is "Internal Refer"?
In conventional online gaming systems, "Referrals" or "Affiliates" are open-ended: an affiliate drops a generic tracking link on social media, and anonymous visitors register directly into a shared global user pool.

In **Draikola**, the business model operates strictly on a **3-tier hierarchical trust network**:
$$\text{Super Admin (Master Mint)} \longrightarrow \text{Admin (Agent / Cluster Owner)} \longrightarrow \text{User (Player)}$$

Every user in Draikola is financially managed, allocated points, and cashed out exclusively by their specific **Assigned Admin**. 

Therefore, **"Internal Refer"** is a closed-loop, intra-cluster referral architecture where:
1. **Existing Players** (Users) refer friends or contacts directly into their **same Admin's book/cluster**.
2. The newly referred player is strictly bonded to the **same Admin** as the referrer, preventing agent poaching or hierarchy fragmentation.
3. The referral reward (points / commission) is credited through Draikola's **double-entry ledger**, funded either by the Admin's promotional pool or the Super Admin's bonus mint, with full transaction auditing.

```
                  ┌────────────────────────────────────────┐
                  │              SUPER ADMIN               │
                  │   - Global Referral Policy & Limits    │
                  │   - Master Audit of Referral Ledgers   │
                  └───────────────────┬────────────────────┘
                                      │
                         Allocates Points & Limits
                                      │
                  ┌───────────────────▼────────────────────┐
                  │              ADMIN (AGENT)             │
                  │   - Owns the Player Cluster / Branch   │
                  │   - Reviews & Approves Referrals       │
                  │   - Funds Referral Incentives          │
                  └─────────┬──────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │ Same-Branch Cluster Isolation │
            ▼                               ▼
┌───────────────────────┐       Internal Refer Link       ┌───────────────────────┐
│     USER A (Referrer) │─────────────────────────────────▶│    USER B (Referee)   │
│ - Shares Invite Code  │      (Stays under SAME Admin)    │ - Signs up via invite │
│ - Earns Commission/Pts│                                 │ - Receives Welcome Pts│
└───────────────────────┘                                 └───────────────────────┘
```

---

## 2. Why "Internal" Refer? (Hierarchy & Cluster Isolation)

### 2.1 The Core Problem with Standard Public Referrals
If a player under **Admin Alpha** refers a friend via a generic sign-up page:
- Which Admin funds the new user's initial balance?
- Which Admin handles their Telegram deposits and cashout requests?
- What happens if the new player gets assigned to **Admin Beta**? Admin Alpha loses revenue while player relationships fracture.

### 2.2 The Internal Refer Solution: Cluster Preservation
The **Internal Refer** module guarantees the following invariant:

$$\forall \text{ Referee } B \text{ referred by } A: \quad \text{Admin}(B) \equiv \text{Admin}(A)$$

- **Agent Loyalty**: Admins can actively incentivize their best players to bring in friends without fear of losing them to other Admins.
- **Controlled Credit Risk**: The Admin knows the chain of trust: *"User B was brought in by trusted VIP User A."*
- **Closed Financial Settlement**: Deposits and withdrawals remain strictly with the local Admin via existing Telegram deep-links.

---

## 3. Core Actors & Permissions Matrix

| Actor | Responsibilities & Capabilities in Internal Refer |
| :--- | :--- |
| **Super Admin** | <ul><li>Toggle global referral engine (`ENABLED` / `DISABLED`).</li><li>Set system-wide maximum commission caps (e.g. max 10% bonus, max 2% turnover).</li><li>Review global referral analytics, fraud alerts, and multi-tier audit logs.</li><li>Optionally mint promotional subsidies to Admins for referral campaigns.</li></ul> |
| **Admin (Agent)** | <ul><li>Enable or disable Internal Referrals for their individual cluster.</li><li>Set local reward rules: Fixed Bounty points vs. First-Allocation % match vs. Wagering turnover %.</li><li>Review incoming referral signups (Auto-Approve vs. Manual Verification).</li><li>Inspect cluster referral trees (who referred whom, active bet volume, ROI).</li></ul> |
| **User (Referrer)** | <ul><li>Generate personal referral code & custom slug (e.g., `DRAIK-VIP-777`).</li><li>Copy 1-click invite link with embedded Telegram / Web app redirect.</li><li>View real-time dashboard: Total Referrals, Active Players, Unclaimed Rewards.</li><li>Claim earned bonus points into their live playable balance.</li></ul> |
| **User (Referee)** | <ul><li>Receive invitation with pre-filled referral code.</li><li>Sign up with instant binding to the inviter's Admin.</li><li>Receive welcome bonus points (if configured by Admin).</li></ul> |

---

## 4. End-to-End Workflow & User Journeys

### 4.1 Step-by-Step Lifecycle Flow

```
[Phase 1: Invite Generation]
  User A -> Clicks "Refer & Earn" in Casino Lobby
         -> System creates unique code: REF-U842-89K2
         -> Generates shareable Web link & Telegram invite button

[Phase 2: Referee Onboarding]
  User B -> Opens invite URL: https://draikola.com/join?ref=REF-U842-89K2
         -> Frontend displays: "Invited by Alex under Agent RedTiger"
         -> User B submits username, password, phone/Telegram handle
         -> System detects Referrer = User A -> Admin = RedTiger (ID: 4)

[Phase 3: Activation Gate]
  Condition: Admin Policy
  ├── If AUTO_APPROVE: User B is created immediately with ACTIVE status
  └── If MANUAL_REVIEW: Referral ticket placed in Admin's "Pending Referrals" queue
                        Admin approves -> User B account created & notified

[Phase 4: Reward Trigger Event]
  Event A (Onboarding/First Allocation):
    - Admin allocates first 1,000 pts to User B
    - Engine evaluates: 10% First Allocation Match = 100 pts reward for User A
  Event B (Wagering Turnover):
    - User B bets 500 pts on Lotto 99 or Lucky Slots
    - Engine evaluates: 1% Turnover Commission = 5 pts reward for User A

[Phase 5: Double-Entry Ledger Credit]
  - From: Admin Promo Account (or Super Admin Promo Pool)
  - To: User A Point Account
  - Ledger Record: Type = 'INTERNAL_REFERRAL_BONUS'
  - User A balance updates in real time via Redux Toolkit / WebSocket
```

---

## 5. Reward Models & Mathematical Formulations

To provide maximum flexibility to Admins, the Internal Refer module supports three distinct reward models (which can be combined):

### Model 1: Fixed Sign-Up Bounty (One-Time)
- **Concept**: A flat point bonus credited once the referee completes registration and their first minimum deposit/allocation.
- **Formula**:
  $$R_{\text{bounty}} = C_{\text{fixed}} \quad \text{when} \quad D_{\text{first}} \ge D_{\text{threshold}}$$
- *Example*: User A receives **200 points** when User B joins and receives their first $\ge 500$ points allocation.

### Model 2: Allocation / Deposit Match (Percentage-Based)
- **Concept**: A percentage of the points allocated to the referee by the Admin.
- **Formula**:
  $$R_{\text{alloc}} = \min\left( A_{\text{referee}} \times \frac{P_{\text{match}}}{100}, \; R_{\text{cap}} \right)$$
- *Example*: At $10\%$ match with a $500$ point cap, if User B receives an allocation of $2,000$ points, User A earns $\min(200, 500) = 200$ points.

### Model 3: Continuous Wagering Turnover (Rakeback Commission)
- **Concept**: Long-term passive income. Every time the referred player places a bet on casino games or Lotto, the referrer receives a fractional commission based on total wagered volume.
- **Formula**:
  $$R_{\text{turnover}} = \sum_{i=1}^{n} \text{BetAmount}_i \times \frac{C_{\text{rate}}}{100}$$
- *Example*: At $0.5\%$ turnover commission, if User B wagers $10,000$ points across Slots, Roulette, and Crash Rocket, User A earns:
  $$10,000 \times 0.005 = 50 \text{ points}$$

---

## 6. Double-Entry Ledger & Financial Integrity

Draikola strictly forbids unbacked "phantom" points. All points must originate from a verified account and balance out to zero net change across the system:

$$\sum \Delta \text{Balance}_{\text{all accounts}} \equiv 0$$

### 6.1 Funding Sources for Referral Rewards
Admins have two configurable funding structures:

1. **Admin-Funded (Default & Recommended)**:
   - The bonus points are deducted from the **Admin's Point Account** (`from_account_id = admin_point_account`).
   - Why: The Admin directly profits from the referee's gameplay and deposits, so referral acquisition cost is an operational expense for that Admin.
   - Guardrail: If Admin balance is lower than the reward, the reward status is marked as `PENDING_ADMIN_FUNDS` until the Admin replenishes points.

2. **Super Admin Subsidized (Promotional Campaigns)**:
   - Super Admin can sponsor network growth by paying referral bonuses from the Super Admin master account (`SUPER_ADMIN_MINT`).

### 6.2 Ledger Transaction Entry Example
When User A receives a 250 point referral bonus:

```sql
INSERT INTO point_transactions (
  transaction_id,
  from_account_id,     -- Admin's point account ID
  to_account_id,       -- User A's point account ID
  amount,              -- 250
  transaction_type,    -- 'INTERNAL_REFERRAL_BONUS'
  status,              -- 'COMPLETED'
  from_balance_before, -- 45,000
  from_balance_after,  -- 44,750
  to_balance_before,   -- 1,200
  to_balance_after,    -- 1,450
  reference,           -- 'REF-REQ-000842'
  description,         -- 'Internal Referral Bonus for onboarding user bobby99'
  created_by           -- Admin ID or System Trigger
);
```

---

## 7. Database Schema & Migration Scripts

The following tables are added to `server/db.js` using SQLite:

```sql
-- ========================================================
-- 1. REFERRAL CODES TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  code TEXT UNIQUE NOT NULL,
  custom_slug TEXT UNIQUE NULL,
  clicks_count INTEGER DEFAULT 0,
  signups_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_admin ON referral_codes(admin_id);

-- ========================================================
-- 2. INTERNAL REFERRALS RELATIONSHIP TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS internal_referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referral_code_id INTEGER NOT NULL REFERENCES referral_codes(id),
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referee_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  admin_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED')),
  referee_first_deposit INTEGER DEFAULT 0,
  referee_total_wagered INTEGER DEFAULT 0,
  total_bonus_earned INTEGER DEFAULT 0,
  registered_ip TEXT NULL,
  approved_by INTEGER NULL REFERENCES users(id),
  approved_at TEXT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_internal_referrals_referrer ON internal_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_internal_referrals_referee ON internal_referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_internal_referrals_admin ON internal_referrals(admin_id);

-- ========================================================
-- 3. REFERRAL REWARDS LEDGER & CLAIM TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reward_code TEXT UNIQUE NOT NULL,
  referral_id INTEGER NOT NULL REFERENCES internal_referrals(id),
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referee_id INTEGER NOT NULL REFERENCES users(id),
  admin_id INTEGER NOT NULL REFERENCES users(id),
  reward_type TEXT NOT NULL CHECK(reward_type IN ('SIGNUP_BOUNTY', 'ALLOCATION_MATCH', 'TURNOVER_RAKE')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  status TEXT NOT NULL DEFAULT 'CLAIMED' CHECK(status IN ('PENDING_CLAIM', 'CLAIMED', 'REVOKED')),
  transaction_id TEXT NULL REFERENCES point_transactions(transaction_id),
  trigger_details TEXT NULL, -- e.g., JSON string { "betId": 1204, "betAmount": 500 }
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_admin ON referral_rewards(admin_id);

-- ========================================================
-- 4. ADMIN & SYSTEM REFERRAL CONFIGURATIONS
-- ========================================================
CREATE TABLE IF NOT EXISTS referral_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('GLOBAL', 'ADMIN')),
  admin_id INTEGER UNIQUE NULL REFERENCES users(id), -- NULL for GLOBAL settings
  is_enabled INTEGER DEFAULT 1 CHECK(is_enabled IN (0, 1)),
  require_admin_approval INTEGER DEFAULT 0 CHECK(require_admin_approval IN (0, 1)),
  signup_bounty_amount INTEGER DEFAULT 100,
  allocation_match_pct REAL DEFAULT 5.0,    -- 5% of referee's first allocation
  allocation_match_cap INTEGER DEFAULT 500, -- Maximum 500 points match
  turnover_commission_pct REAL DEFAULT 0.5, -- 0.5% of referee's casino wagers
  min_withdrawal_wager_mult REAL DEFAULT 3.0, -- Wagering requirement before bonus cashout
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. Backend API Specifications

### 8.1 User Endpoints (Prefix: `/api/referrals`)

#### `GET /api/referrals/my-code`
- **Auth**: `Bearer <JWT>` (Role: `USER`)
- **Response**:
  ```json
  {
    "code": "DRAIK-ALEX99",
    "shareUrl": "https://draikola.com/register?ref=DRAIK-ALEX99",
    "telegramShareUrl": "https://t.me/share/url?url=https://draikola.com/register?ref=DRAIK-ALEX99&text=Join%20me%20on%20Draikola!",
    "admin": {
      "id": 4,
      "username": "agent_redtiger",
      "name": "Red Tiger Gaming Club"
    },
    "stats": {
      "totalClicks": 42,
      "totalRegistered": 5,
      "activePlayers": 4,
      "totalEarnedPoints": 850
    }
  }
  ```

#### `GET /api/referrals/list`
- **Auth**: `Bearer <JWT>` (Role: `USER`)
- **Query Params**: `?page=1&limit=10`
- **Response**: List of referred users (anonymized username for privacy: e.g. `jo***99`), date joined, total volume played, and points earned from them.

---

### 8.2 Public Registration Endpoint via Referral

#### `POST /api/auth/register-referral`
- **Auth**: Public (Rate limited)
- **Body**:
  ```json
  {
    "referralCode": "DRAIK-ALEX99",
    "username": "player_sam",
    "password": "Password@123",
    "name": "Sam Wilson",
    "phone": "+1234567890"
  }
  ```
- **Execution Logic**:
  1. Validate `referralCode` in `referral_codes`.
  2. Retrieve `referrer_id` and bonded `admin_id`.
  3. Verify Admin is `ACTIVE` and has referrals enabled.
  4. Create user with `user_profiles.admin_id = referral.admin_id`.
  5. If `require_admin_approval == 1`, set user status to `PENDING_APPROVAL`, else `ACTIVE`.
  6. Return JWT or confirmation message.

---

### 8.3 Admin Endpoints (Prefix: `/api/admin/referrals`)

#### `GET /api/admin/referrals/overview`
- **Auth**: `Bearer <JWT>` (Role: `ADMIN`)
- **Description**: Returns all referrals within the Admin's cluster, total commissions paid, active top referrers, and pending approvals.

#### `POST /api/admin/referrals/approve/:id`
- **Auth**: `Bearer <JWT>` (Role: `ADMIN`)
- **Description**: Approves a pending referral registration, activates the referee account, and initiates the welcome bounty transaction.

#### `PUT /api/admin/referrals/settings`
- **Auth**: `Bearer <JWT>` (Role: `ADMIN`)
- **Body**:
  ```json
  {
    "isEnabled": true,
    "requireApproval": false,
    "signupBounty": 100,
    "allocationMatchPct": 7.5,
    "turnoverCommissionPct": 0.5
  }
  ```

---

## 9. Frontend UI/UX Specifications

To maintain the bold, high-contrast Red Edition aesthetic of Draikola, the Internal Refer module features three intuitive interfaces:

### 9.1 Player View: "Refer & Earn" Casino Tab
Located directly on the User Sidebar (`Sidebar.jsx`) under the casino games:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🎁 REFER & EARN (INTERNAL AGENT CLUSTER)                               │
│ Invite friends to play under Agent RedTiger. Earn instant points!      │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ YOUR EXCLUSIVE INVITE LINK         │ │ REFERRAL METRICS            │ │
│ │ [https://draikola.com/join?ref=..] │ │ Total Referred:     8       │ │
│ │ [ Copy Link ]  [ Share Telegram ]  │ │ Active Players:     6       │ │
│ │ Code: DRAIK-ALEX99                 │ │ Total Points Earned: 1,450  │ │
│ └────────────────────────────────────┘ └─────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 🏆 HOW IT WORKS                                                        │
│ 1. Share your link with friends.                                       │
│ 2. When they register, they join your same Admin cluster directly.     │
│ 3. Earn 100 pts on their 1st deposit + 0.5% of every bet they place!   │
├────────────────────────────────────────────────────────────────────────┤
│ 👥 YOUR REFERRED PLAYERS                                               │
│ Username      Joined Date     Total Wagered     Your Earnings   Status │
│ sa***son      2026-10-18      4,200 pts         121 pts         Active │
│ mik***9       2026-10-19      1,100 pts          55 pts         Active │
│ el***na       2026-10-21          0 pts           0 pts        Pending │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Admin View: Referral Tree & Liability Monitor
Located in the Admin dashboard:
- **Pending Referral Approvals Badge**: Notification pill on sidebar showing new registrations awaiting review.
- **Cluster Tree Visualization**: Drill-down view of which top players are bringing in the highest active volume.
- **Commission Liability Forecast**: Visualizes how much commission has been paid out vs. net gaming profit generated by referred users.

---

## 10. Anti-Abuse, Sybil Protection & Security

Gaming and point systems face specific fraud vectors with referral programs. The following controls are built into the design:

| Fraud Vector | Threat Description | Prevention Mechanism |
| :--- | :--- | :--- |
| **Self-Referral (Multi-Accounting)** | User creates multiple accounts under their own code to collect signup bounties. | <ul><li>**IP & Device Fingerprint Matching**: Same IP or hardware hash automatically flags referral.</li><li>**Mandatory Admin Verification**: Suspicious accounts require Admin approval before points release.</li><li>**Bounty Tied to First Deposit**: No bounty is paid until real points are distributed and wagered.</li></ul> |
| **Immediate Cash-and-Dash** | Referrer or referee immediately requests withdrawal after receiving bonus points. | <ul><li>**Wagering Requirement (Rollover)**: Referral bonus points must be wagered at least $3\times$ (e.g. 100 pts bonus requires 300 pts bet turnover) before appearing in the withdrawable balance.</li><li>Withdrawal modal (`WithdrawModal.jsx`) dynamically splits balance into `Withdrawable Points` vs `Locked Bonus Points`.</li></ul> |
| **Cross-Agent Poaching** | Player tries to use an Admin Beta code while already belonging to Admin Alpha. | <ul><li>Referral codes are one-time valid at initial registration only.</li><li>Existing users cannot change their referral parent or Admin without explicit Super Admin transfer (`admin_user_transfers`).</li></ul> |

---

## 11. Step-by-Step Implementation Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Database Foundation & Migrations (1 - 2 Days)                      │
│ - Add referral_codes, internal_referrals, referral_rewards tables in db.js   │
│ - Add new ledger transaction types to point_transactions CHECK constraint    │
│ - Seed default global referral settings                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Core Backend Engine & Ledger Hook (2 - 3 Days)                      │
│ - Implement referral service (server/services/referralService.js)            │
│ - Hook into server/routes/points.js (trigger on user allocation)             │
│ - Hook into server/routes/casino.js & lotto.js (trigger turnover commission) │
│ - Add public referral registration endpoint with cluster assignment          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Player "Refer & Earn" Frontend UI (2 Days)                          │
│ - Build ReferAndEarn.jsx page with copy link, QR code, and stats cards       │
│ - Add "Refer & Earn" tab to Sidebar.jsx and router                           │
│ - Integrate Telegram 1-click share via buildTelegramReferralUrl              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Admin Oversight & Global Configuration (2 Days)                     │
│ - Add AdminReferralManagement.jsx in admin portal                            │
│ - Approval queue for pending referrals                                       │
│ - Commission settings panel per Admin                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Testing, Auditing & Rollout (1 - 2 Days)                            │
│ - Automated e2e test script (test_referrals_e2e.js)                          │
│ - Test ledger double-entry conservation under concurrent bet placing         │
│ - Deploy & monitor live performance                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

*Document prepared for Draikola Systems Architecture. All code and schema definitions comply with the existing Draikola SQLite double-entry ledger specification.*
