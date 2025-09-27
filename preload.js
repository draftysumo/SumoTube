const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: (opts) => ipcRenderer.invoke('choose-folder', opts),
  rescanFolder: (folder) => ipcRenderer.invoke('rescan-folder', folder),
  selectThumbnail: () => ipcRenderer.invoke('select-thumbnail'),
  openFile: (p) => ipcRenderer.invoke('open-file', p),
  getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
  setLastFolder: (folder) => ipcRenderer.invoke('set-last-folder', folder)
});
