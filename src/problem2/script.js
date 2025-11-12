// Local paths
const PRICES_JSON = './prices.json';
const TOKEN_ICON_BASE = './images';

// State
let tokenPrices = {};
let availableTokens = [];
let selectedFromCurrency = null;
let selectedToCurrency = null;
let isLoading = false;

// DOM Elements
const fromCurrencyBtn = document.getElementById('from-currency-btn');
const toCurrencyBtn = document.getElementById('to-currency-btn');
const fromCurrencyDropdown = document.getElementById('from-currency-dropdown');
const toCurrencyDropdown = document.getElementById('to-currency-dropdown');
const fromCurrencyList = document.getElementById('from-currency-list');
const toCurrencyList = document.getElementById('to-currency-list');
const fromSearch = document.getElementById('from-search');
const toSearch = document.getElementById('to-search');
const inputAmount = document.getElementById('input-amount');
const outputAmount = document.getElementById('output-amount');
const fromCurrencyIcon = document.getElementById('from-currency-icon');
const toCurrencyIcon = document.getElementById('to-currency-icon');
const fromCurrencySymbol = document.getElementById('from-currency-symbol');
const toCurrencySymbol = document.getElementById('to-currency-symbol');
const fromError = document.getElementById('from-error');
const toError = document.getElementById('to-error');
const rateInfo = document.getElementById('rate-info');
const swapArrowBtn = document.getElementById('swap-arrow-btn');
const submitBtn = document.getElementById('submit-btn');
const submitText = document.getElementById('submit-text');
const loadingSpinner = document.getElementById('loading-spinner');
const swapForm = document.getElementById('swap-form');

// Initialize
async function init() {
  try {
    await loadTokenPrices();
    renderCurrencyLists();
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to load token data. Please refresh the page.');
  }
}

// Load token prices from JSON file
async function loadTokenPrices() {
  try {
    const response = await fetch(PRICES_JSON);
    if (!response.ok) throw new Error('Failed to fetch prices');
    
    const data = await response.json();
    
    // Process array data - handle duplicates by taking the latest price (based on date)
    tokenPrices = {};
    const currencyMap = new Map();
    
    // First pass: collect all entries
    data.forEach(entry => {
      if (!entry.currency || !entry.price || entry.price <= 0) return;
      
      const currency = entry.currency;
      const date = new Date(entry.date);
      
      if (!currencyMap.has(currency) || currencyMap.get(currency).date < date) {
        currencyMap.set(currency, { price: entry.price, date: date });
      }
    });
    
    // Convert to object
    currencyMap.forEach((value, currency) => {
      tokenPrices[currency] = value.price;
    });
    
    // Filter tokens that have prices
    availableTokens = Object.keys(tokenPrices)
      .filter(token => tokenPrices[token] > 0)
      .sort();
    
    console.log(`Loaded ${availableTokens.length} tokens with prices`);
  } catch (error) {
    console.error('Error loading token prices:', error);
    throw error;
  }
}

// Get token icon URL - try SVG first, then PNG
function getTokenIconUrl(tokenSymbol) {
  const upperSymbol = tokenSymbol.toUpperCase();
  // Try SVG first, fallback to PNG if needed
  return `${TOKEN_ICON_BASE}/${upperSymbol}.svg`;
}

// Render currency lists
function renderCurrencyLists(filterFrom = '', filterTo = '') {
  const filteredFrom = availableTokens.filter(token => 
    token.toLowerCase().includes(filterFrom.toLowerCase())
  );
  const filteredTo = availableTokens.filter(token => 
    token.toLowerCase().includes(filterTo.toLowerCase())
  );

  fromCurrencyList.innerHTML = filteredFrom.map(token => 
    createCurrencyOption(token, 'from')
  ).join('');

  toCurrencyList.innerHTML = filteredTo.map(token => 
    createCurrencyOption(token, 'to')
  ).join('');
  
  // Attach image error handlers
  attachImageErrorHandlers();
}

// Create currency option HTML
function createCurrencyOption(tokenSymbol, type) {
  const iconUrl = getTokenIconUrl(tokenSymbol);
  const pngUrl = `${TOKEN_ICON_BASE}/${tokenSymbol.toUpperCase()}.png`;
  const price = tokenPrices[tokenSymbol];
  const isDisabled = (type === 'from' && tokenSymbol === selectedToCurrency) ||
                     (type === 'to' && tokenSymbol === selectedFromCurrency);
  
  return `
    <button 
      type="button" 
      class="currency-option" 
      data-token="${tokenSymbol}"
      data-type="${type}"
      ${isDisabled ? 'disabled' : ''}
    >
      <img 
        src="${iconUrl}" 
        alt="${tokenSymbol}" 
        class="currency-option-icon"
        data-png-fallback="${pngUrl}"
      />
      <span class="currency-option-symbol">${tokenSymbol}</span>
      <span class="currency-option-name">$${formatPrice(price)}</span>
    </button>
  `;
}

