# 🚀 Deploying Multiverse Cricket to Production

Multiverse Cricket supports two deployment strategies:

---

## Option A: Single-Service Deployment on Render (Recommended & Easiest)

This approach deploys both the **Vite React frontend** and **Node.js SSE server** on a single free Render Web Service.

### Steps:
1. Push your project repository to GitHub or GitLab.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository containing **Multiverse Cricket**.
5. Configure the service settings:
   - **Name:** `multiverse-cricket`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. Click **Create Web Service**.
7. Render will automatically build the React app into `dist/` and launch the Node.js server.
8. Once deployed, open your Render live URL (e.g. `https://multiverse-cricket.onrender.com`).
9. Share the live URL with a friend — create a room on phone/PC and join on another device!

---

## Option B: Decoupled Deployment (Frontend on Vercel + Backend on Render)

### Step 1: Deploy Backend to Render
1. Create a new **Web Service** on [Render.com](https://render.com).
2. Set **Build Command:** `npm install`
3. Set **Start Command:** `npm start`
4. Once deployed, copy your backend URL (e.g. `https://multiverse-cricket-server.onrender.com`).

### Step 2: Deploy Frontend to Vercel
1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** and import your repository.
3. In **Environment Variables**, add:
   - **Key:** `VITE_SERVER_URL`
   - **Value:** `https://multiverse-cricket-server.onrender.com` (Your Render backend URL)
4. Click **Deploy**.

---

## 🎮 How to Play Live with 2 Players
1. Open your live app URL on your device.
2. Enter your name and click **Create Room**. You will see a 6-character Room Code (e.g., `CRIC88`).
3. Share the code `CRIC88` with your friend.
4. Have your friend open the live app URL on their phone/PC, enter their name and `CRIC88`, and click **Join Room**.
5. Click **Start Game** and enjoy real-time multiplayer cricket!
