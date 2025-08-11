import React, { useEffect, useState } from 'react';

const Portfolio = ({ exchange }) => {
  const [balances, setBalances] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const accountInfo = await window.electronAPI.getExchangeData(exchange, '', 'account');
        
        // Обработка различных форматов ответа от биржи
        let balancesData = [];
        if (accountInfo.balances) {
          // Формат: { balances: [...] }
          balancesData = accountInfo.balances;
        } else if (accountInfo.result && accountInfo.result.balances) {
          // Формат: { result: { balances: [...] } }
          balancesData = accountInfo.result.balances;
        } else if (Array.isArray(accountInfo)) {
          // Формат: [...]
          balancesData = accountInfo;
        }

        // Фильтрация только ненулевых балансов
        const filteredBalances = balancesData.filter(b => {
          const available = parseFloat(b.available || b.free || b.balance || 0);
          return available > 0;
        });

        setBalances(filteredBalances);
        
        // Аналогичная обработка для позиций
        let positionsData = [];
        if (accountInfo.positions) {
          positionsData = accountInfo.positions;
        } else if (accountInfo.result && accountInfo.result.positions) {
          positionsData = accountInfo.result.positions;
        } else if (accountInfo.position) {
          positionsData = accountInfo.position;
        }
        
        setPositions(Array.isArray(positionsData) ? positionsData : [positionsData].filter(Boolean));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    loadPortfolio();
    const interval = setInterval(loadPortfolio, 30000); // Обновление каждые 30 секунд
    
    return () => clearInterval(interval);
  }, [exchange]);

  if (isLoading) return <div>Loading portfolio...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="portfolio-container">
      <h3>Balances</h3>
      <div className="balances-list">
        {balances.length > 0 ? (
          balances.map((asset, index) => (
            <div key={`balance_${index}`} className="balance-row">
              <div className="asset">{asset.currency || asset.asset}</div>
              <div className="amount">{parseFloat(asset.available || asset.free || asset.balance).toFixed(4)}</div>
              <div className="value">
                ${(asset.available * (asset.price || 1)).toFixed(2)}
              </div>
            </div>
          ))
        ) : (
          <div>No balances found</div>
        )}
      </div>

      <h3>Positions</h3>
      <div className="positions-list">
        {positions.length > 0 ? (
          positions.map((position, index) => (
            <div key={`position_${index}`} className={`position-row ${position.side ? position.side.toLowerCase() : ''}`}>
              <div className="symbol">{position.symbol}</div>
              <div className="size">{parseFloat(position.size || position.amount).toFixed(4)}</div>
              <div className="entry">{parseFloat(position.entryPrice || position.price).toFixed(2)}</div>
              <div className="pnl">
                ${parseFloat(position.unrealisedPnl || position.pnl || 0).toFixed(2)}
                ({parseFloat((position.unrealisedPnlPcnt || 0) * 100).toFixed(2)}%)
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