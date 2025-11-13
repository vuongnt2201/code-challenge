import React, { useCallback, useMemo } from 'react';

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string;
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

const WalletPage: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

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

  const sortedBalances = useMemo(() => {
    return balances
      .map(balance => ({
        balance,
        priority: getPriority(balance.blockchain)
      }))
      .filter(({ balance, priority }) => priority > -99 && balance.amount > 0)
      .sort((a, b) => b.priority - a.priority)
      .map(({ balance }) => balance);
  }, [balances, getPriority]);

  const formattedBalances = useMemo(() => {
    return sortedBalances.map(balance => ({
      ...balance,
      formatted: balance.amount.toFixed(2),
    }));
  }, [sortedBalances]);

  const rows = useMemo(() => {
    return formattedBalances.map(balance => {
      const usdValue = (prices[balance.currency] ?? 0) * balance.amount;
      return (
        <WalletRow
          className="wallet-row"
          key={`${balance.blockchain}-${balance.currency}`}
          amount={balance.amount}
          usdValue={usdValue}
          formattedAmount={balance.formatted}
        />
      );
    });
  }, [formattedBalances, prices]);

  return <div {...rest}>{rows}{children}</div>;
};
