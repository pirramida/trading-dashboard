class DataManager {
  constructor() {
    this.exchanges = {};
    this.subscribers = {
      orderbook: {},
      trades: {},
      candles: {}
    };
    this.historicalData = {};
  }

  addExchange(name, exchange) {
    this.exchanges[name] = exchange;
  }

  removeExchange(name) {
    delete this.exchanges[name];
  }

  subscribeOrderBook(exchange, symbol, callback) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not connected`);
    }

    if (!this.subscribers.orderbook[symbol]) {
      this.subscribers.orderbook[symbol] = [];
    }

    this.subscribers.orderbook[symbol].push(callback);
    this.exchanges[exchange].subscribeOrderBook(symbol, (data) => {
      this.handleOrderBookData(symbol, data);
    });
  }

  subscribeTrades(exchange, symbol, callback) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not connected`);
    }

    if (!this.subscribers.trades[symbol]) {
      this.subscribers.trades[symbol] = [];
    }

    this.subscribers.trades[symbol].push(callback);
    this.exchanges[exchange].subscribeTrades(symbol, (data) => {
      this.handleTradeData(symbol, data);
    });
  }

  subscribeCandles(exchange, symbol, interval, callback) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not connected`);
    }

    const key = `${symbol}_${interval}`;
    if (!this.subscribers.candles[key]) {
      this.subscribers.candles[key] = [];
    }

    this.subscribers.candles[key].push(callback);
    this.exchanges[exchange].subscribeCandles(symbol, interval, (data) => {
      this.handleCandleData(symbol, interval, data);
    });
  }

  async getHistoricalCandles(exchange, symbol, interval, limit) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not connected`);
    }

    const key = `${exchange}_${symbol}_${interval}`;
    if (!this.historicalData[key]) {
      this.historicalData[key] = await this.exchanges[exchange].getHistoricalCandles(symbol, interval, limit);
    }

    return this.historicalData[key];
  }

  handleOrderBookData(symbol, data) {
    if (!this.subscribers.orderbook[symbol]) return;

    const formattedData = {
      bids: data.filter(d => d.side === 'Buy').map(d => [d.price, d.size]),
      asks: data.filter(d => d.side === 'Sell').map(d => [d.price, d.size])
    };

    this.subscribers.orderbook[symbol].forEach(cb => cb(formattedData));
  }

  handleTradeData(symbol, data) {
    if (!this.subscribers.trades[symbol]) return;

    const formattedData = data.map(trade => ({
      id: trade.trade_id,
      price: trade.price,
      quantity: trade.size,
      side: trade.side,
      time: trade.timestamp
    }));

    this.subscribers.trades[symbol].forEach(cb => cb(formattedData));
  }

  handleCandleData(symbol, interval, data) {
    const key = `${symbol}_${interval}`;
    if (!this.subscribers.candles[key]) return;

    const formattedData = data.map(candle => ({
      time: candle.start,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));

    this.subscribers.candles[key].forEach(cb => cb(formattedData));
  }
}

module.exports = DataManager;
