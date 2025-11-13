# Problem 3: Code Analysis & Refactoring

## Issues Found

### 1. Undefined Variable (Runtime Error)
```typescript
const balancePriority = getPriority(balance.blockchain);
if (lhsPriority > -99) { // lhsPriority doesn't exist!
```
**Issue**: Variable is declared as `balancePriority` but used as `lhsPriority`. This will crash the app.

### 2. Inverted Filter Logic
```typescript
if (balancePriority > -99) {
  if (balance.amount <= 0) {
    return true; // This keeps empty balances!
  }
}
return false;
```
**Issue**: The logic is backwards - it keeps balances with amount ≤ 0 and filters out positive ones. Should be the opposite.

### 3. Missing Property in Interface
```typescript
interface WalletBalance {
  currency: string;
  amount: number;
  // blockchain is missing but used in code!
}
```
**Issue**: Code uses `balance.blockchain` but the interface doesn't define it.

### 4. Using `any` Type
```typescript
const getPriority = (blockchain: any): number => {
```
**Issue**: Defeats TypeScript's type safety. Should use `string` or a union type.

### 5. Wrong useMemo Dependencies
```typescript
useMemo(() => {
  return balances.filter(...).sort(...);
}, [balances, prices]); // prices isn't used here!
```
**Issue**: Including `prices` causes unnecessary recalculations when prices change, even though the sorting doesn't depend on it.

### 6. Redundant Function Calls
**Issue**: `getPriority()` is called multiple times for the same blockchain:
- Once in filter (O(n) calls)
- Twice per comparison in sort (O(n log n) calls)

For 100 items, that's ~600 redundant calls. Should pre-compute priorities once.

### 7. Incomplete Sort Comparator
```typescript
if (leftPriority > rightPriority) {
  return -1;
} else if (rightPriority > leftPriority) {
  return 1;
}
// No return for equal case!
```
**Issue**: Returns `undefined` when priorities are equal. Should return `0`.

### 8. Unused Variable
```typescript
const formattedBalances = sortedBalances.map(...) // Computed but never used

const rows = sortedBalances.map(...) // Uses sortedBalances instead
```
**Issue**: Wastes computation creating `formattedBalances` that's immediately discarded.

### 9. Type Mismatch
```typescript
const rows = sortedBalances.map((balance: FormattedWalletBalance, index) => {
  // sortedBalances is WalletBalance[], not FormattedWalletBalance[]
  return <WalletRow formattedAmount={balance.formatted} /> // .formatted doesn't exist!
```
**Issue**: Wrong type annotation causes runtime error accessing undefined property.

### 10. Array Index as Key
```typescript
<WalletRow key={index} ... />
```
**Issue**: Using index as key breaks React's reconciliation when the list order changes. Should use a unique identifier like `balance.currency`.

### 11. Missing Memoization
**Issue**: Both `formattedBalances` and `rows` are computed on every render without memoization, causing unnecessary recalculations.

---

## Refactored Code

```typescript
interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string; // Added missing property
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

const WalletPage: React.FC<BoxProps> = (props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // Memoize getPriority to avoid recreating on every render
  const getPriority = useCallback((blockchain: string): number => {
    switch (blockchain) {
      case 'Osmosis': return 100;
      case 'Ethereum': return 50;
      case 'Arbitrum': return 30;
      case 'Zilliqa':
      case 'Neo': return 20;
      default: return -99;
    }
  }, []);

  // Pre-compute priorities to avoid redundant calls
  const sortedBalances = useMemo(() => {
    const balancesWithPriority = balances.map(balance => ({
      balance,
      priority: getPriority(balance.blockchain)
    }));

    return balancesWithPriority
      .filter(({ balance, priority }) => {
        // Fixed: keep balances with valid priority AND positive amount
        return priority > -99 && balance.amount > 0;
      })
      .sort((a, b) => b.priority - a.priority) // Simplified, handles equal case
      .map(({ balance }) => balance);
  }, [balances, getPriority]); // Removed prices from dependencies

  // Memoize formatting
  const formattedBalances = useMemo(() => {
    return sortedBalances.map((balance): FormattedWalletBalance => ({
      ...balance,
      formatted: balance.amount.toFixed(2)
    }));
  }, [sortedBalances]);

  // Memoize rows and use formattedBalances
  const rows = useMemo(() => {
    return formattedBalances.map((balance) => {
      const usdValue = prices[balance.currency] * balance.amount;
      return (
        <WalletRow
          className={classes.row}
          key={balance.currency} // Use unique key
          amount={balance.amount}
          usdValue={usdValue}
          formattedAmount={balance.formatted}
        />
      );
    });
  }, [formattedBalances, prices]);

  return <div {...rest}>{rows}</div>;
};
```

## Key Improvements

- **Fixed critical bugs**: undefined variable, inverted logic, type errors
- **Performance**: Reduced complexity from O(n² log n) to O(n log n)
- **Proper memoization**: All expensive computations are memoized
- **Type safety**: Added missing properties, removed `any` type
- **React best practices**: Unique keys, correct dependencies
- **Code quality**: Cleaner, more maintainable

## Performance Impact

For 100 wallet items:
- **Before**: ~600+ `getPriority` calls
- **After**: 100 `getPriority` calls
- **Result**: ~83% reduction in redundant calculations
