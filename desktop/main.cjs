// Sunday Night as a Windows app: one window showing dist/index.html, and
// electron-updater for updates from GitHub Releases. A new version downloads
// in the background; the player is asked before the app restarts into it
// (choosing Later installs it the next time the app closes).
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

// Older Intel graphics are on Chromium's blocklist; the game runs fine there.
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let win = null;

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    title: 'Sunday Night',
    backgroundColor: '#2b1f22',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // F11 toggles full screen, as in a browser.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  // Links open in the real browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function checkForUpdates() {
  if (!app.isPackaged) return; // `npm run app` runs from the source folder
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (err) => console.warn('update check failed:', err?.message || err)); // offline is fine
  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Sunday Night',
      message: `Sunday Night ${info.version} is ready.`,
      detail: 'Restart now to update, or choose Later and it updates the next time you close the game.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.checkForUpdates().catch(() => {});
}

// One copy at a time: opening it again brings the window forward.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(() => {
    createWindow();
    checkForUpdates();
  });
  app.on('window-all-closed', () => app.quit());
}
