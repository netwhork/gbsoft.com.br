const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { pref } = require('./test.js')
const { initDatabase, getAllEmpresas } = require('./database.js')

function createWindow () {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    // Inicializa o banco de dados
    initDatabase();
    createWindow();

    // Listener para buscar empresas
    ipcMain.handle('get-empresas', async () => {
        try {
            const empresas = await getAllEmpresas();
            return empresas;
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
            throw error;
        }
    });

    // Listener para executar pref
    ipcMain.on('executar-pref', async (event, cnpj) => {
        try {
            await pref(cnpj)
            event.reply('pref-resultado', { success: true, cnpj })
        } catch (error) {
            event.reply('pref-resultado', { success: false, error: error.message })
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})


