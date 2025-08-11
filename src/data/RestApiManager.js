class RestApiManager {
  constructor() {
    this.cache = {};
    this.requestQueue = new Map();
    this.rateLimits = {};
  }

  async request(exchange, endpoint, params = {}) {
    const cacheKey = this.getCacheKey(exchange, endpoint, params);
    
    // Проверка кэша
    if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 30000) {
      return this.cache[cacheKey].data;
    }

    // Проверка ограничения скорости
    if (this.isRateLimited(exchange)) {
      return this.queueRequest(exchange, endpoint, params);
    }

    try {
      const exchangeApi = this.getExchangeApi(exchange);
      const response = await exchangeApi.restRequest(endpoint, params);
      
      // Кэширование ответа
      this.cache[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };
      
      return response;
    } catch (error) {
      console.error(`REST API Error (${exchange}):`, error);
      throw error;
    }
  }

  getExchangeApi(exchange) {
    // Здесь должна быть логика получения экземпляра API биржи
    throw new Error('Method not implemented');
  }

  getCacheKey(exchange, endpoint, params) {
    return `${exchange}:${endpoint}:${JSON.stringify(params)}`;
  }

  isRateLimited(exchange) {
    const now = Date.now();
    const limit = this.rateLimits[exchange] || { count: 0, time: 0 };
    
    if (now - limit.time > 60000) {
      return false;
    }
    
    return limit.count >= 60; // Лимит 60 запросов в минуту
  }

  queueRequest(exchange, endpoint, params) {
    return new Promise((resolve) => {
      const queueId = `${exchange}:${Date.now()}`;
      this.requestQueue.set(queueId, { exchange, endpoint, params, resolve });
      
      // Планирование повторного запроса
      setTimeout(() => {
        const request = this.requestQueue.get(queueId);
        if (request) {
          this.requestQueue.delete(queueId);
          this.request(request.exchange, request.endpoint, request.params)
            .then(request.resolve);
        }
      }, 61000 - (Date.now() - (this.rateLimits[exchange]?.time || 0)));
    });
  }

  updateRateLimit(exchange) {
    const now = Date.now();
    if (!this.rateLimits[exchange] || now - this.rateLimits[exchange].time > 60000) {
      this.rateLimits[exchange] = { count: 1, time: now };
    } else {
      this.rateLimits[exchange].count += 1;
    }
  }
}

module.exports = RestApiManager;