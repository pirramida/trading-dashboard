const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Bybit = require('../src/api/Bybit');
const DataManager = require('../src/data/DataManager');
const Logger = require('../src/storage/Logger');
const Database = require('../src/storage/Database');

let db;
const exchanges = {};
const dataManager = new DataManager();
const logger = new Logger();
const database = new Database();
const subscriptions = {
    trades: new Map(),
    orderbook: new Map(),
    candles: new Map(),
};

function getSubKey(exchange, symbol, interval = '') {
    const key = interval ? `${exchange}_${symbol}_${interval}` : `${exchange}_${symbol}`;
    console.log(`[getSubKey] Generated subscription key: ${key}`);
    return key;
}

function initializeIpcHandlers(ipcMain) {

    ipcMain.handle('init-database', async () => {
        console.log('[IPC] init-database called');
        try {
            db = await database.init();
            console.log('[IPC] Database initialized successfully');
            return { status: 'success' };
        } catch (error) {
            console.error('[IPC] init-database error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('read-file', async (_, filePath) => {
        console.log(`[IPC] read-file called with path: ${filePath}`);
        try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            console.log('[IPC] File read successfully');
            return data;
        } catch (error) {
            console.error('[IPC] read-file error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('write-file', async (_, filePath, data) => {
        console.log(`[IPC] write-file called with path: ${filePath}`);
        try {
            await fs.promises.writeFile(filePath, data, 'utf8');
            console.log('[IPC] File written successfully');
            return { status: 'success' };
        } catch (error) {
            console.error('[IPC] write-file error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('get-config', async () => {
        console.log('[IPC] get-config called');
        try {
            const configPath = path.join(__dirname, '../config.json');
            if (fs.existsSync(configPath)) {
                const data = await fs.promises.readFile(configPath, 'utf8');
                console.log('[IPC] Config read successfully');
                return JSON.parse(data);
            }
            console.log('[IPC] Config file does not exist, returning empty object');
            return {};
        } catch (error) {
            console.error('[IPC] get-config error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('save-config', async (_, config) => {
        console.log('[IPC] save-config called');
        try {
            const configPath = path.join(__dirname, '../config.json');
            await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log('[IPC] Config saved successfully');
            return { status: 'success' };
        } catch (error) {
            console.error('[IPC] save-config error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('get-exchange-data', async (_, exchangeName, symbol, dataType) => {
        console.log(`[IPC] get-exchange-data called with exchange=${exchangeName}, symbol=${symbol}, dataType=${dataType}`);
        try {
            if (!exchanges[exchangeName]) {
                throw new Error(`Exchange ${exchangeName} not connected`);
            }
            const exchange = exchanges[exchangeName];

            switch (dataType) {
                case 'account':
                    console.log('[IPC] Fetching account info');
                    return await exchange.getAccountInfo();

                case 'orders':
                    console.log('[IPC] Fetching open orders');
                    return await exchange.getOpenOrders(symbol);

                case 'historical-candles':
                case `historical-${dataType.split('-')[1]}`:
                    {
                        const interval = dataType.split('-')[1];
                        console.log(`[IPC] Fetching historical candles with interval ${interval}`);
                        return await exchange.getHistoricalCandles(symbol, interval);
                    }

                case 'orderbook':
                    console.log('[IPC] Subscribing to orderbook for one-time data');
                    return new Promise((resolve) => {
                        exchange.subscribeOrderBook(symbol, (data) => {
                            console.log('[IPC] Received orderbook data');
                            resolve(data);
                        });
                    });

                case 'trades':
                    console.log('[IPC] Subscribing to trades for one-time data');
                    return new Promise((resolve) => {
                        exchange.subscribeTrades(symbol, (data) => {
                            console.log('[IPC] Received trades data');
                            resolve(data);
                        });
                    });

                case 'candles':
                case `realtime-${dataType.split('-')[1]}`:
                    {
                        const candleInterval = dataType.split('-')[1];
                        console.log(`[IPC] Subscribing to realtime candles with interval ${candleInterval}`);
                        return new Promise((resolve) => {
                            exchange.subscribeCandles(symbol, candleInterval, (data) => {
                                console.log('[IPC] Received candles data');
                                resolve(data);
                            });
                        });
                    }

                default:
                    throw new Error(`Unsupported data type: ${dataType}`);
            }
        } catch (error) {
            console.error(`[IPC] get-exchange-data error (${exchangeName}, ${symbol}, ${dataType}):`, error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('connect-exchange', async (_, exchangeName, apiKey, apiSecret) => {
        console.log(`[IPC] connect-exchange called with exchange=${exchangeName}`);
        try {
            let exchange;
            switch (exchangeName.toLowerCase()) {
                case 'bybit':
                    exchange = new Bybit(apiKey, apiSecret);
                    break;
                default:
                    throw new Error('Unsupported exchange');
            }
            await exchange.connect();
            console.log(`[IPC] Connected to exchange ${exchangeName}`);
            exchanges[exchangeName] = exchange;
            dataManager.addExchange(exchangeName, exchange);
            return { status: 'connected', exchange: exchangeName };
        } catch (error) {
            console.error('[IPC] connect-exchange error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('disconnect-exchange', async (_, exchangeName) => {
        console.log(`[IPC] disconnect-exchange called with exchange=${exchangeName}`);
        try {
            if (exchanges[exchangeName]) {
                await exchanges[exchangeName].disconnect();
                delete exchanges[exchangeName];
                dataManager.removeExchange(exchangeName);
                console.log(`[IPC] Disconnected exchange ${exchangeName}`);
                return { status: 'disconnected', exchange: exchangeName };
            } else {
                console.warn(`[IPC] Exchange ${exchangeName} not found during disconnect`);
                return { status: 'error', message: 'Exchange not found' };
            }
        } catch (error) {
            console.error('[IPC] disconnect-exchange error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('log-strategy-event', async (_, strategy, event) => {
        console.log('[IPC] log-strategy-event called');
        try {
            await logger.logStrategyEvent(strategy, event);
            console.log('[IPC] Strategy event logged');
            return { status: 'logged' };
        } catch (error) {
            console.error('[IPC] log-strategy-event error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.handle('get-strategy-logs', async (_, date) => {
        console.log(`[IPC] get-strategy-logs called with date=${date}`);
        try {
            const logs = await logger.getStrategyLogs(date);
            console.log('[IPC] Strategy logs retrieved');
            return logs;
        } catch (error) {
            console.error('[IPC] get-strategy-logs error:', error);
            return { status: 'error', message: error.message };
        }
    });

    ipcMain.on('subscribe-trades', (event, { exchange, symbol }) => {
        console.log(`[IPC] subscribe-trades called with exchange=${exchange}, symbol=${symbol}`);
        try {
            const key = getSubKey(exchange, symbol);
            if (!subscriptions.trades.has(key)) {
                if (!exchanges[exchange]) {
                    console.warn(`[IPC] Exchange ${exchange} not connected`);
                    event.reply('error', `Exchange ${exchange} not connected`);
                    return;
                }
                console.log(`[IPC] Creating new trades subscription for key ${key}`);
                subscriptions.trades.set(key, new Set());
                exchanges[exchange].subscribeTrades(symbol, (data) => {
                    const clients = subscriptions.trades.get(key);
                    if (clients) {
                        clients.forEach(webContents => {
                            try {
                                webContents.send('trades-update', { exchange, symbol, data });
                            } catch (sendError) {
                                console.error('[IPC] Error sending trades-update:', sendError);
                            }
                        });
                    }
                });
            }
            subscriptions.trades.get(key).add(event.sender);
            console.log(`[IPC] Added subscriber to trades for key ${key}, total subscribers: ${subscriptions.trades.get(key).size}`);
        } catch (error) {
            console.error('[IPC] subscribe-trades error:', error);
            event.reply('error', error.message || 'Unknown subscribe-trades error');
        }
    });

    ipcMain.on('unsubscribe-trades', (event, { exchange, symbol }) => {
        console.log(`[IPC] unsubscribe-trades called with exchange=${exchange}, symbol=${symbol}`);
        try {
            const key = getSubKey(exchange, symbol);
            if (subscriptions.trades.has(key)) {
                const clients = subscriptions.trades.get(key);
                clients.delete(event.sender);
                if (clients.size === 0) {
                    if (exchanges[exchange] && typeof exchanges[exchange].unsubscribeTrades === 'function') {
                        console.log(`[IPC] Removing trades subscription for key ${key}`);
                        exchanges[exchange].unsubscribeTrades(symbol);
                    }
                    subscriptions.trades.delete(key);
                }
                console.log(`[IPC] Subscriber removed from trades for key ${key}, remaining subscribers: ${clients.size}`);
            }
        } catch (error) {
            console.error('[IPC] unsubscribe-trades error:', error);
        }
    });

    ipcMain.on('subscribe-orderbook', (event, { exchange, symbol }) => {
        console.log(`[IPC] subscribe-orderbook received: exchange=${exchange}, symbol=${symbol}`);
        try {
            const key = getSubKey(exchange, symbol);
            if (!subscriptions.orderbook.has(key)) {
                subscriptions.orderbook.set(key, new Set());
                if (!exchanges[exchange]) {
                    console.warn(`[IPC] Exchange ${exchange} not connected, cannot subscribe`);
                    event.reply('error', `Exchange ${exchange} not connected`);
                    return;
                }
                console.log(`[IPC] Creating new orderbook subscription for key ${key}`);
                exchanges[exchange].subscribeOrderBook(symbol, (data) => {
                    console.log(`[IPC] Orderbook data received for ${exchange} ${symbol}`, data);
                    const clients = subscriptions.orderbook.get(key);
                    if (clients) {
                        clients.forEach(webContents => {
                            try {
                                webContents.send('orderbook-update', { exchange, symbol, data });
                            } catch (sendError) {
                                console.error('[IPC] Error sending orderbook-update:', sendError);
                            }
                        });
                    }
                });
            }
            subscriptions.orderbook.get(key).add(event.sender);
            console.log(`[IPC] Added subscriber for orderbook key ${key}, total subscribers: ${subscriptions.orderbook.get(key).size}`);
        } catch (error) {
            console.error('[IPC] subscribe-orderbook error:', error);
            event.reply('error', error.message || 'Unknown subscribe-orderbook error');
        }
    });

    ipcMain.on('unsubscribe-orderbook', (event, { exchange, symbol }) => {
        console.log(`[IPC] unsubscribe-orderbook called with exchange=${exchange}, symbol=${symbol}`);
        try {
            const key = getSubKey(exchange, symbol);
            if (subscriptions.orderbook.has(key)) {
                const clients = subscriptions.orderbook.get(key);
                clients.delete(event.sender);
                if (clients.size === 0) {
                    if (exchanges[exchange] && typeof exchanges[exchange].unsubscribeOrderBook === 'function') {
                        console.log(`[IPC] Removing orderbook subscription for key ${key}`);
                        exchanges[exchange].unsubscribeOrderBook(symbol);
                    }
                    subscriptions.orderbook.delete(key);
                }
                console.log(`[IPC] Subscriber removed from orderbook for key ${key}, remaining subscribers: ${clients.size}`);
            }
        } catch (error) {
            console.error('[IPC] unsubscribe-orderbook error:', error);
        }
    });

    ipcMain.on('subscribe-candles', (event, { exchange, symbol, interval }) => {
        console.log(`[IPC] subscribe-candles called with exchange=${exchange}, symbol=${symbol}, interval=${interval}`);
        try {
            const key = getSubKey(exchange, symbol, interval);
            if (!subscriptions.candles.has(key)) {
                subscriptions.candles.set(key, new Set());
                if (!exchanges[exchange]) {
                    console.warn(`[IPC] Exchange ${exchange} not connected`);
                    event.reply('error', `Exchange ${exchange} not connected`);
                    return;
                }
                console.log(`[IPC] Creating new candles subscription for key ${key}`);
                exchanges[exchange].subscribeCandles(symbol, interval, (data) => {
                    const clients = subscriptions.candles.get(key);
                    if (clients) {
                        clients.forEach(webContents => {
                            try {
                                webContents.send('candles-update', { exchange, symbol, interval, data });
                            } catch (sendError) {
                                console.error('[IPC] Error sending candles-update:', sendError);
                            }
                        });
                    }
                });
            }
            subscriptions.candles.get(key).add(event.sender);
            console.log(`[IPC] Added subscriber for candles key ${key}, total subscribers: ${subscriptions.candles.get(key).size}`);
        } catch (error) {
            console.error('[IPC] subscribe-candles error:', error);
            event.reply('error', error.message || 'Unknown subscribe-candles error');
        }
    });

    ipcMain.on('unsubscribe-candles', (event, { exchange, symbol, interval }) => {
        console.log(`[IPC] unsubscribe-candles called with exchange=${exchange}, symbol=${symbol}, interval=${interval}`);
        try {
            const key = getSubKey(exchange, symbol, interval);
            if (subscriptions.candles.has(key)) {
                const clients = subscriptions.candles.get(key);
                clients.delete(event.sender);
                if (clients.size === 0) {
                    if (exchanges[exchange] && typeof exchanges[exchange].unsubscribeCandles === 'function') {
                        console.log(`[IPC] Removing candles subscription for key ${key}`);
                        exchanges[exchange].unsubscribeCandles(symbol, interval);
                    }
                    subscriptions.candles.delete(key);
                }
                console.log(`[IPC] Subscriber removed from candles for key ${key}, remaining subscribers: ${clients.size}`);
            }
        } catch (error) {
            console.error('[IPC] unsubscribe-candles error:', error);
        }
    });
}

module.exports = initializeIpcHandlers;
