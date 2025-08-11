const moment = require('moment');

// Форматирование чисел
function formatPrice(price, precision = 2) {
  return parseFloat(price).toFixed(precision);
}

function formatAmount(amount, precision = 4) {
  return parseFloat(amount).toFixed(precision);
}

// Форматирование времени
function formatTime(timestamp, format = 'HH:mm:ss') {
  return moment(timestamp).format(format);
}

function formatDate(timestamp, format = 'YYYY-MM-DD') {
  return moment(timestamp).format(format);
}

// Работа с цветами
function getColorByValue(value, positiveColor = '#26a69a', negativeColor = '#ef5350') {
  return value >= 0 ? positiveColor : negativeColor;
}

function rgbaFromHex(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Расчеты
function calculateProfit(entryPrice, exitPrice, amount, isInverse = false) {
  if (isInverse) {
    return (1 / entryPrice - 1 / exitPrice) * amount;
  }
  return (exitPrice - entryPrice) * amount;
}

function calculatePercentageChange(oldValue, newValue) {
  return ((newValue - oldValue) / oldValue) * 100;
}

// Валидация
function isValidApiKey(key) {
  return key && key.length > 20;
}

function isValidSymbol(symbol) {
  return /^[A-Z0-9]{5,10}$/.test(symbol);
}

// Работа с массивами данных
function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

function sortBy(array, key, descending = false) {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return descending ? 1 : -1;
    if (a[key] > b[key]) return descending ? -1 : 1;
    return 0;
  });
}

// Генерация уникальных ID
function generateId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
}

module.exports = {
  formatPrice,
  formatAmount,
  formatTime,
  formatDate,
  getColorByValue,
  rgbaFromHex,
  calculateProfit,
  calculatePercentageChange,
  isValidApiKey,
  isValidSymbol,
  groupBy,
  sortBy,
  generateId
};