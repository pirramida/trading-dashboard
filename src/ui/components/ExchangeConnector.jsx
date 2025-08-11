import React, { useState, useEffect } from 'react';

const ExchangeConnector = () => {
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchange, setSelectedExchange] = useState('Bybit');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await window.electronAPI.getConfig();
      if (config.exchanges) {
        setExchanges(Object.keys(config.exchanges));
        const firstExchange = Object.keys(config.exchanges)[0];
        if (firstExchange) {
          setSelectedExchange(firstExchange);
          setApiKey(config.exchanges[firstExchange].apiKey || '');
          setApiSecret(config.exchanges[firstExchange].apiSecret || '');
        }
      }
    };

    loadConfig();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.connectExchange(selectedExchange, apiKey, apiSecret);
      setConnectionStatus(prev => ({
        ...prev,
        [selectedExchange]: result.status
      }));

      // Сохраняем ключи в конфиг
      const config = await window.electronAPI.getConfig();
      if (!config.exchanges) config.exchanges = {};
      config.exchanges[selectedExchange] = { apiKey, apiSecret };
      await window.electronAPI.saveConfig(config);
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus(prev => ({
        ...prev,
        [selectedExchange]: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.disconnectExchange(selectedExchange);
      setConnectionStatus(prev => ({
        ...prev,
        [selectedExchange]: result.status
      }));
    } catch (error) {
      console.error('Disconnection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="exchange-connector">
      <h3>Exchange Connection</h3>
      <div className="connector-form">
        <select 
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value)}
        >
          {exchanges.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />

        <input
          type="password"
          placeholder="API Secret"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
        />

        <div className="connector-buttons">
          <button 
            onClick={handleConnect}
            disabled={isLoading || !apiKey || !apiSecret}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
          
          <button 
            onClick={handleDisconnect}
            disabled={isLoading || connectionStatus[selectedExchange] !== 'connected'}
          >
            Disconnect
          </button>
        </div>

        <div className="connection-status">
          Status: {connectionStatus[selectedExchange] || 'not connected'}
        </div>
      </div>
    </div>
  );
};

export default ExchangeConnector;