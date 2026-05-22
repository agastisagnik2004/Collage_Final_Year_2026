# Classroom Monitor — Local Setup Guide

## Requirements
- Python 3.11+  →  https://python.org/downloads
- Node.js 18+   →  https://nodejs.org

---

## Step 1 — MongoDB Atlas (free database)

1. Go to https://cloud.mongodb.com and create a free account
2. Create a free M0 cluster
3. Under "Database Access" → Add a database user (username + password)
4. Under "Network Access" → Add IP Address → Allow from anywhere (0.0.0.0/0)
5. Click "Connect" → "Compass" → copy the connection string
   It looks like: mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/

---

## Step 2 — Gmail App Password (for OTP emails)

1. Go to your Google Account → Security → 2-Step Verification (enable it)
2. Then go to Security → App passwords
3. Create a new app password → name it "Classroom Monitor"
4. Copy the 16-character password shown

---

## Step 3 — Configure backend environment

Copy the example file and fill in your values:
```
cd backend
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb atlas url
SESSION_SECRET=any-random-long-string-here-make-it-long
ADMIN_EMAIL=the-email-you-will-use-to-log-in-as-admin@gmail.com
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
```

---

## Step 4 — Run the backend

Open a terminal in the `backend/` folder:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

You should see: ✅ Connected to MongoDB Atlas

---

## Step 5 — Run the frontend

Open a NEW terminal in the `frontend/` folder:

```bash
npm install
npm run dev
```

You should see: Local: http://localhost:5173

---

## Step 6 — Open the app

Go to http://localhost:5173 in your browser.

---

## How to use

### Teacher flow
1. Click "Teacher" on the role screen
2. Register with your name, email and password
3. Fill in the schedule form (date, start/end time, room)
4. You'll see the live 4-camera dashboard
5. Click "📡 Sources" to enter your IP webcam URLs
6. Use the "IP Webcam" Android app for live camera streams

### Admin flow
1. Click "Admin" on the role screen
2. Enter the email you set as ADMIN_EMAIL in .env
3. Check that email for a 6-digit OTP (check spam too)
4. Enter the OTP to log in
5. You'll see the live camera grid immediately
6. Use "+ New Session" button to log a monitoring session
7. Use "📋 Sessions" to view your session history

---

## IP Webcam (live camera feeds)

1. Install "IP Webcam" app on Android phone
2. Open app → scroll to bottom → tap "Start server"
3. Note the URL shown (e.g. http://192.168.1.42:8080)
4. In the app dashboard, click "📡 Sources"
5. Enter: http://192.168.1.42:8080/video  for each camera

Note: Your phone and computer must be on the same WiFi network.

