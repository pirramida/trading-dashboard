import React, { useEffect, useState } from 'react';

const Portfolio = ({ exchange }) => {
  const [balances, setBalances] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const accountInfo = await window.electronAPI.getExchangeData(exchange, '', 'account');
        setBalances(accountInfo.balances.filter(b => parseFloat(b.available) > 0));
        setPositions(accountInfo.positions);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setIsLoading(false);
      }
    };

    loadPortfolio();
    const interval = setInterval(loadPortfolio, 30000); // Обновление каждые 30 секунд

    return () => clearInterval(interval);
  }, [exchange]);

  if (isLoading) return <div>Loading portfolio...</div>;

  return (
    <div className="portfolio-container">
      <h3>Balances</h3>
      <div className="balances-list">
        {balances.map((asset, index) => (
          <div key={`balance_${index}`} className="balance-row">
            <div className="asset">{asset.currency}</div>
            <div className="amount">{parseFloat(asset.available).toFixed(4)}</div>
            <div className="value">${(asset.available * asset.price).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <h3>Positions</h3>
      <div className="positions-list">
        {positions.length > 0 ? (
          positions.map((position, index) => (
            <div 
              key={`position_${index}`} 
              className={`position-row ${position.side.toLowerCase()}`}
            >
              <div className="symbol">{position.symbol}</div>
              <div className="size">{parseFloat(position.size).toFixed(4)}</div>
              <div className="entry">{parseFloat(position.entryPrice).toFixed(2)}</div>
              <div className="pnl">
                ${parseFloat(position.unrealisedPnl).toFixed(2)} (
                {parseFloat(position.unrealisedPnlPcnt * 100).toFixed(2)}%)
              </div>
            </div>
          ))
        ) : (
          <div>No open positions</div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;