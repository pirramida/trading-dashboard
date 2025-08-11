import React, { useEffect, useState } from 'react';
import { Table, Tag, Button } from 'antd';

const Positions = ({ exchange }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exchange) return;

    const loadPositions = async () => {
      setLoading(true);
      try {
        const data = await exchange.getPositions();
        setPositions(data);
      } catch (error) {
        console.error('Error loading positions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPositions();

    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, [exchange]);

  const columns = [
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: 'Side',
      dataIndex: 'side',
      key: 'side',
      render: (side) => (
        <Tag color={side === 'Buy' ? 'green' : 'red'}>
          {side}
        </Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size) => parseFloat(size).toFixed(4),
    },
    {
      title: 'Entry Price',
      dataIndex: 'entry_price',
      key: 'entry_price',
      render: (price) => parseFloat(price).toFixed(2),
    },
    {
      title: 'Mark Price',
      dataIndex: 'mark_price',
      key: 'mark_price',
      render: (price) => parseFloat(price).toFixed(2),
    },
    {
      title: 'Liq. Price',
      dataIndex: 'liq_price',
      key: 'liq_price',
      render: (price) => (price ? parseFloat(price).toFixed(2) : 'N/A'),
    },
    {
      title: 'PNL',
      dataIndex: 'unrealised_pnl',
      key: 'unrealised_pnl',
      render: (pnl) => (
        <Tag color={parseFloat(pnl) >= 0 ? 'green' : 'red'}>
          {parseFloat(pnl).toFixed(4)}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          danger 
          size="small"
          onClick={() => handleClosePosition(record)}
        >
          Close
        </Button>
      ),
    },
  ];

  const handleClosePosition = async (position) => {
    try {
      await exchange.closePosition(position.symbol);
      const updated = positions.filter(p => p.symbol !== position.symbol);
      setPositions(updated);
    } catch (error) {
      console.error('Error closing position:', error);
    }
  };

  return (
    <Table
      columns={columns}
      dataSource={positions}
      rowKey="symbol"
      loading={loading}
      pagination={false}
      scroll={{ x: true }}
    />
  );
};

export default Positions;