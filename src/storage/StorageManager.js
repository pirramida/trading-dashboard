const fs = require('fs');
const path = require('path');
const { Logger } = require('./Logger');
const { Database } = require('./Database');

class StorageManager {
  constructor() {
    this.logger = new Logger();
    this.database = new Database();
    this.dataDir = path.join(__dirname, '../../data');
    this.cache = new Map();
    
    this.initStorage();
  }

  initStorage() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.database.init().catch(err => {
      console.error('Database initialization error:', err);
    });
  }

  async saveMarketData(symbol, data, type = 'candles') {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const dirPath = path.join(this.dataDir, 'market', dateStr);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const filePath = path.join(dirPath, `${symbol}_${type}.json`);
    const existingData = await this.readMarketData(symbol, date, type) || [];
    const mergedData = this.mergeMarketData(existingData, data, type);
    
    await fs.promises.writeFile(filePath, JSON.stringify(mergedData));
    this.cache.set(`${symbol}_${type}_${dateStr}`, mergedData);
  }

  async readMarketData(symbol, date = new Date(), type = 'candles') {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${symbol}_${type}_${dateStr}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const filePath = path.join(this.dataDir, 'market', dateStr, `${symbol}_${type}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = JSON.parse(await fs.promises.readFile(filePath));
    this.cache.set(cacheKey, data);
    return data;
  }

  mergeMarketData(existing, newData, type) {
    if (type === 'candles') {
      const merged = [...existing];
      const existingTimes = new Set(existing.map(d => d.time));
      
      for (const item of newData) {
        if (!existingTimes.has(item.time)) {
          merged.push(item);
        }
      }
      
      return merged.sort((a, b) => a.time - b.time);
    }
    
    return [...existing, ...newData];
  }

  async logTrade(tradeData) {
    await this.database.insert('trades', tradeData);
    await this.logger.logStrategyEvent(
      tradeData.strategy, 
      {
        type: 'trade',
        symbol: tradeData.symbol,
        side: tradeData.side,
        price: tradeData.price,
        quantity: tradeData.quantity
      }
    );
  }

  async getTrades(filter = {}) {
    let query = 'SELECT * FROM trades';
    const params = [];
    const conditions = [];
    
    if (filter.exchange) {
      conditions.push('exchange = ?');
      params.push(filter.exchange);
    }
    
    if (filter.symbol) {
      conditions.push('symbol = ?');
      params.push(filter.symbol);
    }
    
    if (filter.strategy) {
      conditions.push('strategy = ?');
      params.push(filter.strategy);
    }
    
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }
    
    return this.database.query(query, params);
  }

  async saveConfig(config) {
    await fs.promises.writeFile(
      path.join(this.dataDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  async loadConfig() {
    const configPath = path.join(this.dataDir, 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(await fs.promises.readFile(configPath));
    }
    return {};
  }
}

module.exports = StorageManager;