import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

class DataLogger {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.dbPath = path.join(app.getPath('userData'), 'trading_data.db');
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.initializeDatabase();
  }

  async initializeDatabase() {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });
    
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        symbol TEXT,
        side TEXT,
        price REAL,
        quantity REAL,
        exchange TEXT
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        symbol TEXT,
        side TEXT,
        type TEXT,
        price REAL,
        quantity REAL,
        status TEXT,
        exchange TEXT
      );
      
      CREATE TABLE IF NOT EXISTS candles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        symbol TEXT,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        timeframe TEXT
      );
    `);
  }

  getDailyLogFile() {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return path.join(this.logDir, `${dateStr}.log`);
  }

  logTrade(trade) {
    const logEntry = `${new Date().toISOString()} [TRADE] ${trade.symbol} ${trade.side} ${trade.quantity} @ ${trade.price}\n`;
    fs.appendFileSync(this.getDailyLogFile(), logEntry);
    
    this.db.run(
      'INSERT INTO trades (timestamp, symbol, side, price, quantity, exchange) VALUES (?, ?, ?, ?, ?, ?)',
      [new Date().toISOString(), trade.symbol, trade.side, trade.price, trade.quantity, trade.exchange || 'bybit']
    );
  }

  logOrder(order) {
    const logEntry = `${new Date().toISOString()} [ORDER] ${order.symbol} ${order.side} ${order.type} ${order.quantity} @ ${order.price || 'market'}\n`;
    fs.appendFileSync(this.getDailyLogFile(), logEntry);
    
    this.db.run(
      'INSERT INTO orders (timestamp, symbol, side, type, price, quantity, status, exchange) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [new Date().toISOString(), order.symbol, order.side, order.type, order.price, order.quantity, 'pending', order.exchange || 'bybit']
    );
  }

  logCandle(candle) {
    this.db.run(
      'INSERT INTO candles (timestamp, symbol, open, high, low, close, volume, timeframe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [candle.timestamp, candle.symbol, candle.open, candle.high, candle.low, candle.close, candle.volume, candle.timeframe]
    );
  }

  async getTrades(symbol, limit = 100) {
    return this.db.all(
      'SELECT * FROM trades WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?',
      [symbol, limit]
    );
  }

  async getOrders(symbol, limit = 100) {
    return this.db.all(
      'SELECT * FROM orders WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?',
      [symbol, limit]
    );
  }

  async getCandles(symbol, timeframe, from, to, limit = 500) {
    return this.db.all(
      'SELECT * FROM candles WHERE symbol = ? AND timeframe = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC LIMIT ?',
      [symbol, timeframe, from, to, limit]
    );
  }
}

export default DataLogger;