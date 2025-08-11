import React, { useEffect, useState, useRef } from "react";

const Trades = ({ symbol, exchange }) => {
  const [trades, setTrades] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    console.log(
      `[Trades] Подписка на трейды: exchange=${exchange}, symbol=${symbol}`
    );

    const handleTradesUpdate = (data) => {
      if (data.exchange === exchange && data.symbol === symbol && data.data) {
        const formattedTrades = data.data.map((t) => ({
          price: parseFloat(t.p),
          size: parseFloat(t.v),
          side: t.S,
          timestamp: t.T,
        }));

        setTrades((prev) =>
          [...formattedTrades.reverse(), ...prev].slice(0, 100)
        );
      }
    };

    // Подписываемся на трейды
    window.electronAPI.subscribeTrades({ exchange, symbol });
    unsubscribeRef.current =
      window.electronAPI.onTradesUpdate(handleTradesUpdate);

    return () => {
      console.log(
        `[Trades] Отписка от трейдов: exchange=${exchange}, symbol=${symbol}`
      );
      window.electronAPI.unsubscribeTrades({ exchange, symbol });
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        console.log("[Trades] Отписка от обработчика onTradesUpdate выполнена");
      }
      setTrades([]);
    };
  }, [symbol, exchange]);

  return (
    <div className="trades-container">
      <div className="trades-header">
        <div>Price</div>
        <div>Amount</div>
        <div>Time</div>
      </div>
      <div className="trades-list">
        {trades.map((trade, index) => (
          <div
            key={`trade_${index}`}
            className={`trade-row ${trade.side === "Buy" ? "buy" : "sell"}`}
          >
            <div>{trade.price.toFixed(2)}</div>
            <div>{trade.size.toFixed(4)}</div>
            <div>{new Date(trade.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trades;
