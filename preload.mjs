import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Файловые операции
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  
  // Операции с биржами
  connectExchange: (config) => ipcRenderer.invoke('connect-exchange', config),
  disconnectExchange: (exchangeName) => ipcRenderer.invoke('disconnect-exchange', exchangeName),
  getExchanges: () => ipcRenderer.invoke('get-exchanges'),
  placeOrder: (order) => ipcRenderer.invoke('place-order', order),
  
  // События от бирж
  onExchangeStatus: (callback) => ipcRenderer.on('exchange-status', callback),
  onExchangeError: (callback) => ipcRenderer.on('exchange-error', callback),
  onOrderbookData: (callback) => ipcRenderer.on('orderbook-data', callback),
  onTradeData: (callback) => ipcRenderer.on('trade-data', callback),
  onPositionData: (callback) => ipcRenderer.on('position-data', callback),
  onOrderData: (callback) => ipcRenderer.on('order-data', callback),
  
  // Удаление обработчиков событий
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});