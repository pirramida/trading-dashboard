import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Form, Input, Select, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

const Orders = ({ orders, onPlaceOrder }) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      await onPlaceOrder({
        symbol: values.symbol,
        side: values.side,
        type: values.type,
        quantity: parseFloat(values.quantity),
        price: values.price ? parseFloat(values.price) : null,
      });
      setVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (orderId) => {
    // Реализация отмены ордера
    console.log('Cancel order:', orderId);
  };

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
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => type.toUpperCase(),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty) => parseFloat(qty).toFixed(4),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => price ? parseFloat(price).toFixed(2) : 'Market',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'filled' ? 'green' : 'orange'}>
          {status.toUpperCase()}
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
          onClick={() => handleCancel(record.id)}
          disabled={record.status === 'filled'}
        >
          Cancel
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setVisible(true)}
        >
          New Order
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        pagination={false}
        scroll={{ x: true }}
      />

      <Modal
        title="Place New Order"
        visible={visible}
        onOk={handleSubmit}
        onCancel={() => setVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="symbol"
            label="Symbol"
            rules={[{ required: true, message: 'Please select symbol' }]}
          >
            <Select placeholder="Select symbol">
              <Option value="BTCUSDT">BTC/USDT</Option>
              <Option value="ETHUSDT">ETH/USDT</Option>
              <Option value="SOLUSDT">SOL/USDT</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="side"
            label="Side"
            rules={[{ required: true, message: 'Please select side' }]}
          >
            <Select placeholder="Select side">
              <Option value="buy">Buy</Option>
              <Option value="sell">Sell</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select order type' }]}
          >
            <Select placeholder="Select order type">
              <Option value="market">Market</Option>
              <Option value="limit">Limit</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Please input quantity' }]}
          >
            <Input type="number" placeholder="0.00" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('type') === 'market' || value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Please input price for limit order'));
                },
              }),
            ]}
          >
            <Input type="number" placeholder="0.00" disabled={form.getFieldValue('type') === 'market'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;