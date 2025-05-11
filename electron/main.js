const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { leerPDF } = require('./pdfReader');
const { guardarEnExcel } = require('./excelWriter');
const { PDFDocument } = require('pdf-lib');

let isDev;
let win;

(async () => {
  isDev = (await import('electron-is-dev')).default;

  function createWindow() {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      resizable: true,
      maximizable: true,
      frame: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    win.removeMenu();

    if (isDev) {
      win.loadURL('http://localhost:5173');
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    if (isDev) {
      //win.webContents.openDevTools();
    }
  }

  app.whenReady().then(() => {
    createWindow();

    // Ejecutar Java
    ipcMain.handle('ejecutar-java', async (event, parametrosJava) => {
      try {
        const resultadoJava = await ejecutarJavaExe(parametrosJava);
        console.log('Resultado Java:', resultadoJava);
        return resultadoJava;
      } catch (error) {
        console.error('Error al ejecutar Java:', error);
        return `Error al ejecutar Java: ${error.message}`;
      }
    });

    // Leer PDFs desde una carpeta seleccionada
    ipcMain.handle('seleccionar-y-leer-pdfs', async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { error: 'No se seleccionó ninguna carpeta' };
        }

        const carpeta = result.filePaths[0];
        const archivosPDF = fs.readdirSync(carpeta)
          .filter(nombre => nombre.toLowerCase().endsWith('.pdf'))
          .map(nombre => ({ pathPDF: path.join(carpeta, nombre) }));

        const resultados = await leerPDF(archivosPDF);
        const archivoExcel = guardarEnExcel(resultados, archivosPDF);

        return { resultados, archivoExcel };
      } catch (error) {
        return { error: error.message };
      }
    });

    app.once('ready-to-show', () => {
      win.setMenuBarVisibility(false);
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  });
})();
