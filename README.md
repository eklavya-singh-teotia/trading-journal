# Intraday Trading Journal

An intraday trading journal application built to parse broker CSV tradebooks, process trade executions using a FIFO matching engine, calculate performance analytics, and deliver AI-powered behavioral feedback.

## Features

- **CSV Import**: Parses trade execution reports from brokers like Upstox and Zerodha.
- **FIFO Matching Engine**: Automatically pairs buy and sell transactions to derive closed trades and realized PnL.
- **Performance Analytics**: Computes overall metrics (Win Rate, Profit Factor, Expectancy) along with time-of-day and day-of-week breakdowns.
- **Behavioral & AI Insights**: Evaluates psychological leaks (revenge trading, over-leveraging) using rule-based metrics and the Gemini AI API.
- **Authentication**: Multi-user support with JWT authentication.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **AI Integration**: Google Gemini API

## Project Structure

```
intraday/
├── backend/       # Express API server & business logic
├── frontend/      # React dashboard SPA
└── .gitignore     # Global Git ignore file
```

## Setup & Installation

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or MongoDB Atlas)

### 1. Environment Configuration

Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/intraday_journal
ACCESS_TOKEN_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGIN=http://localhost:5173
```

### 2. Install Dependencies

Install packages for both the backend and frontend:

```bash
# Backend installation
cd backend
npm install

# Frontend installation
cd ../frontend
npm install
```

### 3. Running the Application

Start the backend server:

```bash
cd backend
npm run dev
```

In a separate terminal, start the frontend development server:

```bash
cd frontend
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## Usage

1. Register a new account or log in.
2. Upload your broker's tradebook CSV (Upstox or Zerodha format).
3. The FIFO matching engine processes your executions into closed trades.
4. View your performance dashboard — win rate, profit factor, expectancy, and time-based breakdowns.
5. Review AI-generated behavioral insights to spot patterns like revenge trading or over-leveraging.

## License

This project is licensed under the MIT License.
