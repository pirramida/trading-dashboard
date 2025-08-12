const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const Bybit = require("../src/api/Bybit");
const DataManager = require("../src/data/DataManager");
const Logger = require("../src/storage/Logger");
const Database = require("../src/storage/Database");
const WebSocket = require("ws");
const net = require("net");
const crypto = require("crypto");

let db;
const exchanges = {};
const dataManager = new DataManager();
const logger = new Logger();
const database = new Database();
const subscriptions = {
  trades: new Map(),
  orderbook: new Map(),
  candles: new Map(),
};
const connections = new Map();

function getSubKey(exchange, symbol, interval = "") {
  const key = interval
    ? `${exchange}_${symbol}_${interval}`
    : `${exchange}_${symbol}`;
  return key;
}

function initializeIpcHandlers(ipcMain) {
  ipcMain.handle("init-database", async () => {
    try {
      db = await database.init();
      return { status: "success" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("read-file", async (_, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath, "utf8");
      return data;
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("write-file", async (_, filePath, data) => {
    try {
      await fs.promises.writeFile(filePath, data, "utf8");
      return { status: "success" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("get-config", async () => {
    try {
      const configPath = path.join(__dirname, "../config.json");
      if (fs.existsSync(configPath)) {
        const data = await fs.promises.readFile(configPath, "utf8");
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error("[IPC] get-config error:", error);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("save-config", async (_, config) => {
    try {
      const configPath = path.join(__dirname, "../config.json");
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      return { status: "success" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle(
    "get-exchange-data",
    async (_, exchangeName, symbol, dataType) => {
      try {
        if (!exchanges[exchangeName]) {
          throw new Error(`Exchange ${exchangeName} not connected`);
        }
        const exchange = exchanges[exchangeName];

        switch (dataType) {
          case "account":
            return await exchange.getAccountInfo();

          case "orders":
            return await exchange.getOpenOrders(symbol);

          case "historical-candles":
          case `historical-${dataType.split("-")[1]}`: {
            const interval = dataType.split("-")[1];
            return await exchange.getHistoricalCandles(symbol, interval);
          }

          case "orderbook":
            return new Promise((resolve) => {
              exchange.subscribeOrderBook(symbol, (data) => {
                resolve(data);
              });
            });

          case "trades":
            return new Promise((resolve) => {
              exchange.subscribeTrades(symbol, (data) => {
                resolve(data);
              });
            });

          case "candles":
          case `realtime-${dataType.split("-")[1]}`: {
            const candleInterval = dataType.split("-")[1];
            return new Promise((resolve) => {
              exchange.subscribeCandles(symbol, candleInterval, (data) => {
                resolve(data);
              });
            });
          }

          default:
            throw new Error(`Unsupported data type: ${dataType}`);
        }
      } catch (error) {
        return { status: "error", message: error.message };
      }
    }
  );

  ipcMain.handle(
    "connect-exchange",
    async (_, exchangeName, apiKey, apiSecret) => {
      try {
        let exchange;
        switch (exchangeName.toLowerCase()) {
          case "bybit":
            exchange = new Bybit(apiKey, apiSecret);
            break;
          default:
            throw new Error("Unsupported exchange");
        }
        await exchange.connect();
        exchanges[exchangeName] = exchange;
        dataManager.addExchange(exchangeName, exchange);
        return { status: "connected", exchange: exchangeName };
      } catch (error) {
        console.error("[IPC] connect-exchange error:", error);
        return { status: "error", message: error.message };
      }
    }
  );

  ipcMain.handle("disconnect-exchange", async (_, exchangeName) => {
    try {
      if (exchanges[exchangeName]) {
        await exchanges[exchangeName].disconnect();
        delete exchanges[exchangeName];
        dataManager.removeExchange(exchangeName);
        return { status: "disconnected", exchange: exchangeName };
      } else {
        console.warn(
          `[IPC] Exchange ${exchangeName} not found during disconnect`
        );
        return { status: "error", message: "Exchange not found" };
      }
    } catch (error) {
      console.error("[IPC] disconnect-exchange error:", error);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("log-strategy-event", async (_, strategy, event) => {
    try {
      await logger.logStrategyEvent(strategy, event);
      return { status: "logged" };
    } catch (error) {
      console.error("[IPC] log-strategy-event error:", error);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.handle("get-strategy-logs", async (_, date) => {
    try {
      const logs = await logger.getStrategyLogs(date);
      return logs;
    } catch (error) {
      console.error("[IPC] get-strategy-logs error:", error);
      return { status: "error", message: error.message };
    }
  });

  ipcMain.on("subscribe-trades", (event, { exchange, symbol }) => {
    try {
      const key = getSubKey(exchange, symbol);
      if (!subscriptions.trades.has(key)) {
        if (!exchanges[exchange]) {
          console.warn(`[IPC] Exchange ${exchange} not connected`);
          event.reply("error", `Exchange ${exchange} not connected`);
          return;
        }
        subscriptions.trades.set(key, new Set());
        exchanges[exchange].subscribeTrades(symbol, (data) => {
          const clients = subscriptions.trades.get(key);
          if (clients) {
            clients.forEach((webContents) => {
              try {
                webContents.send("trades-update", { exchange, symbol, data });
              } catch (sendError) {
                console.error("[IPC] Error sending trades-update:", sendError);
              }
            });
          }
        });
      }
      subscriptions.trades.get(key).add(event.sender);
    } catch (error) {
      console.error("[IPC] subscribe-trades error:", error);
      event.reply("error", error.message || "Unknown subscribe-trades error");
    }
  });

  ipcMain.on("unsubscribe-trades", (event, { exchange, symbol }) => {
    try {
      const key = getSubKey(exchange, symbol);
      if (subscriptions.trades.has(key)) {
        const clients = subscriptions.trades.get(key);
        clients.delete(event.sender);
        if (clients.size === 0) {
          if (
            exchanges[exchange] &&
            typeof exchanges[exchange].unsubscribeTrades === "function"
          ) {
            exchanges[exchange].unsubscribeTrades(symbol);
          }
          subscriptions.trades.delete(key);
        }
      }
    } catch (error) {
      console.error("[IPC] unsubscribe-trades error:", error);
    }
  });

  ipcMain.on("subscribe-orderbook", (event, { exchange, symbol }) => {
    try {
      const key = getSubKey(exchange, symbol);
      if (!subscriptions.orderbook.has(key)) {
        subscriptions.orderbook.set(key, new Set());
        if (!exchanges[exchange]) {
          console.warn(
            `[IPC] Exchange ${exchange} not connected, cannot subscribe`
          );
          event.reply("error", `Exchange ${exchange} not connected`);
          return;
        }
        console.log(`[IPC] Creating new orderbook subscription for key ${key}`);
        exchanges[exchange].subscribeOrderBook(symbol, (data) => {
          console.log(
            `[IPC] Orderbook data received for ${exchange} ${symbol}`,
            data
          );
          const clients = subscriptions.orderbook.get(key);
          if (clients) {
            clients.forEach((webContents) => {
              try {
                webContents.send("orderbook-update", {
                  exchange,
                  symbol,
                  data,
                });
              } catch (sendError) {
                console.error(
                  "[IPC] Error sending orderbook-update:",
                  sendError
                );
              }
            });
          }
        });
      }
      subscriptions.orderbook.get(key).add(event.sender);
      console.log(
        `[IPC] Added subscriber for orderbook key ${key}, total subscribers: ${
          subscriptions.orderbook.get(key).size
        }`
      );
    } catch (error) {
      console.error("[IPC] subscribe-orderbook error:", error);
      event.reply(
        "error",
        error.message || "Unknown subscribe-orderbook error"
      );
    }
  });

  ipcMain.on("unsubscribe-orderbook", (event, { exchange, symbol }) => {
    console.log(
      `[IPC] unsubscribe-orderbook called with exchange=${exchange}, symbol=${symbol}`
    );
    try {
      const key = getSubKey(exchange, symbol);
      if (subscriptions.orderbook.has(key)) {
        const clients = subscriptions.orderbook.get(key);
        clients.delete(event.sender);
        if (clients.size === 0) {
          if (
            exchanges[exchange] &&
            typeof exchanges[exchange].unsubscribeOrderBook === "function"
          ) {
            console.log(`[IPC] Removing orderbook subscription for key ${key}`);
            exchanges[exchange].unsubscribeOrderBook(symbol);
          }
          subscriptions.orderbook.delete(key);
        }
        console.log(
          `[IPC] Subscriber removed from orderbook for key ${key}, remaining subscribers: ${clients.size}`
        );
      }
    } catch (error) {
      console.error("[IPC] unsubscribe-orderbook error:", error);
    }
  });

  ipcMain.on("subscribe-candles", (event, { exchange, symbol, interval }) => {
    console.log(
      `[IPC] subscribe-candles called with exchange=${exchange}, symbol=${symbol}, interval=${interval}`
    );
    try {
      const key = getSubKey(exchange, symbol, interval);
      if (!subscriptions.candles.has(key)) {
        subscriptions.candles.set(key, new Set());
        if (!exchanges[exchange]) {
          console.warn(`[IPC] Exchange ${exchange} not connected`);
          event.reply("error", `Exchange ${exchange} not connected`);
          return;
        }
        console.log(`[IPC] Creating new candles subscription for key ${key}`);
        exchanges[exchange].subscribeCandles(symbol, interval, (data) => {
          const clients = subscriptions.candles.get(key);
          if (clients) {
            clients.forEach((webContents) => {
              try {
                webContents.send("candles-update", {
                  exchange,
                  symbol,
                  interval,
                  data,
                });
              } catch (sendError) {
                console.error("[IPC] Error sending candles-update:", sendError);
              }
            });
          }
        });
      }
      subscriptions.candles.get(key).add(event.sender);
      console.log(
        `[IPC] Added subscriber for candles key ${key}, total subscribers: ${
          subscriptions.candles.get(key).size
        }`
      );
    } catch (error) {
      console.error("[IPC] subscribe-candles error:", error);
      event.reply("error", error.message || "Unknown subscribe-candles error");
    }
  });
  const connections = new Map();

  const wsServers = new Map();

  ipcMain.handle("startStrategySocket", async (event, strategyName) => {
    const port = await findAvailablePort(9501, 9600);
    const token = generateToken();

    const wss = new WebSocket.Server({ port });
    wsServers.set(strategyName, wss);

    wss.on("connection", (ws) => {
      ws.on("message", (message) => {
        // Обработка входящих сообщений от клиента
        const data = JSON.parse(message);
        event.sender.send("strategy-message", {
          strategyName,
          port,
          data,
        });
      });
    });

    return { port, token };
  });

  ipcMain.handle("scan-strategy-sockets", async () => {
    const PORT_START = 9501;
    const PORT_MAX = 9600;
    const foundStrategies = [];

    console.log(
      `[scan] Начинаем сканирование портов ${PORT_START}-${PORT_MAX}`
    );

    for (let port = PORT_START; port <= PORT_MAX; port++) {
      try {
        console.log(`[scan] Проверяю порт ${port}...`);
        const isOpen = await new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(500);
          socket.once("connect", () => {
            console.log(`[scan] Порт ${port} ОТКРЫТ — найден кандидат`);
            socket.destroy();
            resolve(true);
          });
          socket.once("timeout", () => {
            console.log(`[scan] Порт ${port} — таймаут (закрыт)`);
            socket.destroy();
            resolve(false);
          });
          socket.once("error", () => {
            console.log(`[scan] Порт ${port} — ошибка подключения (закрыт)`);
            resolve(false);
          });
          socket.connect(port, "127.0.0.1");
        });

        if (isOpen) {
          foundStrategies.push({
            name: `Strategy_${port}`,
            port,
            token: "unknown",
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[scan] Ошибка при проверке порта ${port}:`, err);
      }
    }

    console.log(
      `[scan] Сканирование завершено. Найдено стратегий: ${foundStrategies.length}`
    );
    return foundStrategies;
  });

  ipcMain.handle('connect-to-strategy', async (event, { port, token }) => {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}?token=${token}`);
    
    ws.on('open', () => {
      connections.set(port, ws);
      resolve({ connected: true, port });
    });
    
    ws.on('error', (err) => {
      resolve({ connected: false, error: err.message });
    });
  });
});

  // Отправка сообщения обратно в стратегию
  ipcMain.handle("send-to-strategy", async (_, { port, message }) => {
    const ws = connections.get(port);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return { sent: true };
    }
    return { sent: false, error: "No active connection" };
  });

  ipcMain.on("unsubscribe-candles", (event, { exchange, symbol, interval }) => {
    console.log(
      `[IPC] unsubscribe-candles called with exchange=${exchange}, symbol=${symbol}, interval=${interval}`
    );
    try {
      const key = getSubKey(exchange, symbol, interval);
      if (subscriptions.candles.has(key)) {
        const clients = subscriptions.candles.get(key);
        clients.delete(event.sender);
        if (clients.size === 0) {
          if (
            exchanges[exchange] &&
            typeof exchanges[exchange].unsubscribeCandles === "function"
          ) {
            console.log(`[IPC] Removing candles subscription for key ${key}`);
            exchanges[exchange].unsubscribeCandles(symbol, interval);
          }
          subscriptions.candles.delete(key);
        }
        console.log(
          `[IPC] Subscriber removed from candles for key ${key}, remaining subscribers: ${clients.size}`
        );
      }
    } catch (error) {
      console.error("[IPC] unsubscribe-candles error:", error);
    }
  });
}

module.exports = initializeIpcHandlers;
