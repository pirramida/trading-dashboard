import React, { useEffect, useState } from 'react';

const StrategyLog = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const todayLogs = await window.electronAPI.getStrategyLogs(new Date().toISOString().split('T')[0]);
        setLogs(todayLogs);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading strategy logs:', error);
        setIsLoading(false);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 5000); // Обновление каждые 5 секунд

    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div>Loading logs...</div>;

  return (
    <div className="strategy-log-container">
      <h3>Strategy Logs</h3>
      <div className="log-list">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={`log_${index}`} className="log-entry">
              <div className="log-timestamp">{log.timestamp}</div>
              <div className="log-strategy">[{log.strategy}]</div>
              <div className="log-message">{log.message}</div>
            </div>
          ))
        ) : (
          <div>No logs for today</div>
        )}
      </div>
    </div>
  );
};

export default StrategyLog;