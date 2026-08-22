# Tradr — Trading Journal

Tradr is a trading journal built specifically for intraday traders. It helps traders import and organize their trades, automatically match executions, track performance across multiple accounts, and identify behavioral patterns that affect trading decisions.

<a href="tradr-ruddy.vercel.app" target="_blank">Tradr</a>

## Features

* **Multi-account support** — manage trades across multiple trading accounts.
* **Broker imports** — supports `.csv`, `.xlsx`, and `.xls` files from **Upstox, Zerodha, and Groww**.
* **Upstox integration** — connect directly to Upstox and import trading data through its API.
* **FIFO matching engine** — matches executions into closed trades and calculates realized PnL.
* **Performance analytics** — Win Rate, Profit Factor, Expectancy, PnL, and time/day-based performance.
* **Discipline Score** — evaluates trading discipline based on historical trading behavior.
* **Behavioral insights** — identifies patterns such as revenge trading, overtrading, over-leveraging, and other behavioral leaks.
* **AI insights** — uses Google Gemini to provide contextual analysis and feedback.
* **Algorithmic backup engine** — rule-based behavioral analysis acts as a fallback when AI analysis is unavailable.

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Recharts
* **Backend:** Node.js, Express.js
* **Database:** MongoDB, Mongoose
* **Authentication:** JWT
* **AI:** Google Gemini API
* **Broker API:** Upstox

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd intraday
```

### 2. Configure backend environment

Create `.env` inside `backend/`:

```env
PORT=
MONGODB_URL=
CORS_ORIGIN=
FRONTEND_URL=

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=

UPSTOX_CLIENT_ID=
UPSTOX_CLIENT_SECRET=
UPSTOX_REDIRECT_URI=
UPSTOX_OAUTH_STATE_SECRET=

GEMINI_API_KEY=
GEMINI_MODEL=
```

Fill in the required values for MongoDB, JWT authentication, Upstox OAuth, and Gemini.

### 3. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Run the application

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## How It Works

1. Create an account and log in.
2. Add or select a trading account.
3. Import broker data using CSV/Excel or connect directly to Upstox.
4. Tradr processes executions through its FIFO matching engine.
5. View PnL and performance analytics.
6. Analyze historical behavior through the discipline score and behavioral engine.
7. Get deeper AI-powered insights using Gemini.

## License

MIT

