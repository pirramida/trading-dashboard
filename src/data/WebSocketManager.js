class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
  }

  connect(exchange, url, protocols = []) {
    if (this.connections.has(exchange)) {
      return this.connections.get(exchange);
    }

    const ws = new WebSocket(url, protocols);
    this.connections.set(exchange, ws);

    ws.onopen = () => {
      console.log(`WebSocket connected to ${exchange}`);
      this.resubscribeAll(exchange);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected from ${exchange}`);
      this.connections.delete(exchange);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error (${exchange}):`, error);
    };

    ws.onmessage = (event) => {
      this.handleMessage(exchange, event.data);
    };

    return ws;
  }

  disconnect(exchange) {
    if (this.connections.has(exchange)) {
      this.connections.get(exchange).close();
      this.connections.delete(exchange);
      this.subscriptions.delete(exchange);
    }
  }

  subscribe(exchange, channel, symbol, callback) {
    const subscriptionKey = `${exchange}:${channel}:${symbol}`;
    
    if (!this.subscriptions.has(exchange)) {
      this.subscriptions.set(exchange, new Map());
    }

    const exchangeSubscriptions = this.subscriptions.get(exchange);
    exchangeSubscriptions.set(subscriptionKey, callback);

    if (this.connections.has(exchange)) {
      this.sendSubscribeMessage(exchange, channel, symbol);
    }
  }

  unsubscribe(exchange, channel, symbol) {
    const subscriptionKey = `${exchange}:${channel}:${symbol}`;
    
    if (this.subscriptions.has(exchange)) {
      const exchangeSubscriptions = this.subscriptions.get(exchange);
      exchangeSubscriptions.delete(subscriptionKey);

      if (this.connections.has(exchange)) {
        this.sendUnsubscribeMessage(exchange, channel, symbol);
      }
    }
  }

  sendSubscribeMessage(exchange, channel, symbol) {
    const ws = this.connections.get(exchange);
    if (!ws) return;

    let message;
    switch (exchange) {
      case 'Bybit':
        message = JSON.stringify({
          op: 'subscribe',
          args: [`${channel}.${symbol}`]
        });
        break;
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    ws.send(message);
  }

  sendUnsubscribeMessage(exchange, channel, symbol) {
    const ws = this.connections.get(exchange);
    if (!ws) return;

    let message;
    switch (exchange) {
      case 'Bybit':
        message = JSON.stringify({
          op: 'unsubscribe',
          args: [`${channel}.${symbol}`]
        });
        break;
      case 'Binance':
        message = JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@${channel}`],
          id: Date.now()
        });
        break;
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    ws.send(message);
  }

  handleMessage(exchange, data) {
    try {
      const message = JSON.parse(data);
      
      if (this.subscriptions.has(exchange)) {
        const exchangeSubscriptions = this.subscriptions.get(exchange);
        
        // Обработка разных форматов сообщений от бирж
        if (exchange === 'Bybit' && message.topic) {
          const [channel, symbol] = message.topic.split('.');
          const subscriptionKey = `${exchange}:${channel}:${symbol}`;
          const callback = exchangeSubscriptions.get(subscriptionKey);
          if (callback) callback(message.data);
        } 
        else if (exchange === 'Binance' && message.stream) {
          const [symbol, channel] = message.stream.split('@');
          const subscriptionKey = `${exchange}:${channel}:${symbol.toUpperCase()}`;
          const callback = exchangeSubscriptions.get(subscriptionKey);
          if (callback) callback(message.data);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  resubscribeAll(exchange) {
    if (!this.subscriptions.has(exchange)) return;

    const exchangeSubscriptions = this.subscriptions.get(exchange);
    for (const [key] of exchangeSubscriptions) {
      const [_, channel, symbol] = key.split(':');
      this.sendSubscribeMessage(exchange, channel, symbol);
    }
  }

  registerMessageHandler(exchange, handler) {
    this.messageHandlers.set(exchange, handler);
  }
}

module.exports = WebSocketManager;