// Tells the game it is running in the desktop app, so its own in-browser
// update check stays off (the app updates itself, see main.cjs).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sundayNightApp', { desktop: true });
