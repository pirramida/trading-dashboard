import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import Chart from '../../components/Chart/Chart';
import OrderBook from '../../components/OrderBook/OrderBook';
import Trades from '../../components/Trades/Trades';
import Portfolio from '../../components/Portfolio/Portfolio';
import StrategyLog from '../../components/StrategyLog/StrategyLog';
import SymbolSelector from '../../components/SymbolSelector/SymbolSelector';

const WindowManager = () => {
  const [windows, setWindows] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');

  useEffect(() => {
    const loadConfig = async () => {
      console.log('[WindowManager] Загружаем конфигурацию окон...');
      const config = await window.electronAPI.getConfig();
      if (config.windows) {
        console.log('[WindowManager] Конфигурация окон загружена из config:', config.windows);
        setWindows(config.windows);
      } else {
        console.log('[WindowManager] Используем конфигурацию окон по умолчанию');
        setWindows([
          { 
            id: '1', 
            type: 'chart', 
            symbol: 'BTCUSDT', 
            interval: '15', 
            exchange: 'Bybit', 
            x: 0, 
            y: 0, 
            width: 800, 
            height: 500 
          },
          { 
            id: '2', 
            type: 'orderbook', 
            symbol: 'BTCUSDT', 
            exchange: 'Bybit', 
            x: 810, 
            y: 0, 
            width: 300, 
            height: 300 
          },
          { 
            id: '3', 
            type: 'trades', 
            symbol: 'BTCUSDT', 
            exchange: 'Bybit', 
            x: 810, 
            y: 310, 
            width: 300, 
            height: 200 
          }
        ]);
      }
    };
    loadConfig();
  }, []);

  const renderWindowContent = (window) => {
    switch (window.type) {
      case 'chart':
        return <Chart symbol={window.symbol} interval={window.interval} exchange={window.exchange} />;
      case 'orderbook':
        return <OrderBook symbol={window.symbol} exchange={window.exchange} />;
      case 'trades':
        return <Trades symbol={window.symbol} exchange={window.exchange} />;
      case 'portfolio':
        return <Portfolio exchange={window.exchange} />;
      case 'strategy-log':
        return <StrategyLog />;
      default:
        return <div>Unknown window type</div>;
    }
  };

  const handleDragStop = (id, e, d) => {
    console.log(`[WindowManager] Окно ${id} перемещено в x=${d.x}, y=${d.y}`);
    setWindows(windows.map(w => w.id === id ? { ...w, x: d.x, y: d.y } : w));
  };

  const handleResizeStop = (id, direction, ref, delta, position) => {
    const width = parseInt(ref.style.width, 10);
    const height = parseInt(ref.style.height, 10);
    console.log(`[WindowManager] Окно ${id} изменило размер: width=${width}, height=${height}, x=${position.x}, y=${position.y}`);
    setWindows(windows.map(w => 
      w.id === id ? { ...w, width, height, x: position.x, y: position.y } : w
    ));
  };

  const addWindow = (type) => {
    console.log(`[WindowManager] Добавляем новое окно типа ${type} с символом ${activeSymbol}`);
    const newWindow = {
      id: Date.now().toString(),
      type,
      symbol: activeSymbol,
      exchange: 'Bybit',
      x: 100,
      y: 100,
      width: 400,
      height: 300
    };
    if (type === 'chart') {
      newWindow.interval = '15';
    }
    setWindows([...windows, newWindow]);
  };

  const closeWindow = (id) => {
    console.log(`[WindowManager] Закрываем окно с id=${id}`);
    setWindows(windows.filter(w => w.id !== id));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '10px', background: '#1e222d', display: 'flex', gap: '10px' }}>
        <SymbolSelector onSelect={setActiveSymbol} />
        <button onClick={() => addWindow('chart')}>Добавить график</button>
        <button onClick={() => addWindow('orderbook')}>Добавить стакан</button>
        <button onClick={() => addWindow('trades')}>Добавить сделки</button>
        <button onClick={() => addWindow('portfolio')}>Добавить портфель</button>
        <button onClick={() => addWindow('strategy-log')}>Добавить лог стратегий</button>
      </div>
      {windows.map(window => (
        <Rnd
          key={window.id}
          size={{ width: window.width, height: window.height }}
          position={{ x: window.x, y: window.y }}
          minWidth={200}
          minHeight={200}
          bounds="parent"
          onDragStop={(e, d) => handleDragStop(window.id, e, d)}
          onResizeStop={(e, direction, ref, delta, position) => 
            handleResizeStop(window.id, direction, ref, delta, position)
          }
          style={{
            background: '#2a2e39',
            border: '1px solid #485c7b',
            borderRadius: '4px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          default={{
            x: window.x,
            y: window.y,
            width: window.width,
            height: window.height
          }}
        >
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '5px 10px', 
              background: '#1e222d', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                {window.type.toUpperCase()} - {window.symbol}
                {window.interval && ` (${window.interval}m)`}
              </div>
              <button 
                onClick={() => closeWindow(window.id)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {renderWindowContent(window)}
            </div>
          </div>
        </Rnd>
      ))}
    </div>
  );
};

export default WindowManager;