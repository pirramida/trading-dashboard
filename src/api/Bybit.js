const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');

class Bybit {
    constructor(apiKey, apiSecret) {
        this.name = 'Bybit';
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.restUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
        this.publicSocket = null;
        this.connected = false;
        this.subscriptions = new Set();
        this.sockets = {}; // callbacks per topic: { [topic]: [callback, ...] }
        console.log('[Bybit] Initialized instance');
    }

    async connect() {
        if (this.connected) {
            console.log('[Bybit] Already connected, skipping connect');
            return;
        }
        
        console.log('[Bybit] Connecting to WebSocket:', this.wsUrl);
        this.publicSocket = new WebSocket(this.wsUrl);

        this.publicSocket.on('open', () => {
            this.connected = true;
            console.log('[Bybit] WebSocket connection opened');
        });

        this.publicSocket.on('message', (data) => {
            console.log('[Bybit] WebSocket message received');
            this.handleMessage(data);
        });

        this.publicSocket.on('close', (code, reason) => {
            this.connected = false;
            console.log(`[Bybit] WebSocket closed. Code: ${code}, Reason: ${reason}`);
        });

        this.publicSocket.on('error', (error) => {
            console.error('[Bybit] WebSocket error:', error);
        });

        return new Promise(resolve => {
            this.publicSocket.once('open', () => {
                console.log('[Bybit] WebSocket "open" event resolved promise');
                resolve();
            });
        });
    }

    async disconnect() {
        if (this.publicSocket) {
            console.log('[Bybit] Closing WebSocket connection');
            this.publicSocket.close();
        }
        this.connected = false;
        console.log('[Bybit] Disconnected');
    }

    handleMessage(data) {
        let msg;
        try {
            msg = JSON.parse(data);
            console.log('[Bybit] Parsed WebSocket message:', msg);
        } catch (e) {
            console.warn('[Bybit] Invalid JSON message:', data);
            return;
        }

        if (msg.topic && msg.data) {
            const topic = msg.topic;
            console.log(`[Bybit] Message for topic "${topic}" received, dispatching to ${this.sockets[topic]?.length || 0} callbacks`);
            if (this.sockets[topic]) {
                this.sockets[topic].forEach(cb => {
                    try {
                        cb(msg.data);
                    } catch (err) {
                        console.error(`[Bybit] Callback error for topic "${topic}":`, err);
                    }
                });
            }
        } else if (msg.error) {
            console.error('[Bybit] WebSocket error message:', msg.error);
        } else if (msg.success !== undefined) {
            console.log('[Bybit] WebSocket subscription response:', msg);
        } else {
            console.log('[Bybit] WebSocket unknown message:', msg);
        }
    }

    subscribeTopic(topic, callback) {
        console.log(`[Bybit] subscribeTopic called for topic: ${topic}`);
        if (!this.sockets[topic]) {
            this.sockets[topic] = [];
            console.log(`[Bybit] Created new callback array for topic: ${topic}`);
        }
        this.sockets[topic].push(callback);
        console.log(`[Bybit] Added callback for topic "${topic}". Total callbacks: ${this.sockets[topic].length}`);

        if (this.subscriptions.has(topic)) {
            console.log(`[Bybit] Already subscribed to topic "${topic}", skipping subscription request`);
            return;
        }

        if (this.publicSocket.readyState === WebSocket.OPEN) {
            const msg = { op: 'subscribe', args: [topic] };
            this.publicSocket.send(JSON.stringify(msg));
            this.subscriptions.add(topic);
            console.log(`[Bybit] Sent subscribe message for topic "${topic}"`);
        } else {
            console.warn(`[Bybit] WebSocket not open. Cannot subscribe to "${topic}" yet.`);
            // Можно добавить очередь подписок на будущее
        }
    }

    unsubscribeTopic(topic) {
        console.log(`[Bybit] unsubscribeTopic called for topic: ${topic}`);
        if (!this.subscriptions.has(topic)) {
            console.log(`[Bybit] Not subscribed to topic "${topic}", skipping unsubscribe`);
            return;
        }
        const msg = { op: 'unsubscribe', args: [topic] };
        this.publicSocket.send(JSON.stringify(msg));
        this.subscriptions.delete(topic);
        delete this.sockets[topic];
        console.log(`[Bybit] Sent unsubscribe message and cleared callbacks for topic "${topic}"`);
    }

    subscribeTrades(symbol, callback) {
        console.log(`[Bybit] subscribeTrades called for symbol: ${symbol}`);
        const topic = `trade.${symbol}`;
        this.subscribeTopic(topic, callback);
    }

    unsubscribeTrades(symbol) {
        console.log(`[Bybit] unsubscribeTrades called for symbol: ${symbol}`);
        const topic = `trade.${symbol}`;
        this.unsubscribeTopic(topic);
    }

    subscribeOrderBook(symbol, callback) {
        console.log(`[Bybit] subscribeOrderBook called for symbol: ${symbol}`);
        const topic = `orderBookL2_25.${symbol}`;
        this.subscribeTopic(topic, callback);
    }

    unsubscribeOrderBook(symbol) {
        console.log(`[Bybit] unsubscribeOrderBook called for symbol: ${symbol}`);
        const topic = `orderBookL2_25.${symbol}`;
        this.unsubscribeTopic(topic);
    }

    subscribeCandles(symbol, interval, callback) {
        console.log(`[Bybit] subscribeCandles called for symbol: ${symbol}, interval: ${interval}`);
        const topic = `kline.${interval}.${symbol}`;
        this.subscribeTopic(topic, callback);
    }

    unsubscribeCandles(symbol, interval) {
        console.log(`[Bybit] unsubscribeCandles called for symbol: ${symbol}, interval: ${interval}`);
        const topic = `kline.${interval}.${symbol}`;
        this.unsubscribeTopic(topic);
    }

    async getAccountInfo() {
        console.log('[Bybit] getAccountInfo called');
        const timestamp = Date.now();
        const signPayload = `api_key=${this.apiKey}&timestamp=${timestamp}`;
        const sign = crypto.createHmac('sha256', this.apiSecret).update(signPayload).digest('hex');

        const response = await axios.get(`${this.restUrl}/v2/private/wallet/balance`, {
            params: {
                api_key: this.apiKey,
                timestamp,
                sign,
            }
        });
        console.log('[Bybit] getAccountInfo response received');
        return response.data.result;
    }

    async getOpenOrders(symbol) {
        console.log(`[Bybit] getOpenOrders called for symbol: ${symbol}`);
        const timestamp = Date.now();
        const signPayload = `api_key=${this.apiKey}&symbol=${symbol}&timestamp=${timestamp}`;
        const sign = crypto.createHmac('sha256', this.apiSecret).update(signPayload).digest('hex');

        const response = await axios.get(`${this.restUrl}/v2/private/order/list`, {
            params: {
                api_key: this.apiKey,
                symbol,
                timestamp,
                sign,
            }
        });
        console.log(`[Bybit] getOpenOrders response received for symbol: ${symbol}`);
        return response.data.result;
    }

    async getHistoricalCandles(symbol, interval, limit = 200) {
        console.log(`[Bybit] getHistoricalCandles called for symbol: ${symbol}, interval: ${interval}, limit: ${limit}`);
        const response = await axios.get(`${this.restUrl}/v2/public/kline/list`, {
            params: { symbol, interval, limit }
        });
        console.log(`[Bybit] getHistoricalCandles response received for symbol: ${symbol}, interval: ${interval}`);
        return response.data.result.map(candle => ({
            time: candle.open_time,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
        }));
    }
}

module.exports = Bybit;
