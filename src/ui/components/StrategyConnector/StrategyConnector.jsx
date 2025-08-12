import React, { useState, useEffect } from "react";
import "./StrategyConnector.css";

const StrategyConnector = () => {
  const [strategies, setStrategies] = useState([]);
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(false);
  const [manualPort, setManualPort] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualName, setManualName] = useState("");
  useEffect(() => {
  const unsubscribe = window.electronAPI.onStrategyMessage(({ port, data }) => {
    console.log(`From strategy ${port}:`, data);
  });
  return unsubscribe;
}, []);

  // Автоподключение при сканировании
  const scanAndConnectSockets = async () => {
    setLoading(true);
    try {
      const foundStrategies = await window.electronAPI.scanStrategySockets();

      // Фильтруем дубликаты
      const uniqueStrategies = foundStrategies.filter(
        (strategy) => !strategies.some((s) => s.port === strategy.port)
      );

      setStrategies((prev) => [...prev, ...uniqueStrategies]);

      for (const strategy of uniqueStrategies) {
        try {
          const { connected, ws } = await window.electronAPI.connectToStrategy({
            port: strategy.port,
            token: strategy.token,
          });

          if (connected && ws) {
            // Проверяем, что ws существует
            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              console.log(`Message from ${strategy.name}:`, data);
            };

            setConnections((prev) => ({
              ...prev,
              [strategy.name]: ws,
            }));
          }
        } catch (err) {
          console.error(`Error connecting to ${strategy.name}:`, err);
        }
      }
    } catch (err) {
      console.error("Error scanning sockets:", err);
    } finally {
      setLoading(false);
    }
  };

  const connectToStrategy = async (port, token, name) => {
  try {
    const { connected, ws } = await window.electronAPI.connectToStrategy({
      port: parseInt(port),
      token,
    });
    
    if (connected && ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(`Message from ${name}:`, data);
      };
    }
  } catch (err) {
    console.error("Error connecting to strategy:", err);
  }
};

  const disconnectFromStrategy = (strategyName) => {
    if (connections[strategyName]) {
      connections[strategyName].close();
      setConnections((prev) => {
        const newConnections = { ...prev };
        delete newConnections[strategyName];
        return newConnections;
      });

      // Удаляем только ручные стратегии из списка
      setStrategies((prev) =>
        prev.filter(
          (strategy) => !(strategy.name === strategyName && strategy.isManual)
        )
      );
    }
  };

  return (
    <div className="strategy-connector">
      <h3>Strategy Connections</h3>

      <div className="manual-connection">
        <h4>Add Manual Connection</h4>
        <input
          type="number"
          placeholder="Port (9501-9600)"
          value={manualPort}
          onChange={(e) => setManualPort(e.target.value)}
          min="9501"
          max="9600"
        />
        <input
          type="text"
          placeholder="Token"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
        />
        <button
          onClick={() => connectToStrategy(manualPort, manualToken, manualName)}
          disabled={!manualPort || !manualToken}
          className="add-button"
        >
          Add Strategy
        </button>
      </div>

      <button
        onClick={scanAndConnectSockets}
        disabled={loading}
        className="search-btn"
      >
        {loading ? "Scanning..." : "Find & Connect All Strategies"}
      </button>

      <div className="strategy-list">
        {strategies.map((strategy) => (
          <div
            key={`${strategy.name}-${strategy.port}-${strategy.createdAt}`} // Добавляем createdAt для уникальности
            className="strategy-item"
          >
            <div className="strategy-info">
              <h4>{strategy.name}</h4>
              <p>Port: {strategy.port}</p>
              <p>
                Status:{" "}
                {connections[strategy.name] ? "Connected" : "Disconnected"}
              </p>
              {strategy.createdAt && (
                <p>Created: {new Date(strategy.createdAt).toLocaleString()}</p>
              )}
            </div>

            {connections[strategy.name] ? (
              <button
                onClick={() => disconnectFromStrategy(strategy.name)}
                className="disconnect-btn"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() =>
                  connectToStrategy(
                    strategy.port,
                    strategy.token,
                    strategy.name
                  )
                }
                className="connect-btn"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyConnector;
