# Problem 3 - Code Analysis & Refactoring

## Question

**List out the computational inefficiencies and anti-patterns found in the provided WalletPage React component code.**

This document provides a comprehensive analysis of the issues found and demonstrates the refactored solution.

---

## Answer: Computational Inefficiencies & Anti-Patterns

### 1. ❌ **Critical Bug: Undefined Variable Reference**

**Issue Found:**
```typescript
const balancePriority = getPriority(balance.blockchain);
if (lhsPriority > -99) { // ERROR: lhsPriority is not defined
```

**Problem:**
- Variable `balancePriority` is declared but then `lhsPriority` is used
- This will throw a `ReferenceError` at runtime
- The application will crash immediately when filtering balances

**How to Fix:**
```typescript
const balancePriority = getPriority(balance.blockchain);
if (balancePriority > -99) { // Use the correct variable name
```

---

### 2. ❌ **Logic Error: Inverted Filter Condition**

**Issue Found:**
```typescript
if (balancePriority > -99) {
  if (balance.amount <= 0) {
    return true; // Keeping balances with zero or negative amounts!
  }
}
return false;
```

**Problem:**
- The filter logic is backwards
- It **keeps** balances with `amount <= 0` (invalid)
- It **removes** balances with `amount > 0` (valid)
- This means only empty/negative wallets are displayed

**How to Fix:**
```typescript
// Keep balances that have valid priority AND positive amount
return balancePriority > -99 && balance.amount > 0;
```

---

### 3. ❌ **Type Safety: Missing Interface Property**

**Issue Found:**
```typescript
interface WalletBalance {
  currency: string;
  amount: number;
  // blockchain is missing!
}

// But the code uses:
balance.blockchain // TypeScript error!
```

**Problem:**
- The interface doesn't include `blockchain` property
- TypeScript will show compilation errors
- No type safety for blockchain-related operations

**How to Fix:**
```typescript
interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string; // Add missing property
}
```

---

### 4. ❌ **Type Safety: Using `any` Type**

**Issue Found:**
```typescript
const getPriority = (blockchain: any): number => {
```

**Problem:**
- Using `any` defeats the purpose of TypeScript
- No compile-time type checking
- Allows any value to be passed without validation

**How to Fix:**
```typescript
// Use proper typing
const getPriority = (blockchain: string): number => {

// Or use union types for better safety
type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';
const getPriority = (blockchain: Blockchain | string): number => {
```

---

### 5. ❌ **Performance: Incorrect useMemo Dependencies**

**Issue Found:**
```typescript
const sortedBalances = useMemo(() => {
  return balances.filter(...).sort(...);
}, [balances, prices]); // prices is not used!
```

**Problem:**
- `prices` is in the dependency array but **never used** in the computation
- This causes unnecessary recalculations whenever prices change
- The entire filter/sort operation runs even though the result won't change

**How to Fix:**
```typescript
// Remove unused dependency
const sortedBalances = useMemo(() => {
  return balances.filter(...).sort(...);
}, [balances]); // Only depend on what's actually used
```

---

### 6. ❌ **Performance: Redundant Function Calls (O(n log n) complexity)**

**Issue Found:**
```typescript
// In filter: getPriority called once per item = O(n)
const balancePriority = getPriority(balance.blockchain);

// In sort: getPriority called twice per comparison
const leftPriority = getPriority(lhs.blockchain);   // Call 1
const rightPriority = getPriority(rhs.blockchain);  // Call 2
```

**Problem:**
- Sorting typically makes ~O(n log n) comparisons
- Each comparison calls `getPriority` twice
- Total calls: O(n) + O(n log n) ≈ **O(n log n) redundant calculations**
- For 100 items, that's potentially 600+ unnecessary function calls

**How to Fix:**
```typescript
// Pre-compute priorities once
const balancesWithPriority = balances.map(balance => ({
  balance,
  priority: getPriority(balance.blockchain)
}));

// Now filter and sort use pre-computed values (O(n) total)
return balancesWithPriority
  .filter(({ priority, balance }) => priority > -99 && balance.amount > 0)
  .sort((a, b) => b.priority - a.priority)
  .map(({ balance }) => balance);
```

---

### 7. ❌ **Incomplete Sort Comparator**

**Issue Found:**
```typescript
if (leftPriority > rightPriority) {
  return -1;
} else if (rightPriority > leftPriority) {
  return 1;
}
// No return statement for equal priorities!
```

**Problem:**
- Missing return value when priorities are equal
- Returns `undefined` in this case
- Causes unpredictable sorting behavior
- Violates sort comparator contract

**How to Fix:**
```typescript
// Explicit handling of all cases
if (leftPriority > rightPriority) {
  return -1;
} else if (rightPriority > leftPriority) {
  return 1;
} else {
  return 0; // Equal priorities
}

// Or simplified:
return rightPriority - leftPriority;
```

---

### 8. ❌ **Wasted Computation: Unused Variable**

