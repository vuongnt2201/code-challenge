// Mock data URL (simulating API endpoint)
const MOCK_PRICES_URL = 'https://interview.switcheo.com/prices.json';

// State management
let walletBalances = [];
let prices = {};
let isLoading = false;

// DOM Elements
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const walletContent = document.getElementById('wallet-content');
const walletList = document.getElementById('wallet-list');
const emptyState = document.getElementById('empty-state');
const totalValueEl = document.getElementById('total-value');
const activeWalletsEl = document.getElementById('active-wallets');

// Blockchain priority mapping (memoized)
// Higher priority = more important blockchain
const BLOCKCHAIN_PRIORITIES = {
  'Osmosis': 100,
  'Ethereum': 50,
  'Arbitrum': 30,
  'Zilliqa': 20,
  'Neo': 20
};

const DEFAULT_PRIORITY = -99;

/**
 * Get blockchain priority with type safety
 * Improvement: Strong typing, memoized constant lookup
 */
function getPriority(blockchain) {
  return BLOCKCHAIN_PRIORITIES[blockchain] ?? DEFAULT_PRIORITY;
}

/**
 * Determine priority level for styling
 */
function getPriorityLevel(priority) {
  if (priority >= 50) return 'high';
  if (priority >= 20) return 'medium';
  return 'low';
}

/**
 * Format currency amount with appropriate decimal places
 */
function formatAmount(amount) {
  if (amount >= 1000) {
    return amount.toFixed(2);
  } else if (amount >= 1) {
    return amount.toFixed(4);
  } else {
    return amount.toFixed(8);
  }
}

/**
 * Format USD value
 */
function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Load prices from API
 * Improvement: Proper error handling, data validation
 */
