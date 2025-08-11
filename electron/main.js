const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeDatabase } = require('./ipcHandlers');
const axios = require('axios');

let mainWindow;

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: true,
      },
    });

    const isDev = !app.isPackaged;
    const startURL = isDev
      ? 'http://localhost:3230' // URL React дев-сервера
      : `file://${path.join(__dirname, '../build/index.html')}`; // билд React

    mainWindow.loadURL(startURL);

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    console.error('Error creating window:', err);
  }
}

app.whenReady()
  .then(() => {
    try {
      createWindow();

      app.on('activate', () => {
        try {
          if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
          }
        } catch (err) {
          console.error('Error on app activate:', err);
        }
      });
    } catch (err) {
      console.error('Error during app ready:', err);
    }
  })
  .catch((err) => {
    console.error('Error initializing app:', err);
  });

app.on('window-all-closed', () => {
  try {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  } catch (err) {
    console.error('Error on window-all-closed:', err);
  }
});

// IPC handlers
try {
  require('./ipcHandlers')(ipcMain);
} catch (err) {
  console.error('Error loading IPC handlers:', err);
}

async function fetchBybitSymbols() {
  try {
    const response = await axios.get('https://api.bybit.com/spot/v1/symbols');
    if (response.data && response.data.result) {
      return response.data.result.map(symbol => symbol.name);
    }
    return [];
  } catch (err) {
    console.error('Error fetching symbols from Bybit:', err);
    return [];
  }
}

// IPC handler
ipcMain.handle('get-bybit-symbols', async () => {
  try {
    const symbols = await fetchBybitSymbols();
    console.log('Bybit symbols fetched:', symbols.length);
    return symbols;
  } catch (err) {
    console.error('Error in get-bybit-symbols handler:', err);
    return [];
  }
});
