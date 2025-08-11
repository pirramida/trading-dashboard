import React from 'react';
import { Table, Tag, Button, Popconfirm } from 'antd';

const ExchangeConnection = ({ exchanges }) => {
  const handleDisconnect = (exchange) => {
    // Реализация отключения биржи
    console.log('Disconnect exchange:', exchange);
  };

  const columns = [
    {
      title: 'Exchange',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'connected' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Symbols',
      dataIndex: 'symbols',
      key: 'symbols',
      render: (symbols) => symbols.join(', '),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure to disconnect?"
          onConfirm={() => handleDisconnect(record)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger size="small">
            Disconnect
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const data = exchanges.map((exchange, index) => ({
    key: index,
    name: 'Bybit',
    status: 'connected',
    symbols: ['BTCUSDT', 'ETHUSDT'],
  }));

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};

export default ExchangeConnection;