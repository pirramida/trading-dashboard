import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

const Chart = ({ data, candles, trades, orders, width, height }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const volumeSeriesRef = useRef();
  const tradeMarkersRef = useRef([]);
  const orderMarkersRef = useRef([]);

  useEffect(() => {
    // Инициализация графика
    chartRef.current = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        backgroundColor: '#1e1e1e',
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: {
          color: '#2b2b2b',
        },
        horzLines: {
          color: '#2b2b2b',
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    volumeSeriesRef.current = chartRef.current.addHistogramSeries({
      color: '#26a69a80',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    return () => {
      chartRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ width, height });
    }
  }, [width, height]);

  useEffect(() => {
    if (candleSeriesRef.current && data) {
      candleSeriesRef.current.setData(data.candles);
      volumeSeriesRef.current.setData(data.volumes);
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  useEffect(() => {
    if (candleSeriesRef.current && trades) {
      // Очистка предыдущих маркеров
      tradeMarkersRef.current.forEach(marker => {
        candleSeriesRef.current.removePriceLine(marker);
      });
      tradeMarkersRef.current = [];

      // Добавление новых маркеров
      trades.forEach(trade => {
        const marker = {
          time: trade.time,
          position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
          color: trade.side === 'buy' ? '#26a69a' : '#ef5350',
          shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
          text: `${trade.side} @ ${trade.price}`,
        };
        candleSeriesRef.current.setMarkers([...candleSeriesRef.current.markers(), marker]);
        tradeMarkersRef.current.push(marker);
      });
    }
  }, [trades]);

  useEffect(() => {
    if (candleSeriesRef.current && orders) {
      // Очистка предыдущих ордеров
      orderMarkersRef.current.forEach(marker => {
        candleSeriesRef.current.removePriceLine(marker);
      });
      orderMarkersRef.current = [];

      // Добавление новых ордеров
      orders.forEach(order => {
        const line = candleSeriesRef.current.createPriceLine({
          price: order.price,
          color: order.side === 'buy' ? '#26a69a' : '#ef5350',
          lineWidth: 1,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: `${order.side} ${order.quantity}`,
        });
        orderMarkersRef.current.push(line);
      });
    }
  }, [orders]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Chart;