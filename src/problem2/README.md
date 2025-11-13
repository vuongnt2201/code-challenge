# Problem 2: Currency Swap Form

A modern, responsive currency swap interface built with vanilla JavaScript and Vite.

## Features

- **Currency Selection**: Searchable dropdown with 500+ cryptocurrencies
- **Real-time Exchange**: Live calculation based on token prices
- **Smart Validation**: Input validation with balance checking
- **Swap Function**: Quick swap between from/to currencies
- **Loading States**: Animated loading indicator for form submission
- **Responsive Design**: Modern UI with smooth animations
- **Error Handling**: User-friendly error messages and fallback images

## Tech Stack

- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with animations
- **Local JSON** - Token price data

## Setup & Run

```bash
npm install
npm run dev
```

## How It Works

1. Select "from" currency and enter amount
2. Select "to" currency  
3. Exchange rate and output amount calculated automatically
4. Click "CONFIRM SWAP" to submit (2s mock delay)

## Data Sources

- **Token Images**: `/images` directory (533 SVGs + 2 PNGs)
- **Token Prices**: `prices.json` (latest prices by currency)
- **Supported Tokens**: Only tokens with valid prices shown

## Key Interactions

- Search to filter currencies
- Click swap arrow to reverse currencies
- Form validates: amount > 0, balance sufficient, different currencies
- Submit button disabled until form valid

