# SGA Student Stage Tracker

A React app that lets students look up their current stage and full progress history from the SGA Student Management Google Sheet.

---

## Before You Start — Two Things You Need

### 1. Make the Google Sheet publicly readable

The app reads data from Google Sheets using an API key. For this to work, the sheet must be set to "Anyone with the link can view":

1. Open your Google Sheet
2. Click **Share** (top right)
3. Under General access, change to **Anyone with the link**
4. Set permission to **Viewer**
5. Click **Done**

### 2. Get a Google Sheets API Key

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Click **Enable APIs and Services** → search **Google Sheets API** → Enable it
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key
6. (Optional but recommended) Click **Restrict Key** → under API restrictions, select **Google Sheets API**

---

## Setup

1. Clone or download this project folder

2. Copy the example env file:
   ```
   cp .env.example .env
   ```

3. Open `.env` and fill in your values:
   ```
   VITE_SHEET_ID=your_sheet_id_here
   VITE_API_KEY=your_api_key_here
   ```

   Your Sheet ID is in the URL of your Google Sheet:
   `https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit`

4. Install dependencies:
   ```
   npm install
   ```

5. Run locally to test:
   ```
   npm run dev
   ```

---

## Deploy to Vercel (Free)

1. Push this project to a **GitHub repository**

2. Go to https://vercel.com and sign in with GitHub

3. Click **Add New Project** → import your repository

4. Before clicking Deploy, go to **Environment Variables** and add:
   - `VITE_SHEET_ID` → your Sheet ID
   - `VITE_API_KEY` → your API key

5. Click **Deploy** — Vercel gives you a live URL in about 30 seconds

---

## Embed on Wix

1. In your Wix editor, add an **Embed** element (Insert → Embed → Embed a Site)
2. Paste your Vercel URL (e.g. `https://sga-tracker.vercel.app`)
3. Resize to fit your page layout
4. Publish

---

## How It Works

1. Student visits your website and opens the tracker
2. They enter their Student ID (e.g. SGA2601DGCA)
3. The app reads the **Students Index** sheet to find their record
4. It then reads their **individual sheet** to get the full stage history
5. Displays: name, course, current stage, progress bar, and full timeline

---

## What Students See

- Their name and course
- Current stage (highlighted with color)
- Progress bar (for non-terminal stages)
- Full stage history timeline with dates and notes
- Contact details for Star Glider Aviation

---

## Notes

- The sheet must remain publicly viewable for the app to work
- The API key is safe to use in a frontend app as long as it is restricted to the Google Sheets API only
- Stage history is read from rows 10–25 of the individual student sheet
