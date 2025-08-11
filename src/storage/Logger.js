const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }
  }

  getLogFilePath(date = new Date()) {
    const dateString = format(date, 'yyyy-MM-dd');
    return path.join(this.logsDir, `strategy_${dateString}.log`);
  }

  async logStrategyEvent(strategy, event) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${strategy}] ${JSON.stringify(event)}\n`;
    
    const logFile = this.getLogFilePath();
    await fs.promises.appendFile(logFile, logEntry);
  }

  async getStrategyLogs(date = new Date()) {
    const logFile = this.getLogFilePath(date);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const logContent = await fs.promises.readFile(logFile, 'utf8');
    return logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const [timestamp, strategy, ...rest] = line.split('] [');
          return {
            timestamp: timestamp.slice(1),
            strategy: strategy,
            message: rest.join('] [').slice(0, -1)
          };
        } catch (e) {
          return { raw: line };
        }
      });
  }
}

module.exports = Logger;