# Problem 1: Three Ways to Sum to n

## Solution

Three different implementations to calculate the sum from 1 to n:

### Method A: Iterative Approach
Uses a for loop to iterate from 1 to n and accumulate the sum.
- Time Complexity: O(n)
- Space Complexity: O(1)

### Method B: Mathematical Formula
Uses Gauss's formula: `n × (n + 1) / 2`
- Time Complexity: O(1)
- Space Complexity: O(1)
- Most efficient solution

### Method C: Recursive Approach
Recursively calculates the sum by adding n to the sum of (n-1).
- Time Complexity: O(n)
- Space Complexity: O(n) due to call stack

## Example
```javascript
sum_to_n(5) // Returns 15 (1 + 2 + 3 + 4 + 5)
```

