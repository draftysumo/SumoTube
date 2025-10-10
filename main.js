const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "SumoTube",
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try { Menu.setApplicationMenu(null); } catch (e) {}
  mainWindow.loadFile('index.html');
}

// dynamically import electron-store (ESM-only)
(async () => {
  const mod = await import('electron-store');
  const Store = mod.default;
  const store = new Store({
    name: 'sumotube-settings',
    defaults: { lastFolder: null }
  });

  // --- IPC handlers using store ---
  ipcMain.handle('get-last-folder', async () => store.get('lastFolder', null));

  ipcMain.handle('set-last-folder', async (_e, folder) => {
    store.set('lastFolder', folder);
    return true;
  });

  ipcMain.handle('choose-folder', async (_event, opts) => {
    const defaultPath = opts?.defaultPath;
    const { canceled, filePaths } = await dialog.showOpenDialog({ 
      properties: ['openDirectory'],
      defaultPath
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    const folder = filePaths[0];

    // scan folder
    const files = scanFolder(folder);

    // save last folder
    store.set('lastFolder', folder);

    return { canceled: false, folder, files };
  });

  ipcMain.handle('rescan-folder', async (_event, folder) => {
    if (!folder) return { canceled: true };
    try {
      const files = scanFolder(folder);
      return { canceled: false, folder, files };
    } catch (e) {
      return { canceled: true, error: e.message };
    }
  });

  ipcMain.handle('select-thumbnail', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg','png','jpeg','webp'] }]
    });
    if (canceled) return null;
    return filePaths[0];
  });

  ipcMain.handle('open-file', async (_event, filePath) => {
    try { return await shell.openPath(filePath); } 
    catch(e){ return e.message || String(e); }
  });

  // --- all helper functions like scanFolder go here ---
  function scanFolder(folder) {
    const exts = ['.mp4','.mkv','.webm','.mov','.avi','.flv','.ogg'];
    const files = [];
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (exts.includes(path.extname(e.name).toLowerCase())) {
          const sidecar = findSidecarImage(full);
          files.push({ path: full, name: e.name, parent: path.basename(path.dirname(full)), sidecar });
        }
      }
    }
    walk(folder);
    return files;
  }

  function findSidecarImage(videoPath) {
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath, path.extname(videoPath));
    const candidates = ['.jpg','.jpeg','.png','.webp'];
    for (const ext of candidates) {
      const p = path.join(dir, base + ext);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  // --- start app only after store & handlers ready ---
  app.whenReady().then(createWindow);
})();
