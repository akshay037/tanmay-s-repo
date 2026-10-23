# 🔄 Draikola Internal Transfer (User-to-User Point Transfer)
## Technical Architecture & Functional Specification Document

**Version:** 1.0.0  
**Feature Name:** Internal User-to-User Transfer (P2P Balance Transfer)  
**Target Platform:** Draikola Hierarchical Point Management & Live Casino Platform  
**Architecture:** Express 5 Backend, SQLite WAL Mode (Atomic Double-Entry Ledger), React 19 + Redux Toolkit  
**Date:** October 2026  

---

## 📑 Table of Contents
1. [Overview & Core Concept](#1-overview--core-concept)
2. [Hierarchical Safety & Cluster Rules (Intra-Admin vs Inter-Admin)](#2-hierarchical-safety--cluster-rules)
3. [End-to-End User Flow](#3-end-to-end-user-flow)
4. [Double-Entry Ledger & Financial Invariants](#4-double-entry-ledger--financial-invariants)
5. [Database Schema Modifications](#5-database-schema-modifications)
6. [Backend API Specifications](#6-backend-api-specifications)
7. [Frontend UI/UX Design](#7-frontend-uiux-design)
8. [Security, Fraud & Limit Controls](#8-security-fraud--limit-controls)
9. [Step-by-Step Implementation Roadmap](#9-step-by-step-implementation-roadmap)

---

## 1. Overview & Core Concept

### 1.1 What is "Internal Transfer"?
**Internal Transfer** allows a player (**User 1**) to send points directly from their account balance to another player (**User 2**) in real time, identified by the recipient's **User ID** or **Username**.

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│        USER 1 (SENDER)          │                 │       USER 2 (RECEIVER)         │
│  ID: 105 • Username: "playerA"  │                 │  ID: 142 • Username: "playerB"  │
│  Balance Before: 5,000 pts      │                 │  Balance Before: 1,200 pts      │
└────────────────┬────────────────┘                 └────────────────▲────────────────┘
                 │                                                   │
                 │         Transfers 1,000 Points Directly           │
                 └─────────────────────────┬─────────────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │      ATOMIC DOUBLE-ENTRY LEDGER       │
                       │ - User 1 Balance: 5,000 -> 4,000 pts  │
                       │ - User 2 Balance: 1,200 -> 2,200 pts  │
                       │ - Ledger Txn: USER_TRANSFER           │
                       │ - Net System Inflation: 0 points      │
                       └───────────────────────────────────────┘
```

### 1.2 Key Objectives
- **Instant Peer-to-Peer Mobility**: Players can share points with friends, pool balances for games, or settle balances without waiting for an Admin.
- **Double-Entry Accuracy**: No points are created out of thin air. Every point deducted from User 1 is credited to User 2.
- **Zero Friction**: 2-step verification (search recipient $\rightarrow$ confirm transfer) with optional security PIN / password check.

---

## 2. Platform-Wide Transfer Model (Universal P2P)

The user has selected **Option 2: Universal Platform-Wide Transfers**:
- **Any active User** in the system can transfer points to **any other active User**, regardless of which Admin they were registered under.
- The recipient can be looked up by their **numeric User ID** (e.g. `142`) or **Username** (e.g. `bobby99`).
- Both users' balances and transaction records update instantly in real time via the atomic double-entry ledger.

### 2.1 Accounting Mechanics Across Admin Clusters
When User 1 (under Admin A) transfers points to User 2 (under Admin B):
- User 1's Point Account is debited: $\text{Balance}_{\text{User 1}} \leftarrow \text{Balance}_{\text{User 1}} - \text{Amount}$
- User 2's Point Account is credited: $\text{Balance}_{\text{User 2}} \leftarrow \text{Balance}_{\text{User 2}} + \text{Amount}$
- Ledger Transaction Type: `'USER_TRANSFER'`
- Net System Points change: **Zero** (100% backed and non-inflationary).
- Both Admin A and Admin B maintain full audit visibility over the transaction in their respective transaction reports.

### 2.2 Edge Case: Same User ID / Username Across Different Admins
In multi-agent systems, users and admins frequently encounter edge cases where:
1. **Global `users.id` vs Local Profile ID (`user_profiles.id`)**: An admin might consider their first player "User #1", while Admin B also has their first player "User #1".
2. **Identical or Similar Usernames/Names**: Multiple players might share similar usernames or display names under different Admins.
3. **Accidental Misdirection**: A player intends to send points to a friend under Admin Alpha, but accidentally inputs an ID belonging to a stranger under Admin Beta.

#### 🛡️ Built-in Disambiguation Solution:
1. **Multi-Match Resolution (`ambiguous: true`)**:
   - If a query matches multiple records (e.g. numeric ID matching a global `users.id` and another user's `profile_id`, or partial name matches), the API returns all candidates with their respective **Admin Name and Admin Username**.
   - The UI presents an interactive candidate picker so the sender visually chooses the exact player and Admin.
2. **Explicit Admin Badging**:
   - Every recipient card displays their assigned Admin (e.g. `Admin: @redtiger (Red Tiger Club)`).
   - If the recipient belongs to an external Admin, a clear `External Admin Player` badge appears.
3. **Admin-Scoped Search Syntax**:
   - Users can search directly using `admin_username:user_id` or `admin_username/username` (e.g., `redtiger:142` or `agent1/bobby`) for 100% targeted accuracy.

---

## 3. End-to-End User Flow

```
[Step 1: Recipient Lookup]
  User 1 -> Opens "Transfer Points" modal
         -> Enters User 2's Username or ID (e.g. "bobby99")
         -> Frontend calls /api/points/verify-recipient
         -> System returns:
            ✓ User found: "Bobby M. (bobby99)"
            ✓ Belongs to the same Admin
            ✓ Account status: ACTIVE

[Step 2: Transfer Details & Confirmation]
  User 1 -> Enters Amount: 1,500 points
         -> Enters optional Note: "Here are the chips for blackjack"
         -> Enters Account Password (security check)
         -> Clicks "Confirm Transfer"

[Step 3: Atomic Execution]
  Backend -> Verifies User 1 balance >= 1,500
          -> Locks rows in SQLite transaction
          -> Deducts 1,500 from User 1 point account
          -> Adds 1,500 to User 2 point account
          -> Inserts point_transactions record (type: 'USER_TRANSFER')
          -> Commits transaction atomically

[Step 4: Real-Time Feedback]
  - User 1 sees updated balance immediately (e.g. 5,000 -> 3,500)
  - User 2 receives real-time notification:
    "You received 1,500 points from playerA!"
```

---

## 4. Double-Entry Ledger & Financial Invariants

The transfer uses Draikola’s existing double-entry accounting engine in [`server/utils/ledger.js`](file:///d:/tanmay's%20project/server/utils/ledger.js).

### 4.1 Invariant Rules
1. **Conservation of Balance**:
   $$\Delta \text{Balance}_{\text{Sender}} + \Delta \text{Balance}_{\text{Receiver}} = 0$$
2. **Non-Negativity**:
   $$\text{Balance}_{\text{Sender}} - \text{Amount} \ge 0$$
3. **Non-Self Transfer**:
   $$\text{Sender ID} \neq \text{Receiver ID}$$

### 4.2 Ledger Record Structure
```sql
INSERT INTO point_transactions (
  transaction_id,
  from_account_id,      -- User 1's Point Account
  to_account_id,        -- User 2's Point Account
  amount,               -- 1500
  transaction_type,     -- 'USER_TRANSFER'
  status,               -- 'COMPLETED'
  from_balance_before,  -- 5000
  from_balance_after,   -- 3500
  to_balance_before,    -- 200
  to_balance_after,     -- 1700
  reference,            -- 'P2P-TRANS-000491'
  description,          -- 'Internal transfer from playerA to bobby99'
  created_by            -- User 1 ID
);
```

---

## 5. Database Schema Modifications

### 5.1 Update `point_transactions` CHECK Constraint in [`server/db.js`](file:///d:/tanmay's%20project/server/db.js)
Add `'USER_TRANSFER'` to the allowed `transaction_type` values:

```sql
CHECK(transaction_type IN (
  'SUPER_ADMIN_MINT',
  'ADMIN_ALLOCATION',
  'USER_ALLOCATION',
  'ADMIN_REVERSAL',
  'USER_REVERSAL',
  'USER_WITHDRAWAL',
  'ADMIN_WITHDRAWAL',
  'USER_TRANSFER'       -- <--- NEW: Internal User-to-User Transfer
))
```

### 5.2 Create `user_transfers` Tracking Table (Optional but Recommended)
Stores transfer-specific metadata, fee breakdown, and user notes:

```sql
CREATE TABLE IF NOT EXISTS user_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfer_code TEXT UNIQUE NOT NULL,            -- e.g. TRF-102938
  sender_user_id INTEGER NOT NULL REFERENCES users(id),
  receiver_user_id INTEGER NOT NULL REFERENCES users(id),
  admin_id INTEGER NOT NULL REFERENCES users(id), -- Same admin
  amount INTEGER NOT NULL CHECK(amount > 0),
  fee_amount INTEGER DEFAULT 0 CHECK(fee_amount >= 0),
  net_amount INTEGER NOT NULL CHECK(net_amount > 0),
  transaction_id TEXT NOT NULL REFERENCES point_transactions(transaction_id),
  note TEXT NULL,
  ip_address TEXT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_transfers_sender ON user_transfers(sender_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_transfers_receiver ON user_transfers(receiver_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_transfers_admin ON user_transfers(admin_id);
```

---

## 6. Backend API Specifications

### 6.1 Recipient Validation Endpoint

#### `POST /api/points/verify-recipient`
Validates that the target recipient exists, is active, and (if intra-admin is enforced) belongs to the same Admin.

- **Auth Required**: `Bearer <JWT>` (Role: `USER`)
- **Request Body**:
  ```json
  {
    "query": "bobby99"  // Can be username OR numeric user ID
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "valid": true,
    "user": {
      "id": 142,
      "username": "bobby99",
      "displayName": "Bobby M."
    },
    "sameAdmin": true
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Cannot transfer to yourself.
  - `404 Not Found`: Recipient does not exist.
  - `403 Forbidden`: Recipient belongs to a different Admin.

---

### 6.2 Execute Transfer Endpoint

#### `POST /api/points/user-transfer`
Executes the atomic peer-to-peer point transfer.

- **Auth Required**: `Bearer <JWT>` (Role: `USER`)
- **Request Body**:
  ```json
  {
    "recipientId": 142,
    "amount": 1000,
    "password": "PlayerPassword123",
    "note": "Blackjack stakes"
  }
  ```
- **Execution Workflow**:
  1. Validate sender password using `bcrypt.compareSync`.
  2. Verify sender has sufficient live balance.
  3. Verify sender and recipient are not the same ID.
  4. Verify recipient belongs to sender's Admin:
     ```js
     const senderProfile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(senderId);
     const recipientProfile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(recipientId);
     if (senderProfile.admin_id !== recipientProfile.admin_id) {
       return res.status(403).json({ error: 'You can only transfer points to users under the same Admin.' });
     }
     ```
  5. Execute `transferPoints` in an atomic database transaction.
  6. Insert into `user_transfers` and create a notification for User 2.
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Successfully transferred 1,000 points to bobby99.",
    "transferCode": "TRF-001092",
    "newBalance": 4000,
    "recipient": "bobby99"
  }
  ```

---

### 6.3 Transfer History Endpoint

#### `GET /api/points/my-transfers`
Fetches all incoming and outgoing peer-to-peer transfers for the current user.

- **Auth Required**: `Bearer <JWT>` (Role: `USER`)
- **Query Params**: `?type=all|sent|received&page=1&limit=20`
- **Success Response (200 OK)**:
  ```json
  [
    {
      "transferCode": "TRF-001092",
      "type": "SENT",
      "amount": 1000,
      "otherUser": { "id": 142, "username": "bobby99" },
      "note": "Blackjack stakes",
      "createdAt": "2026-10-22T10:30:00Z"
    },
    {
      "transferCode": "TRF-000843",
      "type": "RECEIVED",
      "amount": 500,
      "otherUser": { "id": 89, "username": "sarah_k" },
      "note": "Split win",
      "createdAt": "2026-10-21T18:15:00Z"
    }
  ]
  ```

---

## 7. Frontend UI/UX Design

### 7.1 Transfer Modal (`TransferModal.jsx`)
Triggered from either:
- **Navbar**: Quick-action "Transfer" button next to Deposit/Withdraw.
- **Balance & History Page**: Direct "P2P Transfer" card.

#### Modal Layout:
```
┌────────────────────────────────────────────────────────┐
│ 🔄 Transfer Points to Another Player                   │
├────────────────────────────────────────────────────────┤
│ Available Balance: 5,000 PTS                           │
│                                                        │
│ Recipient Username or ID:                              │
│ [ bobby99                             ] [ Find ]       │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ✓ Recipient Found: Bobby M. (@bobby99)             │ │
│ │   Verified under Agent: Red Tiger                  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Amount to Transfer:                                    │
│ [ 1000                               ]                 │
│ Quick: [ 100 ] [ 500 ] [ 1,000 ] [ Max: 5,000 ]        │
│                                                        │
│ Note (Optional):                                       │
│ [ For blackjack table pool            ]                │
│                                                        │
│ Enter Your Password to Confirm:                        │
│ [ ••••••••••••                        ]                │
│                                                        │
│ [ Cancel ]                      [ Transfer 1,000 PTS ] │
└────────────────────────────────────────────────────────┘
```

### 7.2 Updated "Balance & History" View
In [`client/src/pages/BalanceHistory.jsx`](file:///d:/tanmay's%20project/client/src/pages/BalanceHistory.jsx), add a new filter tab:
- `[ All ]` `[ Casino Bets ]` `[ Lotto ]` `[ Deposits ]` `[ Withdrawals ]` **`[ P2P Transfers ]`**

Transfers appear with distinct visual badges:
- 🔴 **Sent Transfer**: `-1,000 PTS` to `@bobby99` (Red icon)
- 🟢 **Received Transfer**: `+500 PTS` from `@sarah_k` (Green icon)

---

## 8. Security, Fraud & Limit Controls

| Control | Implementation Details |
| :--- | :--- |
| **Password Re-Authentication** | Requires the sender to input their current account password to prevent unauthorized transfers from unattended devices. |
| **Self-Transfer Prevention** | Rejects requests where `sender_id === recipient_id`. |
| **Minimum / Maximum Limits** | <ul><li>Minimum transfer: e.g. 10 points.</li><li>Maximum single transfer: e.g. 50,000 points.</li><li>Daily cumulative cap: configurable per user or role.</li></ul> |
| **Cluster Isolation Verification** | Sender and receiver must belong to the same `admin_id`. Prevents cross-agent liabilities. |
| **Rate Limiting** | Transfer endpoints protected by Express rate-limiters (max 10 transfer attempts per 5 minutes per user). |
| **Audit Trail** | All transfers logged in both `point_transactions` and the immutable `audit_logs` table. |

---

## 9. Step-by-Step Implementation Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Database Migration (1 Hour)                                         │
│ 1. Update CHECK constraint in server/db.js to include 'USER_TRANSFER'.      │
│ 2. Create the user_transfers table with foreign keys and indexes.            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Ledger Engine Support (1 Hour)                                      │
│ 1. In server/utils/ledger.js, handle USER_TRANSFER in transferPoints().       │
│ 2. Deduct from sender point_account and credit to receiver point_account.    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Backend Routes & Validation (2 Hours)                               │
│ 1. POST /api/points/verify-recipient (Search by ID or Username).            │
│ 2. POST /api/points/user-transfer (Atomic transfer + password check).        │
│ 3. GET /api/points/my-transfers (User's sent & received history).            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Frontend Component Creation (3 Hours)                               │
│ 1. Create client/src/components/TransferModal.jsx with recipient finder.    │
│ 2. Add "Transfer" button in Navbar.jsx and UserDashboard.jsx.                │
│ 3. Add "P2P Transfers" filter tab in client/src/pages/BalanceHistory.jsx.   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Verification & Testing (1 Hour)                                     │
│ 1. Test sending from User 1 to User 2. Verify balances update.              │
│ 2. Test cross-admin transfer rejection (security test).                      │
│ 3. Test insufficient balance and invalid password rejection.                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

*Specification created for Draikola Systems. All transfer flows strictly adhere to SQLite WAL double-entry accounting.*
