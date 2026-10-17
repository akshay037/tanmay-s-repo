# 🚀 Draikola - Complete Beginner's Step-by-Step Hosting Guide

This guide is designed for **complete beginners** with **zero backend knowledge**. Follow these instructions step-by-step to get **Draikola** live on the web in less than 10 minutes.

---

## ⚡ Quick Decision: Render vs. Vercel

| Feature | 🟣 Render (Recommended) | ▲ Vercel |
| :--- | :--- | :--- |
| **What it hosts** | **Both Frontend + Backend + SQLite Database** in one place | Frontend only (Serverless) |
| **Number of services** | **1 single service** | Needs 2 services (Vercel for frontend + another host for backend) |
| **Backend knowledge needed** | **None** (Fully automated) | High (Requires splitting API and database) |
| **URL** | 1 single URL (e.g., `https://draikola.onrender.com`) | 2 URLs |
| **CORS errors** | **Zero CORS issues** (Same origin) | Can have CORS issues if misconfigured |
| **Cost** | **Free tier available** | Free tier available |

👉 **Recommendation**: Use **Render**. It will build your React frontend, start your Express backend, and run your SQLite database automatically under **one single URL** without you touching any server code!

---

## 🟣 Part 1: How to Host on Render (Step-by-Step)

### Step 1: Put your Code on GitHub

1. If you haven't already, install [Git](https://git-scm.com/) on your computer.
2. Open your terminal or PowerShell in your project folder (`d:\tanmay's project`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production"
   ```
3. Go to [GitHub.com](https://github.com/), log in, and click **New Repository**.
4. Give it a name (e.g. `draikola`), make it **Private** or **Public**, and click **Create repository**.
5. Copy the commands shown on GitHub under **"push an existing repository from the command line"** and run them in your terminal:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/draikola.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Create an Account on Render

1. Go to [render.com](https://render.com/).
2. Click **Sign Up** and choose **GitHub** (this connects your GitHub account automatically).

---

### Step 3: Create your Web Service

1. Once logged into the Render Dashboard, click the blue **New +** button in the top right.
2. Select **Web Service**.
3. Choose **Build and deploy from a Git repository** and click **Next**.
4. In the list of repositories, find your `draikola` repository and click **Connect**.

---

### Step 4: Fill in the Service Settings

Fill in the settings exactly as shown below:

| Field | What to Enter |
| :--- | :--- |
| **Name** | `draikola` *(or any name you want for your site)* |
| **Region** | Choose the one closest to you (e.g. `Singapore`, `Frankfurt`, `Oregon`, or `Ohio`) |
| **Branch** | `main` |
| **Root Directory** | **LEAVE BLANK** *(do not type anything)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run render-build` |
| **Start Command** | `npm start` |
| **Instance Type** | Select **Free** (or Starter if you want persistent disk) |

> 💡 **Why `npm run render-build`?**
> We have pre-configured this script in your `package.json`. It automatically installs your backend packages, installs your frontend packages, and compiles your React web app into high-performance static files.

---

### Step 5: Add Environment Variables

Scroll down to the **Environment Variables** section and click **Add Environment Variable**:

1. **First Variable**:
   - **Key**: `NODE_ENV`
   - **Value**: `production`

2. **Second Variable**:
   - **Key**: `JWT_SECRET`
   - **Value**: Click **Generate** (or type a random 32-character secret string like `my_super_secret_jwt_key_2026_xyz123`)

---

### Step 6: Deploy!

1. Click the blue **Create Web Service** button at the bottom of the page.
2. Render will now start building:
   - You will see the build logs in real time.
   - It will install packages, build the frontend, and start the server.
   - When finished, you will see a green badge saying **`Live`**.
3. Click your live URL at the top left of the Render dashboard (e.g., `https://draikola.onrender.com`).
4. **Congratulations! Your site is live on the internet!** 🎉

---

### Step 7: Log in as Super Admin

1. Open your new live site URL.
2. Log in with the pre-seeded master credentials:
   - **Username**: `superadmin`
   - **Password**: `SuperAdmin@123`
3. Immediately go to **Profile** &rarr; **Change Security Password** to change this default password to your own private password.

---

## ⚠️ Important Note About Render's Free Plan vs. SQLite

- **Render's Free Tier** is 100% free forever, but:
  1. **Spin down**: If nobody visits your site for 15 minutes, Render puts the server to sleep. When someone visits again, it takes about 30–50 seconds to wake up (first page load).
  2. **Ephemeral Disk**: Any changes to the SQLite database file (`database.sqlite`) will reset if the server restarts or if you deploy new code.
- **How to keep your database permanently saved on Render**:
  - In Render, upgrade your Web Service from **Free** to **Starter** ($7/mo).
  - Go to the **Disks** tab in your service settings and click **Add Disk**:
    - **Name**: `sqlite-data`
    - **Mount Path**: `/var/data`
    - **Size**: `1 GB`
  - In **Environment Variables**, add:
    - **Key**: `DATABASE_PATH`
    - **Value**: `/var/data/database.sqlite`
  - Now your database will **never be erased**, even during restarts or new deployments!

---

## ▲ Part 2: If you want to use Vercel (Split Deployment)

If you specifically want your frontend on Vercel:

### Why Vercel cannot run the backend alone:
Vercel is built for **serverless frontends**. It does not run a persistent Node.js server and cannot store a SQLite file (`database.sqlite`).
Therefore, you must host your **Backend on Render** (or Railway/VPS), and your **Frontend on Vercel**.

### Step 1: Deploy Backend on Render
Follow **Part 1** above to deploy the backend on Render.
Your backend will have a URL like: `https://draikola-api.onrender.com`.

### Step 2: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com/) and log in with GitHub.
2. Click **Add New...** &rarr; **Project**.
3. Select your `draikola` GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Open **Environment Variables** and add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://draikola-api.onrender.com/api` (your Render backend URL)
6. Click **Deploy**.
7. Vercel will build and give you a frontend URL like `https://draikola.vercel.app`.

*(We have already included a `client/vercel.json` file in your repository so page refreshes and deep-links work without 404 errors).*

---

## 🛠 Useful Troubleshooting & FAQ

### Q: The site shows "Not Found" or "API endpoint not found".
- Ensure you set **Root Directory** as blank on Render (not `/client` or `/server`). The root `package.json` coordinates both the server and client.

### Q: Why does Render take 40 seconds to open the first time?
- On Render's Free tier, services go to sleep when idle to save resources. When someone visits, it wakes up. If you upgrade to the $7 Starter plan, it stays awake 24/7 with zero lag.

### Q: How do I connect my own custom domain (e.g. `www.mycasino.com`)?
1. On Render, go to your Web Service &rarr; **Settings** &rarr; **Custom Domains**.
2. Click **Add Custom Domain** and enter your domain name (e.g. `app.yourdomain.com`).
3. Render will show you a CNAME or A record.
4. Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add that DNS record.
5. Render automatically provides and renews a **free SSL certificate (HTTPS)** for your domain!
