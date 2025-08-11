import React, { useEffect, useState, useRef } from 'react';
import './OrderBook.css'; // Импорт CSS файла

const OrderBook = ({ exchange, symbol }) => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    window.electronAPI.subscribeOrderBook({ exchange, symbol });

    unsubscribeRef.current = window.electronAPI.onOrderBookUpdate((data) => {
      if (data.exchange === exchange && data.symbol === symbol) {
        // Проверяем, что данные есть и массивы
        const bidsData = Array.isArray(data.data.b) ? data.data.b : [];
        const asksData = Array.isArray(data.data.a) ? data.data.a : [];

        setBids(bidsData.slice(0, 15));
        setAsks(asksData.slice(0, 15));
      }
    });

    return () => {
      window.electronAPI.unsubscribeOrderBook({ exchange, symbol });
      if (unsubscribeRef.current) unsubscribeRef.current();
      setBids([]);
      setAsks([]);
    };
  }, [exchange, symbol]);

  return (
    <div className="orderbook-container">
      <div className="orderbook-header">
        <div>Price</div>
        <div>Amount</div>
        <div>Total</div>
      </div>
      <div className="orderbook-asks">
        {asks.map(([price, amount], i) => (
          <div key={`ask_${i}`} className="orderbook-row ask">
            <div className="orderbook-price">{parseFloat(price).toFixed(2)}</div>
            <div className="orderbook-amount">{parseFloat(amount).toFixed(4)}</div>
            <div className="orderbook-total">{(parseFloat(price) * parseFloat(amount)).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="orderbook-spread">
        Spread: {asks[0] && bids[0] ? (parseFloat(asks[0][0]) - parseFloat(bids[0][0])).toFixed(2) : 'N/A'}
      </div>
      <div className="orderbook-bids">
        {bids.map(([price, amount], i) => (
          <div key={`bid_${i}`} className="orderbook-row bid">
            <div className="orderbook-price">{parseFloat(price).toFixed(2)}</div>
            <div className="orderbook-amount">{parseFloat(amount).toFixed(4)}</div>
            <div className="orderbook-total">{(parseFloat(price) * parseFloat(amount)).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;