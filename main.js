const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');


let mainWindow;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
console.log('[SumoTube][main.js] settingsPath:', settingsPath);

function loadSettings() {
  try {
    const data = fs.readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(data);
    console.log('[SumoTube][main.js] Loaded settings:', parsed);
    return parsed;
  } catch (e) {
    console.warn('[SumoTube][main.js] Failed to load settings:', e.message);
    return {};
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log('[SumoTube][main.js] Saved settings:', settings);
  } catch (e) {
    console.error('[SumoTube][main.js] Failed to save settings:', e.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // remove default application menu (File/Edit/View/Window) for a clean chrome-less look
  try{ Menu.setApplicationMenu(null); }catch(e){ /* ignore if not supported */ }

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// helper to check for same-name thumbnails
function findSidecarImage(videoPath) {
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  const candidates = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of candidates) {
    const p = path.join(dir, base + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function scanFolder(folder) {
  const exts = ['.mp4', '.mkv', '.webm', '.mov', '.avi', '.flv', '.ogg'];
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


ipcMain.handle('choose-folder', async () => {
  // Accept an optional defaultPath from renderer
  const event = arguments[0];
  let defaultPath = undefined;
  if (arguments.length > 1 && arguments[1] && typeof arguments[1] === 'object') {
    defaultPath = arguments[1].defaultPath;
  }
  const { canceled, filePaths } = await dialog.showOpenDialog({ 
    properties: ['openDirectory'],
    defaultPath
  });
  if (canceled || filePaths.length === 0) return { canceled: true };
  const folder = filePaths[0];
  const files = scanFolder(folder);
  // Save last folder to settings
  const settings = loadSettings();
  settings.lastFolder = folder;
  saveSettings(settings);
  console.log('[SumoTube][main.js] choose-folder set lastFolder:', folder);
  return { canceled: false, folder, files };
});

ipcMain.handle('get-last-folder', async () => {
  const settings = loadSettings();
  console.log('[SumoTube][main.js] get-last-folder returns:', settings.lastFolder);
  return settings.lastFolder || null;
});

ipcMain.handle('set-last-folder', async (_event, folder) => {
  const settings = loadSettings();
  settings.lastFolder = folder;
  saveSettings(settings);
  console.log('[SumoTube][main.js] set-last-folder to:', folder);
  return true;
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
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('open-file', async (_event, filePath) => {
  try{
    return await shell.openPath(filePath);
  }catch(e){
    return e.message || String(e);
  }
});