**Issue Found:**
```typescript
const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
  return {
    ...balance,
    formatted: balance.amount.toFixed()
  }
})
// formattedBalances is created but NEVER used!

const rows = sortedBalances.map(...) // Uses sortedBalances instead
```

**Problem:**
- `formattedBalances` is computed on every render
- The computation result is discarded
- Wastes CPU cycles creating objects that are immediately garbage collected

**How to Fix:**
```typescript
// Option 1: Remove it entirely
// Option 2: Actually use it for rendering
const rows = formattedBalances.map(...)
```

---

### 9. ❌ **Type Mismatch: Wrong Type Annotation**

**Issue Found:**
```typescript
const rows = sortedBalances.map((balance: FormattedWalletBalance, index) => {
  // sortedBalances is WalletBalance[], not FormattedWalletBalance[]!
  return (
    <WalletRow 
      formattedAmount={balance.formatted} // ERROR: .formatted doesn't exist!
    />
  )
})
```

**Problem:**
- `sortedBalances` has type `WalletBalance[]`
- Code tries to use it as `FormattedWalletBalance[]`
- Accessing `balance.formatted` will be `undefined`
- Runtime error when passing to WalletRow component

**How to Fix:**
```typescript
// Use the correctly formatted balances
const rows = formattedBalances.map((balance: FormattedWalletBalance, index) => {
  // Now balance.formatted exists
})
```

---

### 10. ❌ **React Anti-Pattern: Array Index as Key**

**Issue Found:**
```typescript
<WalletRow 
  key={index} // Using array index as key
  {...props}
/>
```

**Problem:**
- When list order changes (due to sorting), React can't track components properly
- Can cause:
  - Incorrect component state
  - Performance issues (unnecessary re-renders)
  - Animation glitches
  - Form input state getting mixed up
- Violates React's key prop best practices

**How to Fix:**
```typescript
<WalletRow 
  key={balance.currency} // Use unique, stable identifier
  {...props}
/>
```

---

### 11. ❌ **Missing Memoization**

**Issue Found:**
```typescript
const formattedBalances = sortedBalances.map(...) // Runs on every render
const rows = sortedBalances.map(...)              // Runs on every render
```

**Problem:**
- These computations run on every component render
- Even if `sortedBalances` and `prices` haven't changed
- Creates new array objects on every render
- Causes child components to re-render unnecessarily

**How to Fix:**
```typescript
const formattedBalances = useMemo(() => {
  return sortedBalances.map(...);
}, [sortedBalances]);

const rows = useMemo(() => {
  return formattedBalances.map(...);
}, [formattedBalances, prices]);
```

---

### 12. ❌ **Missing Function Memoization**

**Issue Found:**
```typescript
const getPriority = (blockchain: any): number => {
  // Function recreated on every render
}
```

**Problem:**
- New function instance created on every render
- If passed as dependency to useMemo/useCallback, causes unnecessary recalculations
- Not a huge issue here, but better practice to memoize

**How to Fix:**
```typescript
const getPriority = useCallback((blockchain: string): number => {
  switch (blockchain) {
    case 'Osmosis': return 100;
    case 'Ethereum': return 50;
    case 'Arbitrum': return 30;
    case 'Zilliqa': return 20;
    case 'Neo': return 20;
    default: return -99;
  }
}, []); // No dependencies, stable reference
```

---

### 13. ⚠️ **Code Smell: Empty Interface**

**Issue Found:**
```typescript
interface Props extends BoxProps {
  // Empty - why does this exist?
}
```

**Problem:**
- Adds no value
- Could just use `BoxProps` directly
- Creates unnecessary type alias

**How to Fix:**
```typescript
// Option 1: Remove it
const WalletPage: React.FC<BoxProps> = (props) => {

// Option 2: Add actual props
interface Props extends BoxProps {
  onBalanceClick?: (currency: string) => void;
}
```

---

## Summary Table

| # | Issue | Severity | Performance Impact | Fix Difficulty |
|---|-------|----------|-------------------|----------------|
| 1 | Undefined variable `lhsPriority` | 🔴 Critical | App Crash | Easy |
| 2 | Inverted filter logic | 🔴 Critical | Wrong Results | Easy |
| 3 | Missing `blockchain` in interface | 🔴 Critical | Type Error | Easy |
| 4 | Using `any` type | 🟡 Medium | None | Easy |
| 5 | Wrong useMemo dependencies | 🟡 Medium | Unnecessary rerenders | Easy |
| 6 | Redundant getPriority calls | 🟠 High | O(n log n) overhead | Medium |
| 7 | Incomplete sort comparator | 🟡 Medium | Unpredictable sort | Easy |
| 8 | Unused `formattedBalances` | 🟡 Medium | Wasted CPU | Easy |
| 9 | Type mismatch in rows | 🔴 Critical | Runtime error | Easy |
| 10 | Index as React key | 🟠 High | Poor reconciliation | Easy |
| 11 | Missing memoization | 🟡 Medium | Unnecessary rerenders | Easy |
| 12 | getPriority not memoized | 🟢 Low | Minor | Easy |
| 13 | Empty interface | 🟢 Low | None | Easy |

