const WebSocket = require("ws");
const crypto = require("crypto");
const fetch = require("node-fetch");
const RestApiManager = require("../data/RestApiManager.js");

class Bybit {
  constructor(apiKey, apiSecret) {
    this.name = "Bybit";
    this.apiKey = apiKey || "";
    this.apiSecret = apiSecret || "";
    this.restUrl = "https://api.bybit.com";
    this.wsUrl = "wss://stream.bybit.com/v5/public/spot";
    this.publicSocket = null;
    this.connected = false;
    this.subscriptions = new Set();
    this.sockets = {};
    this.apiManager = new RestApiManager();

    // Переопределяем метод getExchangeApi для RestApiManager
    this.apiManager.getExchangeApi = () => this;

    console.log("[Bybit] Initialized instance");
  }

  async connect() {
    if (this.connected) {
      console.log("[Bybit] Already connected, skipping connect");
      return;
    }

    console.log("[Bybit] Connecting to WebSocket:", this.wsUrl);
    this.publicSocket = new WebSocket(this.wsUrl);

    this.publicSocket.on("open", () => {
      this.connected = true;
      console.log("[Bybit] WebSocket connection opened");
    });

    this.publicSocket.on("message", (data) => {
      this.handleMessage(data);
    });

    this.publicSocket.on("close", (code, reason) => {
      this.connected = false;
      console.log(`[Bybit] WebSocket closed. Code: ${code}, Reason: ${reason}`);
    });

    this.publicSocket.on("error", (error) => {
      console.error("[Bybit] WebSocket error:", error);
    });

    return new Promise((resolve) => {
      this.publicSocket.once("open", () => {
        console.log('[Bybit] WebSocket "open" event resolved promise');
        resolve();
      });
    });
  }

  async disconnect() {
    if (this.publicSocket) {
      console.log("[Bybit] Closing WebSocket connection");
      this.publicSocket.close();
    }
    this.connected = false;
    console.log("[Bybit] Disconnected");
  }

  handleMessage(data) {
    let msg;
    try {
      msg = JSON.parse(data);
      console.log("[Bybit] Parsed WebSocket message:", msg);
    } catch (e) {
      console.warn("[Bybit] Invalid JSON message:", data);
      return;
    }

    if (msg.topic && msg.data) {
      const topic = msg.topic;
      console.log(
        `[Bybit] Message for topic "${topic}" received, dispatching to ${
          this.sockets[topic]?.length || 0
        } callbacks`
      );

      if (this.sockets[topic]) {
        this.sockets[topic].forEach((cb) => {
          try {
            cb(msg.data);
          } catch (err) {
            console.error(`[Bybit] Callback error for topic "${topic}":`, err);
          }
        });
      }
    } else if (msg.error) {
      console.error("[Bybit] WebSocket error message:", msg.error);
    } else if (msg.success !== undefined) {
      console.log("[Bybit] WebSocket subscription response:", msg);
    } else {
      console.log("[Bybit] WebSocket unknown message:", msg);
    }
  }

  subscribeTopic(topic, callback) {
    console.log(`[Bybit] subscribeTopic called for topic: ${topic}`);

    if (!this.sockets[topic]) {
      this.sockets[topic] = [];
      console.log(`[Bybit] Created new callback array for topic: ${topic}`);
    }

    this.sockets[topic].push(callback);
    console.log(
      `[Bybit] Added callback for topic "${topic}". Total callbacks: ${this.sockets[topic].length}`
    );

    if (this.subscriptions.has(topic)) {
      console.log(
        `[Bybit] Already subscribed to topic "${topic}", skipping subscription request`
      );
      return;
    }

    if (this.publicSocket.readyState === WebSocket.OPEN) {
      const msg = {
        op: "subscribe",
        args: [topic],
      };
      this.publicSocket.send(JSON.stringify(msg));
      this.subscriptions.add(topic);
      console.log(`[Bybit] Sent subscribe message for topic "${topic}"`);
    } else {
      console.warn(
        `[Bybit] WebSocket not open. Cannot subscribe to "${topic}" yet.`
      );
    }
  }

  unsubscribeTopic(topic) {
    console.log(`[Bybit] unsubscribeTopic called for topic: ${topic}`);

    if (!this.subscriptions.has(topic)) {
      console.log(
        `[Bybit] Not subscribed to topic "${topic}", skipping unsubscribe`
      );
      return;
    }

    const msg = {
      op: "unsubscribe",
      args: [topic],
    };
    this.publicSocket.send(JSON.stringify(msg));
    this.subscriptions.delete(topic);
    delete this.sockets[topic];
    console.log(
      `[Bybit] Sent unsubscribe message and cleared callbacks for topic "${topic}"`
    );
  }

