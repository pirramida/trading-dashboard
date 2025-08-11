const EventEmitter = require('events');
const { StorageManager } = require('../storage/StorageManager');
const { DataManager } = require('../data/DataManager');

class StrategyManager extends EventEmitter {
  constructor() {
    super();
    this.strategies = new Map();
    this.storage = new StorageManager();
    this.dataManager = new DataManager();
    this.activeSymbols = new Set();
  }

  registerStrategy(strategy) {
    if (this.strategies.has(strategy.name)) {
      throw new Error(`Strategy "${strategy.name}" already registered`);
    }

    this.strategies.set(strategy.name, strategy);
    this.setupStrategyListeners(strategy);
  }

  setupStrategyListeners(strategy) {
    strategy.on('signal', (signal) => {
      this.handleSignal(strategy.name, signal);
    });

    strategy.on('log', (message) => {
      this.storage.logger.logStrategyEvent(strategy.name, message);
      this.emit('strategyLog', { strategy: strategy.name, message });
    });

    strategy.on('error', (error) => {
      console.error(`Strategy "${strategy.name}" error:`, error);
      this.storage.logger.logStrategyEvent(strategy.name, { error: error.message });
      this.emit('strategyError', { strategy: strategy.name, error });
    });
  }

  async handleSignal(strategyName, signal) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) return;

    try {
      // Проверка сигнала перед исполнением
      const validation = await this.validateSignal(strategy, signal);
      if (!validation.valid) {
        strategy.emit('log', { 
          type: 'signalRejected',
          reason: validation.reason,
          signal 
        });
        return;
      }

      // Исполнение сигнала
      const execution = await this.executeSignal(strategy, signal);
      
      // Логирование результата
      strategy.emit('log', {
        type: 'signalExecuted',
        signal,
        execution
      });

      this.emit('signalExecuted', { strategy: strategyName, signal, execution });
    } catch (error) {
      strategy.emit('error', error);
    }
  }

  async validateSignal(strategy, signal) {
    // Проверка баланса
    if (signal.type === 'market' && signal.side === 'buy') {
      const balance = await this.dataManager.getBalance(strategy.exchange);
      const requiredFunds = signal.price * signal.quantity;
      
      if (balance.available < requiredFunds) {
        return { 
          valid: false, 
          reason: `Insufficient funds. Available: ${balance.available}, Required: ${requiredFunds}` 
        };
      }
    }

    // Дополнительные проверки могут быть добавлены здесь
    
    return { valid: true };
  }

  async executeSignal(strategy, signal) {
    const tradeData = {
      exchange: strategy.exchange,
      symbol: signal.symbol,
      strategy: strategy.name,
      side: signal.side,
      price: signal.price,
      quantity: signal.quantity,
      type: signal.type || 'market'
    };

    // Здесь должна быть логика исполнения ордера через API биржи
    // В демонстрационных целях просто сохраняем "ордер" в базу
    
    const result = await this.storage.logTrade(tradeData);
    return { ...tradeData, id: result.id, timestamp: new Date() };
  }

  activateStrategy(name, symbols = []) {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy "${name}" not found`);
    }

    // Подписка на данные для символов
    symbols.forEach(symbol => {
      this.activeSymbols.add(symbol);
      this.dataManager.subscribeCandles(
        strategy.exchange, 
        symbol, 
        strategy.timeframe,
        (data) => strategy.processData(symbol, data)
      );
    });

    strategy.activate();
    this.emit('strategyActivated', { strategy: name, symbols });
  }

  deactivateStrategy(name) {
    const strategy = this.strategies.get(name);
    if (!strategy) return;

    // Отписка от данных
    this.activeSymbols.forEach(symbol => {
      this.dataManager.unsubscribeCandles(strategy.exchange, symbol, strategy.timeframe);
    });

    strategy.deactivate();
    this.emit('strategyDeactivated', name);
  }

  getStrategyStatus(name) {
    const strategy = this.strategies.get(name);
    if (!strategy) return { active: false };

    return {
      active: strategy.active,
      symbols: Array.from(this.activeSymbols),
      stats: strategy.getStats()
    };
  }

  async loadStrategiesFromConfig() {
    const config = await this.storage.loadConfig();
    if (config.strategies) {
      for (const [name, strategyConfig] of Object.entries(config.strategies)) {
        if (strategyConfig.active) {
          this.activateStrategy(name, strategyConfig.symbols);
        }
      }
    }
  }
}

module.exports = StrategyManager;