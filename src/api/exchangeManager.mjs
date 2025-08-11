import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import BybitExchange from './bybit.mjs';
import DataLogger from '../storage/DataLogger.mjs';

class ExchangeManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.exchanges = new Map(); // Хранит подключения к биржам
    this.logger = new DataLogger();
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.loadConfig();
  }

  // Загрузка конфигурации из файла
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        this.config = config.exchanges || {};
      } else {
        this.config = {};
      }
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = {};
    }
  }

  // Сохранение конфигурации в файл
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify({
        exchanges: this.config
      }, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  // Инициализация подключений
  initialize() {
    this.setupIPC();
    
    // Автоподключение к сохраненным биржам
    for (const [exchangeName, exchangeConfig] of Object.entries(this.config)) {
      if (exchangeConfig.autoConnect) {
        this.connectExchange(exchangeName, exchangeConfig);
      }
    }
  }

  // Настройка IPC-канала для обмена данными с рендерером
  setupIPC() {
    ipcMain.handle('connect-exchange', async (_, { exchangeName, apiKey, apiSecret, isDemo }) => {
      return this.connectExchange(exchangeName, { apiKey, apiSecret, isDemo });
    });

    ipcMain.handle('disconnect-exchange', (_, exchangeName) => {
      return this.disconnectExchange(exchangeName);
    });

    ipcMain.handle('get-exchanges', () => {
      return Array.from(this.exchanges.keys());
    });

    ipcMain.handle('place-order', async (_, { exchangeName, order }) => {
      const exchange = this.exchanges.get(exchangeName);
      if (!exchange) throw new Error('Exchange not connected');
      return exchange.placeOrder(order);
    });
  }

  // Подключение к бирже
  async connectExchange(exchangeName, { apiKey, apiSecret, isDemo = false }) {
    try {
      if (this.exchanges.has(exchangeName)) {
        throw new Error(`${exchangeName} already connected`);
      }

      let exchange;
      switch (exchangeName.toLowerCase()) {
        case 'bybit':
          exchange = new BybitExchange(apiKey, apiSecret, isDemo);
          break;
        // Можно добавить другие биржи
        default:
          throw new Error(`Unsupported exchange: ${exchangeName}`);
      }

      await exchange.connect();
      this.exchanges.set(exchangeName, exchange);

      // Сохраняем конфигурацию (без секретов в plain text)
      this.config[exchangeName] = {
        apiKey,
        isDemo,
        autoConnect: true,
        connectedAt: new Date().toISOString()
      };
      this.saveConfig();

      // Настройка обработчиков событий
      this.setupExchangeHandlers(exchangeName, exchange);

      this.logger.log(`Successfully connected to ${exchangeName}`);
      this.mainWindow.webContents.send('exchange-status', {
        exchange: exchangeName,
        status: 'connected'
      });

      return { success: true };
    } catch (error) {
      this.logger.log(`Failed to connect to ${exchangeName}: ${error.message}`);
      throw error;
    }
  }

  // Отключение от биржи
  async disconnectExchange(exchangeName) {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) return;

    try {
      await exchange.disconnect();
      this.exchanges.delete(exchangeName);
      
      // Обновляем конфигурацию
      if (this.config[exchangeName]) {
        this.config[exchangeName].autoConnect = false;
        this.saveConfig();
      }

      this.mainWindow.webContents.send('exchange-status', {
        exchange: exchangeName,
        status: 'disconnected'
      });

      return { success: true };
    } catch (error) {
      this.logger.log(`Failed to disconnect from ${exchangeName}: ${error.message}`);
      throw error;
    }
  }

  // Настройка обработчиков событий биржи
  setupExchangeHandlers(exchangeName, exchange) {
    exchange.on('error', (error) => {
      this.logger.log(`Exchange ${exchangeName} error: ${error.message}`);
      this.mainWindow.webContents.send('exchange-error', {
        exchange: exchangeName,
        error: error.message
      });
    });

    exchange.on('orderbook', (data) => {
      this.mainWindow.webContents.send('orderbook-data', {
        exchange: exchangeName,
        data
      });
      this.logger.logOrderbook(data);
    });

    exchange.on('trade', (data) => {
      this.mainWindow.webContents.send('trade-data', {
        exchange: exchangeName,
        data
      });
      this.logger.logTrade(data);
    });

    exchange.on('position', (data) => {
      this.mainWindow.webContents.send('position-data', {
        exchange: exchangeName,
        data
      });
    });

    exchange.on('order', (data) => {
      this.mainWindow.webContents.send('order-data', {
        exchange: exchangeName,
        data
      });
      this.logger.logOrder(data);
    });
  }
}

// Инициализация подключений к биржам
function initializeExchangeConnections(mainWindow) {
  const manager = new ExchangeManager(mainWindow);
  manager.initialize();
  return manager;
}

module.exports = {
  initializeExchangeConnections
};