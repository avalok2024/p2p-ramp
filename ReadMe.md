# 🚀 RampX – P2P Crypto On/Off Ramp

## 🧠 Overview

**RampX** is a next-generation **P2P Crypto ↔ Fiat On/Off Ramp platform** that enables users to seamlessly buy and sell cryptocurrencies (USDT, USDC, BTC, etc.) using fiat (₹ via UPI/Bank Transfer) through trusted merchants.

RampX is built on a **trust-first architecture** powered by:

* 🔐 Escrow System
* ⚙️ State Machine Workflow
* ⚖️ Admin Dispute Resolution

---

## 🎯 Who is RampX for?

### 👤 Users

* Buy crypto using fiat instantly
* Sell crypto and receive fiat
* Secure transactions with escrow protection

### 🏪 Merchants (Liquidity Providers)

* Provide crypto/fiat liquidity
* Earn profit via spreads
* Manage trades efficiently

### 🛡️ Admin (Trust Layer)

* Resolve disputes
* Monitor fraud & abuse
* Maintain platform integrity

---

## ❗ Problem RampX Solves

Current P2P systems face:

* ❌ Fake payment claims
* ❌ Trust issues between strangers
* ❌ Weak dispute resolution
* ❌ Slow/manual processes

---

## ✅ RampX Solution

RampX solves these with:

* 🔐 **Escrow-first design** → Funds locked before payment
* ⚙️ **State-driven system** → Clear and secure flow
* 🔁 **Dual confirmation model** → No single-point trust
* ⚖️ **Admin intervention engine** → Fast dispute resolution
* 📊 **Reputation system** → Reduces fraud over time

---

## 🏗️ Architecture

### Frontend (3 Apps)

* 👤 User App
* 🏪 Merchant Dashboard
* 🛡️ Admin Panel

### Backend (Single System)

* Auth
* User
* Merchant
* Order
* Matching Engine
* Escrow
* Payment
* Wallet
* Dispute

### Infrastructure

* PostgreSQL
* Redis
* Queue (BullMQ / Kafka)
* Blockchain (Ethereum / Polygon)

---

## 🔄 Core Flows

### 🟢 BUY FLOW (Fiat → Crypto)

1. User creates order
2. Merchant matched
3. Escrow locks crypto
4. User pays fiat
5. Merchant confirms
6. Crypto released

---

### 🔴 SELL FLOW (Crypto → Fiat)

1. User creates order
2. Escrow locks crypto
3. Merchant pays fiat
4. User confirms
5. Crypto released

---

## 🔐 Escrow System

* Crypto is locked before payment begins
* Released only when:

  * Merchant confirms OR
  * Admin resolves dispute

---

## 💳 Payment Verification

RampX uses:

* “I Paid” signal
* Merchant confirmation
* Unique amount & reference tracking

---

## ⚖️ Dispute System

### Flow:

1. Dispute raised
2. Order → DISPUTE
3. Admin reviews evidence
4. Final decision executed

---

## 👛 Smart Wallet System

RampX provides each user and merchant with a **Smart Wallet**:

* ⚡ Fast internal ledger
* ⛓️ Blockchain custody
* 🔒 Escrow locking

---

## 🔐 Security

* JWT Authentication
* Role-Based Access (RBAC)
* Fraud detection
* Audit logs

---

## 🧰 Tech Stack

### Backend

* Node.js (NestJS)
* PostgreSQL
* Redis

### Frontend

* React / Next.js

### Blockchain

* Ethers.js
* Infura / Alchemy

---

## 🛠️ Setup

```bash
git clone <repo>
cd rampx
npm install
npm run dev
```

---

## 🔑 Environment Variables

```env
DB_URL=
JWT_SECRET=
REDIS_URL=
BLOCKCHAIN_RPC=
```

---

## 📡 API (Sample)

```http
POST /orders
POST /orders/:id/pay
POST /orders/:id/confirm
POST /admin/orders/:id/resolve
```

---

## 📂 Project Structure

```
/src
  /auth
  /user
  /merchant
  /order
  /matching
  /escrow
  /payment
  /wallet
  /dispute
  /admin
```

---

## 🚀 Roadmap

### Phase 1

* MVP backend
* Manual payment system

### Phase 2

* Redis + queues
* Improved matching

### Phase 3

* Smart contracts
* AI fraud detection

---

## 💥 Final Insight

> RampX is not just a crypto app.

🔥 It is a **Trust Infrastructure for P2P Finance**

---

## 📜 License

@avalok