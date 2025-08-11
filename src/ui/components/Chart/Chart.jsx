import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import './Chart.css'; // Импорт CSS файла

const Chart = ({ symbol, exchange, interval = '1m' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const unsubscribeTradesRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      if (chartRef.current) {
        chartRef.current.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || dimensions.width === 0) return;

    chartRef.current = createChart(chartContainerRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      layout: {
        backgroundColor: '#1e222d',
        textColor: '#d9d9d9',
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    const onNewTrades = (msg) => {
      try {
        if (!msg || !msg.data) return;
        updateChart(msg.data);
      } catch (e) {
        console.error('Error processing trades update:', e);
      }
    };

    window.electronAPI.subscribeTrades({ exchange, symbol });
    unsubscribeTradesRef.current = window.electronAPI.onTradesUpdate(onNewTrades);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      window.electronAPI.unsubscribeTrades({ exchange, symbol });
      if (unsubscribeTradesRef.current) unsubscribeTradesRef.current();
    };
  }, [exchange, symbol, dimensions]);

  const updateChart = (trades) => {
    if (!trades.length || !candleSeriesRef.current) return;
    const candles = convertTradesToCandles(trades, interval);
    candleSeriesRef.current.setData(candles);
  };

  const convertTradesToCandles = (trades, interval) => {
    const candlesMap = {};
    const intervalMs = getIntervalMs(interval);
    
    trades.forEach((trade) => {
      const timeMs = Math.floor(trade.T / intervalMs) * intervalMs;
      if (!candlesMap[timeMs]) {
        const price = parseFloat(trade.p);
        const volume = parseFloat(trade.v);
        candlesMap[timeMs] = {
          time: timeMs / 1000,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume,
        };
      } else {
        const candle = candlesMap[timeMs];
        const price = parseFloat(trade.p);
        const volume = parseFloat(trade.v);
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
      }
    });
    
    return Object.values(candlesMap).sort((a, b) => a.time - b.time);
  };

  const getIntervalMs = (interval) => {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-legend">
        {symbol} - {interval}
      </div>
      <div className="chart-wrapper" ref={chartContainerRef} />
    </div>
  );
};

export default Chart;