// Attach image error handlers to all currency option images
function attachImageErrorHandlers() {
  const images = document.querySelectorAll('.currency-option-icon');
  images.forEach(img => {
    img.onerror = function() {
      const pngUrl = this.getAttribute('data-png-fallback');
      if (pngUrl && this.src !== pngUrl) {
        this.onerror = function() {
          this.style.display = 'none';
        };
        this.src = pngUrl;
      } else {
        this.style.display = 'none';
      }
    };
  });
}

// Format price
function formatPrice(price) {
  if (price >= 1) {
    return price.toFixed(2);
  } else if (price >= 0.01) {
    return price.toFixed(4);
  } else {
    return price.toFixed(8);
  }
}

// Select currency
function selectCurrency(tokenSymbol, type) {
  if (type === 'from') {
    selectedFromCurrency = tokenSymbol;
    updateCurrencyDisplay(tokenSymbol, 'from');
    closeDropdown('from');
    fromSearch.value = '';
    renderCurrencyLists('', toSearch.value);
  } else {
    selectedToCurrency = tokenSymbol;
    updateCurrencyDisplay(tokenSymbol, 'to');
    closeDropdown('to');
    toSearch.value = '';
    renderCurrencyLists(fromSearch.value, '');
  }
  
  // Recalculate if amount is entered
  if (inputAmount.value) {
    calculateOutput();
  }
  
  updateRateInfo();
  validateForm();
}

// Update currency display
function updateCurrencyDisplay(tokenSymbol, type) {
  const icon = type === 'from' ? fromCurrencyIcon : toCurrencyIcon;
  const symbol = type === 'from' ? fromCurrencySymbol : toCurrencySymbol;
  const iconUrl = getTokenIconUrl(tokenSymbol);
  
  icon.src = iconUrl;
  icon.alt = tokenSymbol;
  icon.classList.add('show');
  symbol.textContent = tokenSymbol;
  
  // Handle image error - try PNG fallback
  icon.onerror = function() {
    const pngUrl = `${TOKEN_ICON_BASE}/${tokenSymbol.toUpperCase()}.png`;
    if (this.src !== pngUrl) {
      this.src = pngUrl;
      this.onerror = function() {
        this.style.display = 'none';
      };
    } else {
      this.style.display = 'none';
    }
  };
  
  // Update balance (mock balance for demo)
  const balanceEl = type === 'from' ? document.getElementById('from-balance') : document.getElementById('to-balance');
  const mockBalance = (Math.random() * 1000).toFixed(4);
  balanceEl.textContent = `Balance: ${mockBalance}`;
}

// Toggle dropdown
function toggleDropdown(type) {
  const dropdown = type === 'from' ? fromCurrencyDropdown : toCurrencyDropdown;
  const btn = type === 'from' ? fromCurrencyBtn : toCurrencyBtn;
  const isOpen = dropdown.classList.contains('show');
  
  // Close all dropdowns first
  closeDropdown('from');
  closeDropdown('to');
  
  if (!isOpen) {
    dropdown.classList.add('show');
    btn.classList.add('active');
    const searchInput = type === 'from' ? fromSearch : toSearch;
    setTimeout(() => searchInput.focus(), 100);
  }
}

// Close dropdown
function closeDropdown(type) {
  const dropdown = type === 'from' ? fromCurrencyDropdown : toCurrencyDropdown;
  const btn = type === 'from' ? fromCurrencyBtn : toCurrencyBtn;
  dropdown.classList.remove('show');
  btn.classList.remove('active');
}

// Calculate output amount
function calculateOutput() {
  clearError('from');
  clearError('to');
  
  const amount = parseFloat(inputAmount.value);
  
  if (!selectedFromCurrency || !selectedToCurrency) {
    outputAmount.value = '';
    return;
  }
  
  if (!amount || amount <= 0) {
    outputAmount.value = '';
    updateRateInfo();
    return;
  }
  
  const fromPrice = tokenPrices[selectedFromCurrency];
  const toPrice = tokenPrices[selectedToCurrency];
  
  if (!fromPrice || !toPrice) {
    outputAmount.value = '';
    return;
  }
  
  // Calculate: amount * (fromPrice / toPrice)
  const exchangeRate = fromPrice / toPrice;
  const output = amount * exchangeRate;
  
  outputAmount.value = output.toFixed(8);
  updateRateInfo(exchangeRate);
}

