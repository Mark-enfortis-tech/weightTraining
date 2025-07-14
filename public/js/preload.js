
// preload.js (Secure IPC Bridge)
const { contextBridge, ipcRenderer} = require("electron");


contextBridge.exposeInMainWorld('electronAPI', {

    saveEvent: (commands) => ipcRenderer.send('save-event', commands),
    onSaveEventResponse: (callback) => ipcRenderer.on('save-event-response', (_, data) => callback(data)),
    
 
    sendCommands: (commands) => ipcRenderer.send('send-commands', commands),
    onReceiveCommands: (callback) => ipcRenderer.on('receive-commands', (_, data) => callback(data)),

    sendPassword: (credentials) => ipcRenderer.send('send-password', credentials),
    onReceivePassword: (callback) => ipcRenderer.on('receive-password', (_, data) => callback(data)),
    
    userLogin: (credentials) => ipcRenderer.send('user-login', credentials),
    onLoginResponse: (callback) => ipcRenderer.on('login-response', (_, data) => callback(data)),

    userSignup: (credentials) => ipcRenderer.send('user-signup', credentials),
    onSignupResponse: (callback) => ipcRenderer.on('signup-response', (_, data) => callback(data)),

    userChangePw: (credentials) => ipcRenderer.send('user-change-pw', credentials),
    onChangePwResponse: (callback) => ipcRenderer.on('change-pw-response', (_, data) => callback(data)),
    
    fetchRecords: (platform) => ipcRenderer.send('fetch-records', platform),
    onReceiveRecords: (callback) => ipcRenderer.on('receive-records', (_, data) => callback(data)),

    modifyRecord: (operation, record) => ipcRenderer.send('modify-record', { operation, record }),
    onRecordModified: (callback) => ipcRenderer.on('record-modified', (_, data) => callback(data)),

    userLogout: () => ipcRenderer.send('user-logout'),

});

// Notify main process when preload has loaded and renderer is ready
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('renderer-ready');
});







