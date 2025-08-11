const path = require('path');
const fs = require('fs');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const rawData = fs.readFileSync(this.configPath);
        return JSON.parse(rawData);
      }
      return this.createDefaultConfig();
    } catch (error) {
      console.error('Error loading config:', error);
      return this.createDefaultConfig();
    }
  }

  createDefaultConfig() {
    return {
      version: '1.0.0',
      exchanges: {
        Bybit: {
          apiKey: '',
          apiSecret: '',
          enabled: false
        },
        Binance: {
          apiKey: '',
          apiSecret: '',
          enabled: false
        }
      },
      ui: {
        theme: 'dark',
        layout: 'default',
        chartConfig: {
          candleStyle: {
            upColor: '#26a69a',
            downColor: '#ef5350'
          },
          volumeStyle: {
            upColor: 'rgba(38, 166, 154, 0.3)',
            downColor: 'rgba(239, 83, 80, 0.3)'
          }
        }
      },
      strategies: {},
      windowLayouts: {}
    };
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  getExchangeConfig(exchange) {
    return this.config.exchanges[exchange] || null;
  }

  updateExchangeConfig(exchange, config) {
    if (!this.config.exchanges[exchange]) {
      this.config.exchanges[exchange] = {};
    }
    this.config.exchanges[exchange] = { ...this.config.exchanges[exchange], ...config };
    return this.saveConfig();
  }

  getUIConfig() {
    return this.config.ui || {};
  }

  updateUIConfig(uiConfig) {
    this.config.ui = { ...this.config.ui, ...uiConfig };
    return this.saveConfig();
  }

  getStrategyConfig(strategyName) {
    return this.config.strategies?.[strategyName] || {};
  }

  updateStrategyConfig(strategyName, config) {
    if (!this.config.strategies) {
      this.config.strategies = {};
    }
    this.config.strategies[strategyName] = { ...this.config.strategies[strategyName], ...config };
    return this.saveConfig();
  }

  getWindowLayout(layoutName) {
    return this.config.windowLayouts?.[layoutName] || null;
  }

  saveWindowLayout(layoutName, layout) {
    if (!this.config.windowLayouts) {
      this.config.windowLayouts = {};
    }
    this.config.windowLayouts[layoutName] = layout;
    return this.saveConfig();
  }
}

const configManager = new ConfigManager();
module.exports = configManager;