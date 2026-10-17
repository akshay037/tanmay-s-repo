# 🔴 Draikola - Hierarchical Point Management & Gaming System (Red Edition)

A high-performance, double-entry hierarchical point ledger and live casino gaming system built with **Node.js, Express 5, React 19, Redux Toolkit, Tailwind CSS 4, and SQLite (WAL Mode)**.

---

## 📑 Table of Contents
1. [Project Overview & Architecture](#-project-overview--architecture)
2. [Tech Stack](#-tech-stack)
3. [Default Credentials](#-default-credentials)
4. [Hosting Analysis & Recommendations](#-hosting-analysis--recommendations)
5. [Option 1: Deploy on a Linux VPS (Recommended)](#option-1-deploy-on-a-linux-vps-recommended-for-production)
6. [Option 2: Deploy on Cloud PaaS (Render / Railway)](#option-2-deploy-on-cloud-paas-render--railway)
7. [Option 3: Split Deployment (Vercel Frontend + PaaS/VPS Backend)](#option-3-split-deployment-frontend-on-vercel--backend-on-vpsrailway)
8. [Environment Variables Reference](#-environment-variables-reference)
9. [Database Persistence & Backup Strategy](#-database-persistence--backup-strategy)
10. [Local Development Setup](#-local-development-setup)

---

## 🏛 Project Overview & Architecture

The application implements a 3-tier organizational hierarchy with real-time balance propagation, ledger auditing, and an integrated casino gaming arena:

- **Super Admin**:
  - Infinite point minting pool.
  - Create and manage Admins with point allocations and reversals.
  - Review and approve point replenishment requests from Admins.
  - Audit trail of every system action and double-entry ledger reconciliation.
  - Transfer users between Admins.
- **Admin**:
  - Manage users assigned under their hierarchy.
  - Distribute points downstream to users.
  - Submit point replenishment requests to Super Admin.
  - Real-time transaction history and utilization metrics.
- **User (Casino Gaming Hub)**:
  - Play live casino games: **Lotto 99** (continuous 3-minute 10-ball draws), **Lucky 777 Slots**, **European Roulette**, **Crash Rocket (Aviator)**, **Blackjack 21**, and **Lucky Crypto Dice**.
  - All bets, payouts, and net profits are recorded on the ledger.
  - Direct Telegram deep-links for point deposits and withdrawals with their assigned Admin.
  - Fully mobile-responsive UI with centered game controls and sidebar navigation.

### Architecture Diagram
```
┌────────────────────────────────────────────────────────┐
│                   Vite + React 19 Frontend             │
│            (Redux Toolkit Query • Tailwind CSS 4)      │
└───────────────────────────┬────────────────────────────┘
                            │ /api requests (JWT Bearer)
┌───────────────────────────▼────────────────────────────┐
│                    Express 5 Backend                   │
│   (Rate Limiting • JWT Auth • Static File Server)      │
└───────────────────────────┬────────────────────────────┘
                            │ better-sqlite3 (WAL mode)
┌───────────────────────────▼────────────────────────────┐
│                 SQLite Database (ACID)                 │
│         (Users, Ledgers, Casino Bets, Lotto Draws)     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Redux Toolkit & RTK Query, Tailwind CSS 4, Vite, Lucide Icons, Recharts |
| **Backend** | Node.js (LTS 18, 20, or 22), Express 5, CORS, Express Rate Limit, UUID |
| **Database** | SQLite via `better-sqlite3` (WAL mode enabled for high-concurrency ACID transactions) |
| **Authentication**| JWT (JSON Web Tokens) with HTTP Bearer headers, Bcrypt password hashing |

---

## 🔑 Default Credentials

When the backend starts for the first time, it automatically initializes all database tables, triggers, indexes, and seeds the root Super Admin:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Role** | `SUPER_ADMIN` | Full root access |
| **Username** | `superadmin` | Initial master account |
| **Password** | `SuperAdmin@123` | Change password upon first production login |
| **Initial Points**| `1,000,000` | Super Admin can add unlimited points at any time |

---

## 🌐 Hosting Analysis & Recommendations

### Important Note Regarding SQLite in Production
The database uses `better-sqlite3`, storing all tables in `server/database.sqlite`.
- **Stateless Serverless Warning**: Platforms with ephemeral filesystems (such as standard Vercel serverless functions or basic free Heroku) wipe local files on every restart/re-deploy.
- **Production Recommendation**:
  1. **Linux VPS (Ubuntu/Debian via DigitalOcean, Linode, AWS EC2, or Hetzner)**: **100% recommended**. Provides dedicated SSD storage, zero file loss, lowest latency, and costs only $4–$6/month.
  2. **Render or Railway with Persistent Volume**: Best cloud-managed container alternative if you do not want to manage a VPS.

---

## Option 1: Deploy on a Linux VPS (Recommended for Production)

A Linux VPS (Ubuntu 22.04 or 24.04 LTS) running **PM2** and **Nginx** is the most reliable, cost-effective setup for this application.

### Step 1: Provision your Server & Install Prerequisites
Connect via SSH to your VPS:
```bash
ssh root@your_server_ip
```
Update packages and install build tools (required for compiling `better-sqlite3`):
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential python3
```

Install Node.js 20 or 22 LTS:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Should show v20.x
npm -v    # Should show v10.x
```

Install PM2 globally to keep the app running continuously:
```bash
sudo npm install -g pm2
```

---

### Step 2: Clone & Build the Application
Clone your repository into `/var/www/draikola`:
```bash
sudo mkdir -p /var/www/draikola
sudo chown -R $USER:$USER /var/www/draikola
git clone <YOUR_GIT_REPO_URL> /var/www/draikola
cd /var/www/draikola
```

Install all dependencies and build the frontend:
```bash
# 1. Install root, server, and client dependencies
npm run install-all

# 2. Build production React bundle into client/dist
npm run build
```

---

### Step 3: Configure Environment Variables
Create the server `.env` file:
```bash
cat << 'EOF' > /var/www/draikola/server/.env
PORT=5000
NODE_ENV=production
JWT_SECRET=super_secure_random_production_jwt_key_9928172648
EOF
```

---

### Step 4: Start the Application with PM2
Launch the backend server using PM2 (the backend automatically serves `client/dist` for all web requests):
```bash
cd /var/www/draikola
pm2 start server/server.js --name "draikola"

# Enable PM2 to restart automatically on system reboot
pm2 startup
pm2 save
```

Verify status:
```bash
pm2 status
pm2 logs draikola --lines 20
```

---

### Step 5: Configure Nginx Reverse Proxy & Free SSL

Install Nginx:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create an Nginx configuration file for your domain (e.g., `ledger.yourdomain.com`):
```bash
sudo nano /etc/nginx/sites-available/draikola
```
Paste the following configuration:
```nginx
server {
    listen 80;
    server_name ledger.yourdomain.com; # Replace with your domain or IP

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/draikola /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Obtain a free Let's Encrypt SSL Certificate (HTTPS):
```bash
sudo certbot --nginx -d ledger.yourdomain.com
```

Your system is now live at `https://ledger.yourdomain.com`! 🎉

---

## Option 2: Deploy on Cloud PaaS (Render / Railway)

### Deploying on Render (All-in-One Service)
1. Sign up at [render.com](https://render.com) and create a **New Web Service**.
2. Connect your Git repository.
3. Set the following settings:
   - **Environment**: `Node`
   - **Region**: Select closest to your users.
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm run install-all && npm run build
     ```
   - **Start Command**:
     ```bash
     node server/server.js
     ```
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<generate-a-strong-random-key>`
   - `PORT`: `5000` (Render binds automatically to `PORT`)
5. **Persistent Disk (Crucial for SQLite)**:
   - Go to **Disks** in your Render service settings.
   - Click **Add Disk**:
     - Name: `sqlite-data`
     - Mount Path: `/var/data`
     - Size: `1 GB` (or more).
   - If using a mounted disk, set `dbPath` in `server/db.js` or set a symlink so `database.sqlite` writes to `/var/data/database.sqlite`.

---

### Deploying on Railway
1. Open [railway.app](https://railway.app) and create a **New Project from GitHub Repo**.
2. Under **Service Settings**:
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `node server/server.js`
3. Add a **Persistent Volume**:
   - Mount path: `/app/server`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<random-secret>`

---

## Option 3: Split Deployment (Frontend on Vercel + Backend on VPS/Railway)

If you prefer deploying the React frontend on **Vercel** or **Netlify**:

### 1. Backend Setup
Deploy the `server/` directory on a VPS, Railway, or Render as described in Option 1 or Option 2.
Your backend will have a public URL, for example: `https://api.yourdomain.com`.

### 2. Frontend Configuration
In `client/vite.config.js`, configure the production proxy or configure `baseUrl` in `client/src/store/apiSlice.js`:
```javascript
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  ...
});
```

On Vercel:
- **Root Directory**: `client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_URL=https://api.yourdomain.com/api`

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | Recommended | `development` | Set to `production` in live environments. |
| `JWT_SECRET` | **Required** | Fallback key | Private string used to sign and verify user JWT sessions. |

---

## 💾 Database Persistence & Backup Strategy

Since SQLite is a single-file database (`database.sqlite`), backup and restore are simple:

### Creating an Online Hot Backup
Because WAL mode (`journal_mode = WAL`) is active, you can safely copy the database while the app is running using SQLite's backup API:

```bash
# Safely backup the live SQLite database without stopping the server
sqlite3 /var/www/draikola/server/database.sqlite ".backup '/var/backups/draikola/db_$(date +%F_%H%M%S).sqlite'"
```

### Automated Nightly Cron Backup
Add this line to your crontab (`crontab -e`):
```bash
0 3 * * * mkdir -p /var/backups/draikola && sqlite3 /var/www/draikola/server/database.sqlite ".backup '/var/backups/draikola/db_$(date +\%F).sqlite'" && find /var/backups/draikola/ -type f -mtime +14 -delete
```
This automatically takes a nightly snapshot at 3:00 AM and keeps backups for 14 days.

---

## 💻 Local Development Setup

If you want to run the project locally on your development machine:

```bash
# 1. Clone or navigate to the project directory
cd "d:\tanmay's project"

# 2. Install dependencies for both server and client
npm run install-all

# 3. Start Backend Server (Terminal 1)
npm run server
# -> Listens on http://localhost:5000

# 4. Start Frontend Dev Server (Terminal 2)
npm run client
# -> Available at http://localhost:3000 (proxies /api to localhost:5000)
```

Log in with:
- **Username**: `superadmin`
- **Password**: `SuperAdmin@123`

---

## 🔒 Security Best Practices for Production
1. **Change Super Admin Password**: Log in immediately and navigate to **Profile & Security** to change `SuperAdmin@123` to a secure custom password.
2. **Set a Strong `JWT_SECRET`**: Do not use the default fallback key in production.
3. **Enable HTTPS / SSL**: Always serve through HTTPS (via Let's Encrypt or Cloudflare) to ensure all token headers are encrypted in transit.
4. **Firewall (UFW)**: On VPS, allow only ports `22` (SSH), `80` (HTTP), and `443` (HTTPS):
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```
