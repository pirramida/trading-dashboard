import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const OrderBook = ({ symbol, exchange }) => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);

  useEffect(() => {
    if (!exchange) return;

    const handleOrderBookUpdate = (data) => {
      if (data.topic.includes(symbol)) {
        const newBids = data.data.filter(d => d.side === 'Buy')
          .sort((a, b) => b.price - a.price)
          .slice(0, 20);
        
        const newAsks = data.data.filter(d => d.side === 'Sell')
          .sort((a, b) => a.price - b.price)
          .slice(0, 20);

        setBids(newBids);
        setAsks(newAsks);
      }
    };

    exchange.subscribeOrderBook(symbol, handleOrderBookUpdate);

    return () => {
      exchange.unsubscribeOrderBook(symbol, handleOrderBookUpdate);
    };
  }, [symbol, exchange]);

  const columns = [
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (text) => parseFloat(text).toFixed(2),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (text) => parseFloat(text).toFixed(4),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (_, record) => (parseFloat(record.price) * parseFloat(record.size)).toFixed(2),
    },
  ];

  return (
    <div>
      <h3>Order Book: {symbol}</h3>
      <div style={{ marginBottom: 20 }}>
        <Table
          columns={columns}
          dataSource={asks}
          rowKey="id"
          pagination={false}
          scroll={{ y: 300 }}
          showHeader={false}
          style={{ background: 'rgba(239, 83, 80, 0.1)' }}
        />
      </div>
      <div style={{ textAlign: 'center', padding: '5px 0' }}>
        <strong>Spread: </strong>
        {asks[0] && bids[0] ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(2) : 'N/A'}
      </div>
      <div>
        <Table
          columns={columns}
          dataSource={bids}
          rowKey="id"
          pagination={false}
          scroll={{ y: 300 }}
          showHeader={false}
          style={{ background: 'rgba(38, 166, 154, 0.1)' }}
        />
      </div>
    </div>
  );
};

export default OrderBook;