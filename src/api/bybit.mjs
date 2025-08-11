import WebSocket from "ws";
import axios from "axios";

class BybitExchange {
  constructor(apiKey, apiSecret, isDemo = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = isDemo
      ? "https://api-testnet.bybit.com"
      : "https://api.bybit.com";
    this.wsUrl = isDemo
      ? "wss://stream-testnet.bybit.com"
      : "wss://stream.bybit.com";
    this.ws = null;
    this.subscriptions = new Set();
    this.listeners = {
      orderbook: [],
      trades: [],
      candles: [],
      orders: [],
      positions: [],
    };
  }

  async connect() {
    await this.connectWebSocket();
    await this.loadInitialData();
  }

  async connectWebSocket() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on("open", () => {
      console.log("Bybit WebSocket connected");
      this.resubscribe();
    });

    this.ws.on("message", (data) => {
      const message = JSON.parse(data);
      this.handleWebSocketMessage(message);
    });

    this.ws.on("close", () => {
      console.log("Bybit WebSocket disconnected");
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on("error", (err) => {
      console.error("Bybit WebSocket error:", err);
    });
  }

  handleWebSocketMessage(message) {
    if (message.topic) {
      if (message.topic.startsWith("orderBook")) {
        this.listeners.orderbook.forEach((cb) => cb(message));
      } else if (message.topic.startsWith("trade")) {
        this.listeners.trades.forEach((cb) => cb(message));
      } else if (message.topic.startsWith("kline")) {
        this.listeners.candles.forEach((cb) => cb(message));
      }
    }
  }

  async loadInitialData() {
    try {
      const balances = await this.getBalances();
      const positions = await this.getPositions();

      this.listeners.positions.forEach((cb) => cb(positions));
      return { balances, positions };
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  subscribeOrderBook(symbol, callback) {
    const topic = `orderBook_200.100ms.${symbol}`;
    this.subscribe(topic, callback, "orderbook");
  }

  subscribeTrades(symbol, callback) {
    const topic = `trade.${symbol}`;
    this.subscribe(topic, callback, "trades");
  }

  subscribeCandles(symbol, interval, callback) {
    const topic = `kline.${interval}.${symbol}`;
    this.subscribe(topic, callback, "candles");
  }

  subscribe(topic, callback, type) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.add(topic);
      this.ws.send(
        JSON.stringify({
          op: "subscribe",
          args: [topic],
        })
      );
    }
    this.listeners[type].push(callback);
  }

  resubscribe() {
    if (this.subscriptions.size > 0) {
      this.ws.send(
        JSON.stringify({
          op: "subscribe",
          args: Array.from(this.subscriptions),
        })
      );
    }
  }

  async getBalances() {
    const response = await this._privateRequest(
      "GET",
      "/v2/private/wallet/balance"
    );
    return response.result;
  }

  async getPositions() {
    const response = await this._privateRequest(
      "GET",
      "/v2/private/position/list"
    );
    return response.result;
  }

  async placeOrder(order) {
    const params = {
      symbol: order.symbol,
      side: order.side,
      order_type: order.type,
      qty: order.quantity,
      price: order.price,
      time_in_force: "GoodTillCancel",
    };

    const response = await this._privateRequest(
      "POST",
      "/v2/private/order/create",
      params
    );
    return response.result;
  }

  async _privateRequest(method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const recvWindow = "5000";

    let query = "";
    if (method === "GET") {
      query = new URLSearchParams({
        ...params,
        timestamp,
        recv_window: recvWindow,
      }).toString();
    }

    const signature = this._signRequest(
      query || JSON.stringify({ ...params, timestamp, recv_window: recvWindow })
    );

    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
        "X-BAPI-API-KEY": this.apiKey,
        "X-BAPI-SIGN": signature,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recvWindow,
      },
    };

    if (method === "GET") {
      config.url += `?${query}`;
    } else {
      config.data = { ...params, timestamp, recv_window: recvWindow };
    }

    const response = await axios(config);
    return response.data;
  }

  _signRequest(data) {
    const crypto = require("crypto");
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(data)
      .digest("hex");
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(...args));
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.emit("disconnected");
  }

  async closePosition(symbol) {
    const positions = await this.getPositions();
    const position = positions.find((p) => p.symbol === symbol);

    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    const side = position.side === "Buy" ? "Sell" : "Buy";
    return this.placeOrder({
      symbol,
      side,
      type: "market",
      quantity: position.size,
      price: null,
    });
  }
}

export default BybitExchange;
