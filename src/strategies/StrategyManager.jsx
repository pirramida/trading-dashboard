import React, { useState, useEffect } from 'react';
import { Card, Button, Input, List, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import WebSocket from 'ws';

const StrategyManager = ({ onSignal, addLog }) => {
  const [strategies, setStrategies] = useState([]);
  const [wsUrl, setWsUrl] = useState('');
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectToStrategy = () => {
    if (!wsUrl) {
      message.error('Please enter WebSocket URL');
      return;
    }

    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      addLog(`Connected to strategy server at ${wsUrl}`);
      setIsConnected(true);
    };

    newWs.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data);
        addLog(`Received signal: ${JSON.stringify(signal)}`);
        
        // Проверка сигнала перед исполнением
        if (validateSignal(signal)) {
          onSignal(signal)
            .then(() => addLog(`Signal executed successfully`))
            .catch(err => addLog(`Error executing signal: ${err.message}`));
        } else {
          addLog(`Invalid signal: ${JSON.stringify(signal)}`);
        }
      } catch (error) {
        addLog(`Error processing signal: ${error.message}`);
      }
    };

    newWs.onclose = () => {
      addLog(`Disconnected from strategy server`);
      setIsConnected(false);
    };

    newWs.onerror = (error) => {
      addLog(`WebSocket error: ${error.message}`);
      setIsConnected(false);
    };

    setWs(newWs);
  };

  const disconnectFromStrategy = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  };

  const validateSignal = (signal) => {
    return (
      signal &&
      signal.symbol &&
      signal.side && ['buy', 'sell'].includes(signal.side.toLowerCase()) &&
      signal.quantity && signal.quantity > 0 &&
      (signal.type === 'market' || (signal.type === 'limit' && signal.price && signal.price > 0))
    );
  };

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return (
    <Card title="Strategy Manager">
      <div style={{ marginBottom: '16px' }}>
        <Input
          value={wsUrl}
          onChange={(e) => setWsUrl(e.target.value)}
          placeholder="ws://strategy-server:port"
          style={{ width: 'calc(100% - 100px)', marginRight: '8px' }}
        />
        {isConnected ? (
          <Button danger onClick={disconnectFromStrategy}>
            Disconnect
          </Button>
        ) : (
          <Button type="primary" onClick={connectToStrategy}>
            Connect
          </Button>
        )}
      </div>
      
      <List
        header={<div>Active Strategies</div>}
        bordered
        dataSource={strategies}
        renderItem={(strategy) => (
          <List.Item>
            {strategy.name} - {strategy.status}
          </List.Item>
        )}
      />
      
      <Button 
        type="dashed" 
        icon={<PlusOutlined />} 
        style={{ marginTop: '16px' }}
      >
        Add Strategy
      </Button>
    </Card>
  );
};

export default StrategyManager;