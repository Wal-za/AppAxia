const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ejecutarJavaExe: (parametrosJava) => ipcRenderer.invoke('ejecutar-java', parametrosJava),
  leerPDF: (rutaPDF) => ipcRenderer.invoke('leer-pdf', rutaPDF),
  seleccionarYLeerPDFs: () => ipcRenderer.invoke('seleccionar-y-leer-pdfs'), 
});
