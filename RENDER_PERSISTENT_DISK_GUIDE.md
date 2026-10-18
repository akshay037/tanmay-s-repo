# 💾 How to Add a Persistent Disk on Render (Complete Step-by-Step Guide)

This guide walks you through upgrading your Render Web Service to the **Starter Plan** and attaching a **Persistent Disk** so that your **SQLite database, 150+ user accounts, balances, and history are permanently saved and your server never sleeps**.

---

## 💰 Cost Breakdown

| Item | Cost | What it does |
| :--- | :--- | :--- |
| **Render Starter Plan** | **$7 / month** | Keeps your backend & frontend **awake 24/7** (zero 15-minute sleep, zero lag). |
| **Persistent Disk (1 GB)** | **~$0.25 / month** | Permanent virtual hard drive that keeps `database.sqlite` safe forever. |
| **Total Cost** | **~$7.25 / month** | Everything required for 150+ real users in production. |

---

## 🚀 Step-by-Step Instructions

### Step 1: Add Payment Method in Render
1. Log into your dashboard at [dashboard.render.com](https://dashboard.render.com/).
2. In the top right corner, click your **Profile Picture / Avatar** &rarr; select **Billing**.
3. Under **Payment Methods**, click **Add Payment Method**.
4. Enter your credit/debit card details and save.

---

### Step 2: Upgrade your Web Service to the Starter Plan
*(Render only permits attaching disks to paid instances such as Starter)*

1. Click on **Dashboard** in the top left.
2. Select your `draikola` web service.
3. In the left navigation menu, click **Settings**.
4. Scroll down to the **Instance Type** section.
5. Click **Change Instance Type**.
6. Select **Starter** ($7/mo - 512 MB RAM, 0.5 CPU).
7. Click **Save Changes**.

> 💡 *As soon as you save this, the 15-minute sleep is gone! Your app will now stay online 24/7.*

---

### Step 3: Attach the Persistent Disk
1. In the left navigation menu of your `draikola` service, click **Disks**.
2. Click the blue **Add Disk** button.
3. Fill in the three fields:
   * **Name**: `sqlite-data`
   * **Mount Path**: `/var/data`
   * **Size**: `1 GB` *(1 GB holds millions of SQLite rows; you can expand it anytime)*
4. Click **Create Disk** or **Save**.

---

### Step 4: Configure the Environment Variable
Now tell your Node.js application to save the SQLite database onto your new disk:

1. In the left navigation menu, click **Environment**.
2. Scroll to the **Environment Variables** list and click **Add Environment Variable**:
   * **Key**: `DATABASE_PATH`
   * **Value**: `/var/data/database.sqlite`
3. Make sure your other variables are also present:
   * `NODE_ENV`: `production`
   * `JWT_SECRET`: *(your 128-character secret key)*
4. Click **Save Changes**.

---

### Step 5: Verify Everything is Working
Render will automatically trigger a new deployment to attach the disk.

1. Go to the **Logs** tab in Render.
2. Once the build finishes, you will see:
   ```text
   ==> Disk sqlite-data mounted at /var/data
   ==> Listening on port http://0.0.0.0:5000
   ```
3. Open your live website URL (e.g. `https://draikola.onrender.com`).
4. Log into the Super Admin panel (`superadmin` / `SuperAdmin@123`).
5. Create a test admin or test user.

#### 🧪 The Final Test (Proving it will never reset):
1. In Render Dashboard, click **Manual Deploy** &rarr; **Deploy latest commit** (or restart service).
2. Wait for it to become **Live** again.
3. Refresh your website and log back in.
4. **Notice:** Your test user and balances are still there! The database was not erased.

---

## 🛡️ Best Practices & Backups

* **Render Disk Snapshots**: Render automatically takes periodic snapshots of your disk.
* **Manual Backup via Shell**:
  If you ever want to download a backup copy of your database:
  1. In Render Dashboard, go to your service &rarr; click **Shell**.
  2. Click **Connect**.
  3. Run:
     ```bash
     ls -la /var/data
     ```
     You will see `database.sqlite` safely stored in `/var/data`.
