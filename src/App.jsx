import React, { useState, useEffect } from 'react';
import { Layout, Menu, Tabs, Modal, Input, Form, Button } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LineChartOutlined,
  DollarOutlined,
  ApiOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Chart from './ui/Chart';
import OrderBook from './ui/OrderBook';
import Positions from './ui/Positions';
import Orders from './ui/Orders';
import Logs from './ui/Logs';
import ExchangeConnection from './ui/ExchangeConnection';
import StrategyManager from './strategies/StrategyManager';
import BybitExchange from './api/bybit.mjs';

const { Header, Sider, Content } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [trades, setTrades] = useState([]);
  const [orders, setOrders] = useState([]);
  const [positions, setPositions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const addLog = (message) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, { timestamp, message }]);
  };

  const connectExchange = async () => {
    try {
      const exchange = new BybitExchange(apiKey, apiSecret, isDemo);
      await exchange.connect();
      
      exchange.subscribeCandles('BTCUSDT', '1', (data) => {
        const candles = data.data.map(item => ({
          time: item.start / 1000,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));
        
        const volumes = data.data.map(item => ({
          time: item.start / 1000,
          value: item.volume,
          color: item.open > item.close ? '#ef5350' : '#26a69a',
        }));
        
        setChartData({ candles, volumes });
      });
      
      exchange.subscribeTrades('BTCUSDT', (data) => {
        const newTrades = data.data.map(trade => ({
          time: trade.timestamp / 1000,
          price: parseFloat(trade.price),
          side: trade.side.toLowerCase(),
          quantity: parseFloat(trade.size),
        }));
        setTrades(prev => [...prev, ...newTrades].slice(-100));
      });
      
      setExchanges([...exchanges, exchange]);
      addLog('Bybit exchange connected successfully');
      setIsModalVisible(false);
    } catch (error) {
      addLog(`Error connecting to Bybit: ${error.message}`);
    }
  };

  const placeOrder = async (order) => {
    try {
      if (exchanges.length === 0) {
        addLog('No exchange connected');
        return;
      }
      
      const result = await exchanges[0].placeOrder(order);
      addLog(`Order placed: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);
      setOrders(prev => [...prev, order]);
      return result;
    } catch (error) {
      addLog(`Error placing order: ${error.message}`);
      throw error;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo" style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.3)' }} />
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={[
            {
              key: '1',
              icon: <LineChartOutlined />,
              label: 'Charts',
              onClick: () => setActiveTab('chart'),
            },
            {
              key: '2',
              icon: <DollarOutlined />,
              label: 'Orders',
              onClick: () => setActiveTab('orders'),
            },
            {
              key: '3',
              icon: <ApiOutlined />,
              label: 'Exchanges',
              onClick: () => setActiveTab('exchanges'),
            },
            {
              key: '4',
              icon: <SettingOutlined />,
              label: 'Strategies',
              onClick: () => setActiveTab('strategies'),
            },
          ]}
        />
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: '#001529' }}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
          })}
          <Button 
            type="primary" 
            style={{ float: 'right', margin: '16px' }}
            onClick={() => setIsModalVisible(true)}
          >
            Connect Exchange
          </Button>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="Chart" key="chart">
              <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
                <div style={{ flex: 3 }}>
                  <Chart 
                    data={chartData} 
                    trades={trades} 
                    orders={orders} 
                    width="100%" 
                    height="100%" 
                  />
                </div>
                <div style={{ flex: 1, marginLeft: '16px' }}>
                  <OrderBook symbol="BTCUSDT" />
                </div>
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="Orders" key="orders">
              <Orders orders={orders} onPlaceOrder={placeOrder} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Exchanges" key="exchanges">
              <ExchangeConnection exchanges={exchanges} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Strategies" key="strategies">
              <StrategyManager onSignal={placeOrder} addLog={addLog} />
            </Tabs.TabPane>
          </Tabs>
          <Logs logs={logs} />
        </Content>
      </Layout>
      
      <Modal
        title="Connect to Exchange"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={connectExchange}
        >
          <Form.Item label="API Key" required>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
            />
          </Form.Item>
          <Form.Item label="API Secret" required>
            <Input.Password
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your API secret"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Connect
            </Button>
            <Button 
              style={{ marginLeft: '8px' }}
              onClick={() => setIsDemo(!isDemo)}
              type={isDemo ? 'primary' : 'default'}
            >
              {isDemo ? 'Testnet' : 'Production'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default App;