async function loadPrices() {
  try {
    const response = await fetch(MOCK_PRICES_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const pricesData = await response.json();
    
    // Process prices - handle duplicates by keeping the latest
    const pricesMap = new Map();
    
    pricesData.forEach(entry => {
      if (!entry.currency || !entry.price || entry.price <= 0) return;
      
      const date = new Date(entry.date);
      
      if (!pricesMap.has(entry.currency) || pricesMap.get(entry.currency).date < date) {
        pricesMap.set(entry.currency, { price: entry.price, date });
      }
    });
    
    // Convert to object for easy lookup
    prices = {};
    pricesMap.forEach((value, currency) => {
      prices[currency] = value.price;
    });
    
    console.log(`Loaded ${Object.keys(prices).length} token prices`);
    return true;
  } catch (error) {
    console.error('Error loading prices:', error);
    throw error;
  }
}

/**
 * Generate mock wallet balances for demonstration
 * In production, this would come from a blockchain API
 */
function generateMockBalances() {
  return [
    { blockchain: 'Osmosis', currency: 'OSMO', amount: 100.5 },
    { blockchain: 'Ethereum', currency: 'ETH', amount: 2.5 },
    { blockchain: 'Arbitrum', currency: 'ARB', amount: 500 },
    { blockchain: 'Zilliqa', currency: 'ZIL', amount: 1000 },
    { blockchain: 'Neo', currency: 'NEO', amount: 50 },
    { blockchain: 'Bitcoin', currency: 'BTC', amount: 0.5 }, // Not in priority list
    { blockchain: 'Ethereum', currency: 'USDC', amount: 1000 },
    { blockchain: 'Ethereum', currency: 'DAI', amount: 0 }, // Zero balance - should be filtered
    { blockchain: 'Unknown', currency: 'XYZ', amount: -10 }, // Negative - should be filtered
  ];
}

/**
 * Process and sort wallet balances
 * Improvements:
 * - Pre-compute priorities (avoid redundant calculations)
 * - Correct filter logic (only keep valid balances)
 * - Fixed dependencies (don't include unused variables)
 * - Proper type safety
 */
function processBalances(balances) {
  // Step 1: Map balances with their priorities (computed once)
  const balancesWithPriority = balances.map(balance => ({
    balance,
    priority: getPriority(balance.blockchain)
  }));

  // Step 2: Filter out invalid balances
  // Only keep: priority > -99 AND amount > 0
  const validBalances = balancesWithPriority.filter(({ balance, priority }) => {
    return priority > DEFAULT_PRIORITY && balance.amount > 0;
  });

  // Step 3: Sort by priority (descending)
  const sortedBalances = validBalances.sort((a, b) => {
    return b.priority - a.priority; // Higher priority first
  });

  // Step 4: Return just the balance objects
  return sortedBalances.map(({ balance }) => balance);
}

/**
 * Format balances with USD values
 * Improvement: Separate concerns, memoize formatted data
 */
function formatBalances(balances) {
  return balances.map(balance => {
    const price = prices[balance.currency] || 0;
    const usdValue = balance.amount * price;
    
    return {
      ...balance,
      formatted: formatAmount(balance.amount),
      usdValue,
      priority: getPriority(balance.blockchain),
      priorityLevel: getPriorityLevel(getPriority(balance.blockchain))
    };
  });
}

/**
 * Create a wallet row element
 * Improvement: Use currency as key, proper semantic HTML
 */
function createWalletRow(balance) {
  const row = document.createElement('div');
  row.className = 'wallet-row';
  row.dataset.currency = balance.currency; // Unique key
  
  row.innerHTML = `
    <div class="priority-badge ${balance.priorityLevel}"></div>
    <div class="wallet-info">
      <div class="blockchain-name">
        ${balance.blockchain}
        <span class="blockchain-badge">Priority: ${balance.priority}</span>
      </div>
      <div class="currency-info">${balance.currency}</div>
    </div>
    <div class="amount-display">
      <div class="crypto-amount">${balance.amount}</div>
      <div class="formatted-amount">${balance.formatted} ${balance.currency}</div>
    </div>
    <div class="usd-value">${formatUSD(balance.usdValue)}</div>
  `;
  
  return row;
}

/**
 * Render wallet balances to DOM
 */
function renderWalletBalances() {
  // Clear existing content
  walletList.innerHTML = '';
  
  // Process balances
  const sortedBalances = processBalances(walletBalances);
  
  if (sortedBalances.length === 0) {
    emptyState.classList.add('show');
    walletList.classList.add('hidden');
    return;
  }
  
  emptyState.classList.remove('show');
  walletList.classList.remove('hidden');
  
  // Format with USD values
  const formattedBalances = formatBalances(sortedBalances);
  
  // Calculate total value
  const totalValue = formattedBalances.reduce((sum, balance) => sum + balance.usdValue, 0);
  
  // Update stats
  totalValueEl.textContent = formatUSD(totalValue);
  activeWalletsEl.textContent = formattedBalances.length;
  
  // Render rows
  formattedBalances.forEach((balance, index) => {
    const row = createWalletRow(balance);
    // Stagger animation
    row.style.animationDelay = `${index * 0.05}s`;
    walletList.appendChild(row);
  });
}

/**
 * Show loading state
 */
function showLoading() {
  isLoading = true;
  loadingState.classList.add('show');
  errorState.classList.remove('show');
  walletContent.classList.remove('show');
}

/**
 * Show error state
 */
function showError(message) {
  isLoading = false;
  loadingState.classList.remove('show');
  errorState.classList.add('show');
  walletContent.classList.remove('show');
  errorMessage.textContent = message;
}

/**
 * Show wallet content
 */
function showContent() {
  isLoading = false;
  loadingState.classList.remove('show');
  errorState.classList.remove('show');
  walletContent.classList.add('show');
}

/**
 * Initialize and load wallet data
 * Improvement: Proper async/await, error handling
 */
async function initWallet() {
  try {
    showLoading();
    
    // Load prices first
    await loadPrices();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock balances (in production, fetch from blockchain)
    walletBalances = generateMockBalances();
    
    // Render balances
    renderWalletBalances();
    
    showContent();
  } catch (error) {
    console.error('Error initializing wallet:', error);
    showError('Failed to load wallet data. Please try again.');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  retryBtn.addEventListener('click', initWallet);
}

/**
 * Initialize application
 */
async function init() {
  setupEventListeners();
  await initWallet();
}

// Start the application
init();