  async restRequest(endpoint, params = {}) {
    const timestamp = Date.now();
    let queryString = "";
    let signPayload = "";
    let sign = "";

    // Для приватных endpoints добавляем подпись
    if (endpoint.startsWith("/v5/") && this.apiKey && this.apiSecret) {
      // Сортируем параметры по алфавиту
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key];
          return acc;
        }, {});

      // Формируем строку для подписи
      signPayload = `${timestamp}${this.apiKey}5000`;
      if (Object.keys(sortedParams).length > 0) {
        signPayload += `${new URLSearchParams(sortedParams).toString()}`;
      }

      // Создаем подпись
      sign = crypto
        .createHmac("sha256", this.apiSecret)
        .update(signPayload)
        .digest("hex");

      if (Object.keys(params).length > 0) {
        queryString = `?${new URLSearchParams(params).toString()}`;
      }
    } else {
      // Для публичных endpoints просто добавляем параметры
      if (Object.keys(params).length > 0) {
        queryString = `?${new URLSearchParams(params).toString()}`;
      }
    }

    const url = `${this.restUrl}${endpoint}${queryString}`;
    console.log(`[Bybit] REST request to: ${url}`);

    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Добавляем заголовки для приватных запросов
      if (endpoint.startsWith("/v5/") && this.apiKey && this.apiSecret) {
        headers["X-BAPI-API-KEY"] = this.apiKey;
        headers["X-BAPI-TIMESTAMP"] = timestamp.toString();
        headers["X-BAPI-SIGN"] = sign;
        headers["X-BAPI-RECV-WINDOW"] = "5000";
      }

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "[Bybit] REST request failed with status:",
          response.status,
          "Error:",
          errorData
        );
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.ret_msg || errorData.message
          }`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("[Bybit] REST request failed:", error);
      throw error;
    }
  }

  // Public API methods
  subscribeTrades(symbol, callback) {
    console.log(`[Bybit] subscribeTrades called for symbol: ${symbol}`);
    const topic = `publicTrade.${symbol}`;
    this.subscribeTopic(topic, callback);
  }

  unsubscribeTrades(symbol) {
    console.log(`[Bybit] unsubscribeTrades called for symbol: ${symbol}`);
    const topic = `publicTrade.${symbol}`;
    this.unsubscribeTopic(topic);
  }

  subscribeOrderBook(symbol, callback) {
    console.log(`[Bybit] subscribeOrderBook called for symbol: ${symbol}`);
    const topic = `orderbook.200.${symbol}`;
    this.subscribeTopic(topic, callback);
  }

  unsubscribeOrderBook(symbol) {
    console.log(`[Bybit] unsubscribeOrderBook called for symbol: ${symbol}`);
    const topic = `orderbook.200.${symbol}`;
    this.unsubscribeTopic(topic);
  }

  subscribeCandles(symbol, interval, callback) {
    console.log(
      `[Bybit] subscribeCandles called for symbol: ${symbol}, interval: ${interval}`
    );
    const topic = `kline.${interval}.${symbol}`;
    this.subscribeTopic(topic, callback);
  }

  unsubscribeCandles(symbol, interval) {
    console.log(
      `[Bybit] unsubscribeCandles called for symbol: ${symbol}, interval: ${interval}`
    );
    const topic = `kline.${interval}.${symbol}`;
    this.unsubscribeTopic(topic);
  }

  // Account methods
  async getAccountInfo() {
    console.log("[Bybit] getAccountInfo called");
    try {
      const response = await this.apiManager.request(
        "bybit",
        "/v5/account/wallet-balance",
        {
          accountType: "UNIFIED",
        }
      );

      console.log("[Bybit] getAccountInfo response received");

      // Проверяем структуру ответа
      if (!response.result) {
        throw new Error("Invalid response structure from Bybit API");
      }

      return response.result;
    } catch (error) {
      console.error("[Bybit] getAccountInfo error:", error);
      throw error;
    }
  }

  async getOpenOrders(symbol) {
    console.log(`[Bybit] getOpenOrders called for symbol: ${symbol}`);
    try {
      const response = await this.apiManager.request(
        "bybit",
        "/v5/order/realtime",
        {
          symbol,
          limit: 50,
        }
      );

      console.log(
        `[Bybit] getOpenOrders response received for symbol: ${symbol}`
      );
      return response.result.list;
    } catch (error) {
      console.error(`[Bybit] getOpenOrders error for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalCandles(symbol, interval, limit = 200) {
    console.log(
      `[Bybit] getHistoricalCandles called for symbol: ${symbol}, interval: ${interval}, limit: ${limit}`
    );
    try {
      const response = await this.apiManager.request(
        "bybit",
        "/v5/market/kline",
        {
          category: "spot",
          symbol,
          interval,
          limit,
        }
      );

      console.log(
        `[Bybit] getHistoricalCandles response received for symbol: ${symbol}, interval: ${interval}`
      );
      return response.result.list.map((candle) => ({
        time: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error) {
      console.error(`[Bybit] getHistoricalCandles error for ${symbol}:`, error);
      throw error;
    }
  }
}

module.exports = Bybit;
