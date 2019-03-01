// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, globalShortcut} = require('electron');

let mainWindow

function createWindow () {

  mainWindow = new BrowserWindow({
      show: false, 
      minWidth : 1100, 
      minHeight : 600, 
      webPreferences: {
          plugins: true
      },
      icon: './icon.ico'
    })
  mainWindow.maximize();
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.on('resize',function(){
    mainWindow.center();
  })
  mainWindow.on('closed', function () {
    mainWindow = null
  })
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    mainWindow.webContents.openDevTools()
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

/*
      Catch Item requests from Website
*/
ipcMain.on('toLocal', function(e,item){
  
  if(item.fnName == "logger"){
    
  }
})