// Update rate info
function updateRateInfo(exchangeRate = null) {
  if (!selectedFromCurrency || !selectedToCurrency) {
    rateInfo.classList.remove('show');
    return;
  }
  
  if (exchangeRate === null) {
    const fromPrice = tokenPrices[selectedFromCurrency];
    const toPrice = tokenPrices[selectedToCurrency];
    if (fromPrice && toPrice) {
      exchangeRate = fromPrice / toPrice;
    } else {
      rateInfo.classList.remove('show');
      return;
    }
  }
  
  rateInfo.textContent = `1 ${selectedFromCurrency} = ${exchangeRate.toFixed(6)} ${selectedToCurrency}`;
  rateInfo.classList.add('show');
}

// Validate form
function validateForm() {
  let isValid = true;
  
  // Check if currencies are selected
  if (!selectedFromCurrency) {
    showError('Please select a currency to send', 'from');
    isValid = false;
  } else {
    clearError('from');
  }
  
  if (!selectedToCurrency) {
    showError('Please select a currency to receive', 'to');
    isValid = false;
  } else {
    clearError('to');
  }
  
  // Check if currencies are different
  if (selectedFromCurrency && selectedToCurrency && selectedFromCurrency === selectedToCurrency) {
    showError('Cannot swap the same currency', 'from');
    showError('Cannot swap the same currency', 'to');
    isValid = false;
  }
  
  // Check amount
  const amount = parseFloat(inputAmount.value);
  if (!amount || amount <= 0) {
    showError('Please enter a valid amount', 'from');
    isValid = false;
  }
  
  // Check balance (mock check)
  const balance = parseFloat(document.getElementById('from-balance').textContent.replace('Balance: ', ''));
  if (amount > balance) {
    showError('Insufficient balance', 'from');
    isValid = false;
  }
  
  submitBtn.disabled = !isValid || isLoading;
  
  return isValid;
}

// Show error
function showError(message, type) {
  const errorEl = type === 'from' ? fromError : toError;
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

// Clear error
function clearError(type) {
  const errorEl = type === 'from' ? fromError : toError;
  errorEl.textContent = '';
  errorEl.classList.remove('show');
}

// Swap currencies
function swapCurrencies() {
  if (!selectedFromCurrency || !selectedToCurrency) return;
  
  const temp = selectedFromCurrency;
  selectedFromCurrency = selectedToCurrency;
  selectedToCurrency = temp;
  
  const tempAmount = inputAmount.value;
  inputAmount.value = outputAmount.value;
  outputAmount.value = tempAmount;
  
  updateCurrencyDisplay(selectedFromCurrency, 'from');
  updateCurrencyDisplay(selectedToCurrency, 'to');
  
  calculateOutput();
  validateForm();
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  if (!validateForm() || isLoading) return;
  
  isLoading = true;
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  loadingSpinner.classList.add('show');
  submitText.textContent = 'Processing...';
  
  // Simulate API call with timeout
  setTimeout(() => {
    isLoading = false;
    submitBtn.classList.remove('loading');
    loadingSpinner.classList.remove('show');
    submitText.textContent = 'CONFIRM SWAP';
    
    // Show success message
    const successMessage = `Successfully swapped ${inputAmount.value} ${selectedFromCurrency} for ${outputAmount.value} ${selectedToCurrency}!`;
    alert(successMessage);
    
    // Reset form
    inputAmount.value = '';
    outputAmount.value = '';
    rateInfo.classList.remove('show');
    validateForm();
  }, 2000);
}

// Setup event listeners
function setupEventListeners() {
  // Currency button clicks
  fromCurrencyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('from');
  });
  
  toCurrencyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('to');
  });
  
  // Currency option clicks
  fromCurrencyList.addEventListener('click', (e) => {
    const option = e.target.closest('.currency-option');
    if (option && !option.disabled) {
      const token = option.dataset.token;
      selectCurrency(token, 'from');
    }
  });
  
  toCurrencyList.addEventListener('click', (e) => {
    const option = e.target.closest('.currency-option');
    if (option && !option.disabled) {
      const token = option.dataset.token;
      selectCurrency(token, 'to');
    }
  });
  
  // Search inputs
  fromSearch.addEventListener('input', (e) => {
    renderCurrencyLists(e.target.value, toSearch.value);
  });
  
  toSearch.addEventListener('input', (e) => {
    renderCurrencyLists(fromSearch.value, e.target.value);
  });
  
  // Amount input
  inputAmount.addEventListener('input', () => {
    calculateOutput();
    validateForm();
  });
  
  // Swap arrow button
  swapArrowBtn.addEventListener('click', swapCurrencies);
  
  // Form submission
  swapForm.addEventListener('submit', handleSubmit);
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.currency-selector')) {
      closeDropdown('from');
      closeDropdown('to');
    }
  });
  
  // Escape key to close dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown('from');
      closeDropdown('to');
    }
  });
}

// Initialize on load
init();

