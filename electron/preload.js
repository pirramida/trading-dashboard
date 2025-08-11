const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Файловые операции
    readFile: (path) => {
        console.log('[preload] readFile called with path:', path);
        return ipcRenderer.invoke('read-file', path);
    },
    writeFile: (path, data) => {
        console.log('[preload] writeFile called with path:', path);
        return ipcRenderer.invoke('write-file', path, data);
    },
    existsFile: (path) => {
        console.log('[preload] existsFile called with path:', path);
        return ipcRenderer.invoke('exists-file', path);
    },

    // База данных
    dbQuery: (query, params) => {
        console.log('[preload] dbQuery called with query:', query, 'params:', params);
        return ipcRenderer.invoke('db-query', query, params);
    },
    dbInsert: (table, data) => {
        console.log('[preload] dbInsert called with table:', table, 'data:', data);
        return ipcRenderer.invoke('db-insert', table, data);
    },
    dbUpdate: (table, id, data) => {
        console.log('[preload] dbUpdate called with table:', table, 'id:', id, 'data:', data);
        return ipcRenderer.invoke('db-update', table, id, data);
    },
    dbDelete: (table, id) => {
        console.log('[preload] dbDelete called with table:', table, 'id:', id);
        return ipcRenderer.invoke('db-delete', table, id);
    },

    // Конфигурация
    getConfig: () => {
        console.log('[preload] getConfig called');
        return ipcRenderer.invoke('get-config');
    },
    saveConfig: (config) => {
        console.log('[preload] saveConfig called with config:', config);
        return ipcRenderer.invoke('save-config', config);
    },

    // Биржи
    connectExchange: (exchange, apiKey, apiSecret) => {
        console.log('[preload] connectExchange called with:', exchange, apiKey, '****');
        return ipcRenderer.invoke('connect-exchange', exchange, apiKey, apiSecret);
    },
    disconnectExchange: (exchange) => {
        console.log('[preload] disconnectExchange called with:', exchange);
        return ipcRenderer.invoke('disconnect-exchange', exchange);
    },
    getExchangeData: (exchange, symbol, type) => {
        console.log('[preload] getExchangeData called with:', exchange, symbol, type);
        return ipcRenderer.invoke('get-exchange-data', exchange, symbol, type);
    },

    // Логирование
    logStrategyEvent: (strategy, event) => {
        console.log('[preload] logStrategyEvent called with:', strategy, event);
        return ipcRenderer.invoke('log-strategy-event', strategy, event);
    },
    getStrategyLogs: (date) => {
        console.log('[preload] getStrategyLogs called with date:', date);
        return ipcRenderer.invoke('get-strategy-logs', date);
    },

    getBybitSymbols: () => {
        console.log('[preload] getBybitSymbols called');
        return ipcRenderer.invoke('get-bybit-symbols');
    },

    subscribeTrades: (params) => {
        console.log('[preload] subscribeTrades called with:', params);
        return ipcRenderer.send('subscribe-trades', params);
    },
    unsubscribeTrades: (params) => {
        console.log('[preload] unsubscribeTrades called with:', params);
        return ipcRenderer.send('unsubscribe-trades', params);
    },
    onTradesUpdate: (callback) => {
        console.log('[preload] onTradesUpdate handler set');
        const handler = (event, data) => {
            console.log('[preload] onTradesUpdate received data:', data);
            callback(data);
        };
        ipcRenderer.on('trades-update', handler);
        return () => {
            console.log('[preload] onTradesUpdate handler removed');
            ipcRenderer.off('trades-update', handler);
        };
    },

    subscribeOrderBook: (params) => {
        console.log('[preload] subscribeOrderBook called with:', params);
        return ipcRenderer.send('subscribe-orderbook', params);
    },
    unsubscribeOrderBook: (params) => {
        console.log('[preload] unsubscribeOrderBook called with:', params);
        return ipcRenderer.send('unsubscribe-orderbook', params);
    },
    onOrderBookUpdate: (callback) => {
        console.log('[preload] onOrderBookUpdate handler set');
        const handler = (event, data) => {
            console.log('[preload] onOrderBookUpdate received data:', data);
            callback(data);
        };
        ipcRenderer.on('orderbook-update', handler);
        return () => {
            console.log('[preload] onOrderBookUpdate handler removed');
            ipcRenderer.off('orderbook-update', handler);
        };
    },

    subscribeCandles: (params) => {
        console.log('[preload] subscribeCandles called with:', params);
        return ipcRenderer.send('subscribe-candles', params);
    },
    unsubscribeCandles: (params) => {
        console.log('[preload] unsubscribeCandles called with:', params);
        return ipcRenderer.send('unsubscribe-candles', params);
    },
    onCandlesUpdate: (callback) => {
        console.log('[preload] onCandlesUpdate handler set');
        const handler = (event, data) => {
            console.log('[preload] onCandlesUpdate received data:', data);
            callback(data);
        };
        ipcRenderer.on('candles-update', handler);
        return () => {
            console.log('[preload] onCandlesUpdate handler removed');
            ipcRenderer.off('candles-update', handler);
        };
    },
});
