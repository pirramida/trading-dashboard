class Exchange {
  constructor(name, apiKey, apiSecret) {
    if (new.target === Exchange) {
      throw new TypeError("Cannot construct Abstract instances directly");
    }
    
    this.name = name;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.connected = false;
    this.sockets = {};
    this.subscriptions = new Set();
  }

  async connect() {
    throw new Error('Abstract method "connect" must be implemented');
  }

  async disconnect() {
    throw new Error('Abstract method "disconnect" must be implemented');
  }

  async getAccountInfo() {
    throw new Error('Abstract method "getAccountInfo" must be implemented');
  }

  async getOpenOrders(symbol) {
    throw new Error('Abstract method "getOpenOrders" must be implemented');
  }

  async placeOrder(order) {
    throw new Error('Abstract method "placeOrder" must be implemented');
  }

  async cancelOrder(orderId) {
    throw new Error('Abstract method "cancelOrder" must be implemented');
  }

  subscribeOrderBook(symbol, callback) {
    throw new Error('Abstract method "subscribeOrderBook" must be implemented');
  }

  subscribeTrades(symbol, callback) {
    throw new Error('Abstract method "subscribeTrades" must be implemented');
  }

  subscribeCandles(symbol, interval, callback) {
    throw new Error('Abstract method "subscribeCandles" must be implemented');
  }

  unsubscribe(symbol) {
    throw new Error('Abstract method "unsubscribe" must be implemented');
  }

  getHistoricalCandles(symbol, interval, limit) {
    throw new Error('Abstract method "getHistoricalCandles" must be implemented');
  }
}

module.exports = Exchange;