---

## Complete Refactored Solution

```typescript
interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string; // ✅ Added missing property
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

const WalletPage: React.FC<BoxProps> = (props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // ✅ Memoized with proper typing
  const getPriority = useCallback((blockchain: string): number => {
    switch (blockchain) {
      case 'Osmosis':
        return 100;
      case 'Ethereum':
        return 50;
      case 'Arbitrum':
        return 30;
      case 'Zilliqa':
      case 'Neo':
        return 20;
      default:
        return -99;
    }
  }, []);

  // ✅ Pre-compute priorities, correct filter logic, proper dependencies
  const sortedBalances = useMemo(() => {
    // Compute priorities once
    const balancesWithPriority = balances.map((balance) => ({
      balance,
      priority: getPriority(balance.blockchain),
    }));

    return balancesWithPriority
      .filter(({ balance, priority }) => {
        // ✅ Correct logic: keep valid balances only
        return priority > -99 && balance.amount > 0;
      })
      .sort((lhs, rhs) => {
        // ✅ Simplified sort with complete comparator
        return rhs.priority - lhs.priority;
      })
      .map(({ balance }) => balance);
  }, [balances, getPriority]); // ✅ Correct dependencies

  // ✅ Memoized and will be used
  const formattedBalances = useMemo(() => {
    return sortedBalances.map((balance): FormattedWalletBalance => ({
      ...balance,
      formatted: balance.amount.toFixed(2), // Added decimal places
    }));
  }, [sortedBalances]);

  // ✅ Memoized, uses correct data, unique keys
  const rows = useMemo(() => {
    return formattedBalances.map((balance) => {
      const usdValue = prices[balance.currency] * balance.amount;
      return (
        <WalletRow
          className={classes.row}
          key={balance.currency} // ✅ Unique key instead of index
          amount={balance.amount}
          usdValue={usdValue}
          formattedAmount={balance.formatted} // ✅ Now exists
        />
      );
    });
  }, [formattedBalances, prices]);

  return <div {...rest}>{rows}</div>;
};
```

---

## Performance Improvements

### Before vs After

| Metric | Original | Refactored | Improvement |
|--------|----------|------------|-------------|
| `getPriority` calls for 100 items | ~600+ | 100 | 83% reduction |
| Filter logic | Incorrect | Correct | ✅ Fixed |
| Sort comparator | Incomplete | Complete | ✅ Fixed |
| Type safety | Weak (any) | Strong | ✅ Fixed |
| Re-renders on price change | Yes (wrong dep) | Only when needed | ✅ Fixed |
| Memoization coverage | 33% | 100% | ✅ Fixed |
| React key stability | Poor (index) | Good (currency) | ✅ Fixed |

### Time Complexity

- **Original**: O(n) filter + O(n log n) sort with O(n log n) getPriority calls = **O(n² log n)**
- **Refactored**: O(n) map + O(n) filter + O(n log n) sort = **O(n log n)**

**Result**: Significant performance improvement, especially with larger datasets.

---

## Implementation Details

This solution demonstrates the refactored logic using vanilla JavaScript (following the pattern from problem2) to maintain consistency across the codebase. 

### Project Structure

```
problem3/
├── index.html          # HTML template with wallet UI
├── script.js           # Refactored logic implementation
├── style.css           # Modern, responsive styling
├── package.json        # Dependencies (Vite)
├── vite.config.js      # Build configuration
├── SOLUTION.md         # Detailed technical analysis
└── README.md           # This file
```

### Running the Code

```bash
cd src/problem3
npm install
npm run dev
```

Open `http://localhost:3000` to see the working implementation.

### Key Features Implemented

- ✅ Correct filtering (only positive balances with valid priority)
- ✅ Optimized sorting (pre-computed priorities)
- ✅ Proper error handling and loading states
- ✅ USD value calculations with real price data
- ✅ Responsive design with animations
- ✅ Unique keys (currency-based)
- ✅ Separated concerns (process/format/render)

---

## Lessons Learned

1. **Always validate logic**: The inverted filter is a critical bug that would ship broken functionality
2. **Pre-compute expensive operations**: Don't recalculate the same value multiple times
3. **Mind your dependencies**: Only include what you actually use in useMemo/useCallback
4. **Type safety matters**: Using `any` defeats TypeScript's purpose
5. **Keys are important**: Array indices break React's reconciliation
6. **Memoize appropriately**: Prevent unnecessary recalculations and re-renders
7. **Complete your algorithms**: Always handle edge cases (like equal values in comparisons)

---

## References

- See `SOLUTION.md` for detailed technical analysis
- See `script.js` for the complete implementation
- Prices fetched from: `https://interview.switcheo.com/prices.json`

## License

MIT

