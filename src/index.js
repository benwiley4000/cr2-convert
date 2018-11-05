import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import dcraw from 'dcraw';
import { decode as decodeTiff } from 'decode-tiff';
import { PNG } from 'pngjs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  console.log(mainWindow.webContents)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on('convert-from-raw', (event, filename) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      event.sender.send('read-error', filename);
      return;
    }
    event.sender.send('read-success');
    let decoded;
    let width;
    let height;
    try {
      const tiff = dcraw(data, { exportAsTiff: true });
      const { width: w, height: h, data: d } = decodeTiff(tiff);
      decoded = d;
      width = w;
      height = h;
    } catch (e) {
      event.sender.send('decode-error', filename);
      return;
    }
    event.sender.send('decode-success');
    let png;
    try {
      png = new PNG({ width, height });
      png.data = decoded;
    } catch (e) {
      event.sender.send('convert-error', filename);
    }
    event.sender.send('convert-success');
    const newFilename = filename + '-' + Date.now().toString(16) + '.png';
    fs.writeFile(newFilename, png, err => {
      if (err) {
        event.sender.send('write-error', newFilename);
      } else {
        event.sender.send('write-success');
      }
    });
  });
});
