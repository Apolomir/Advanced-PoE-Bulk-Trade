// main.js
if (require('electron-squirrel-startup')) return;
// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs');

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

let win;
const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: "resources/assets/icon.ico",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    win.removeMenu()

    // and load the index.html of the app.
    win.loadFile('resources/index.html')

    // Open the DevTools.
    //win.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('load-exchange-data', event => {
    let exchangeData
    if (app.isPackaged) {
        exchangeData = fs.readFileSync(path.join(process.resourcesPath, 'exchange-data.json'), 'utf-8')
    } else {
        exchangeData = fs.readFileSync('resources/data/exchange-data.json', 'utf-8')
    }
    win.webContents.send('receive-exchange-data', exchangeData)
})

ipcMain.on('save-exchange-data', (event, args) => {
    if (app.isPackaged) {
        fs.writeFileSync(path.join(process.resourcesPath, 'exchange-data.json'), JSON.stringify(Array.from(args.entries())), 'utf-8')
    } else {
        fs.writeFileSync('resources/data/exchange-data.json', JSON.stringify(Array.from(args.entries())),'utf-8')
    }
})


function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            app.quit();
            return true;
    }
}