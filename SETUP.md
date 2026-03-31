# Futures Edge AI — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- An Anthropic API key

## 1. Install Dependencies
```bash
npm install
```

## 2. Set Up Supabase

1. Go to supabase.com and create a new project
2. In the SQL Editor, run the contents of `supabase/schema.sql`
3. Go to Project Settings -> API
4. Copy your Project URL and anon/public key

## 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

## 4. Run the App
```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

```bash
npx vercel --prod
```

Add your environment variables in the Vercel dashboard.

## Example CSV Format

```
Date,Ticker,Direction,Entry Price,Exit Price,Position Size,PnL,Time,Notes
2024-01-15,ES,long,4800.25,4815.50,2,612.50,09:45,Good momentum trade
2024-01-15,NQ,short,16500.00,16480.00,1,400.00,14:30,
2024-01-16,CL,long,72.50,72.10,3,-360.00,10:15,Stopped out
2024-01-17,ES,long,4820.00,4810.00,2,-400.00,09:35,FOMO trade
2024-01-17,ES,short,4808.00,4795.00,1,325.00,11:00,
```

## Sample AI Outputs

**Insights:**
- "You lose most money between 9:30-10:00 AM -- 73% of your morning trades result in losses"
- "After 2 consecutive losses, your next trade loses 68% of the time -- a classic revenge trading pattern"
- "Your average loss ($412) is 2.3x bigger than your average win ($178)"
- "On days with more than 6 trades, you lose money 80% of the time"

**Next Trade Prediction:**
- Win probability: 42%
- "Statistically, you are more likely to lose on your next trade. You have taken 4 trades today and historically perform worse after 3+ trades in a session."

**Rules Analysis:**
- "You exceeded your max trades/day rule on 8 of 15 trading days (53%)"
- "Breaking your max trades rule correlates with 78% of your losing days"
