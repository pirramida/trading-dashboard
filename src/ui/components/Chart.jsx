import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const Chart = ({ symbol, exchange }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);

    const [trades, setTrades] = useState([]);
    const unsubscribeTradesRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Создаем график
        chartRef.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
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

        // Обработчик обновления трейдов
        const onNewTrades = (data) => {
            try {
                if (!data || !data.data) return;
                setTrades((prev) => [...prev, ...data.data]);
                updateChart(data.data);
            } catch (e) {
                console.error('Error processing trades update:', e);
            }
        };

        // Подписываемся
        window.electronAPI.subscribeTrades({ exchange, symbol });
        unsubscribeTradesRef.current = window.electronAPI.onTradesUpdate(onNewTrades);

        // Очистка при демонтировании
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            window.electronAPI.unsubscribeTrades({ exchange, symbol });
            if (unsubscribeTradesRef.current) unsubscribeTradesRef.current();
            setTrades([]);
        };
    }, [exchange, symbol]);

    const updateChart = (newTrades) => {
        if (!newTrades.length) return;
        const candles = convertTradesToCandles(newTrades, '1m');
        candleSeriesRef.current.setData(candles);
    };

    // Конвертация трейдов в свечи
    const convertTradesToCandles = (trades, interval) => {
        const candles = {};
        const intervalMs = getIntervalMs(interval);

        trades.forEach((trade) => {
            const time = Math.floor(trade.timestamp / intervalMs) * intervalMs;
            if (!candles[time]) {
                candles[time] = {
                    time: time / 1000, // lightweight-charts ожидает время в секундах
                    open: trade.price,
                    high: trade.price,
                    low: trade.price,
                    close: trade.price,
                    volume: trade.size,
                };
            } else {
                const candle = candles[time];
                candle.high = Math.max(candle.high, trade.price);
                candle.low = Math.min(candle.low, trade.price);
                candle.close = trade.price;
                candle.volume += trade.size;
            }
        });

        return Object.values(candles);
    };

    const getIntervalMs = (interval) => {
        const unit = interval.slice(-1);
        const value = parseInt(interval.slice(0, -1));
        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 60 * 1000;
        }
    };

    return <div style={{ width: '100%', height: '100%' }}><div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} /></div>;
};

export default Chart;
