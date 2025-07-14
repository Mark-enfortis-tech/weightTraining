if (require('electron-squirrel-startup')) return;
const { app, BrowserWindow, ipcMain} = require('electron');

const dgram = require('dgram');
const axios = require('axios');
const https = require('https');

const os = require('os');
// const WebSocket = require('ws');
// const fs = require('fs');
const log = require('electron-log');

const path = require('path');
// require('dotenv').config({ path: path.resolve(__dirname, 'config.env') });
const env = process.env;

const envPath = path.resolve(__dirname, 'config.env');
console.log('Looking for env file at:', envPath);
require('dotenv').config({
  path: path.resolve(__dirname, 'config.env'),
  override: true
});


// console.log("ENV path:", path.resolve(__dirname, 'config.env'));
// if (!fs.existsSync(envPath)) {
//   console.error("Config file missing at", envPath);
// } else {
//   console.log("Found config.env at", envPath);
// }

log.transports.file.level = 'info'; // or 'debug' for more detail
log.info('App starting...');


let mainWindow;
let SERVER_ADDR = env.SERVER_ADDR;
let HTTP_PORT = env.HTTP_PORT;
let AUTH_PORT = env.HTTPS_PORT;
let STATUS_PORT = env.STATUS_PORT;
// let SERVER_ADDR = process.env.SERVER_ADDR;
// let HTTP_PORT = process.env.HTTP_PORT;
// let AUTH_PORT = process.env.HTTPS_PORT;
// let STATUS_PORT = process.env.STATUS_PORT;
let userName = '';
let userId = 0;
let password = '';
let accessToken = '';
let refreshToken = '';
let rendererIsReady = false;

const mainWindowRef = { mainWindow: null, accessToken: '', refreshToken: '', token: '' };

// initialize app
(async () => {


    log.info('[INIT] Running initializeApp');
    console.log('[INIT] Running initializeApp from:', __filename);
    console.log('[INIT] Process type:', process.type); // 'browser' or 'renderer'
    console.log('[INIT] SERVER_ADDR', SERVER_ADDR);
    console.log('[INIT] HTTP_PORT', HTTP_PORT);
    console.log('[INIT] AUTH_PORT', AUTH_PORT);
    console.log('[INIT] STATUS_PORT', STATUS_PORT);

    // handleLoginAndFetchEvents();   // test code

    await initializeMainWindowApp(mainWindowRef, STATUS_PORT);

})();





function initializeMainWindowApp(mainWindowRef, STATUS_PORT) {
  return new Promise((resolve) => {
    app.whenReady().then(() => {
      mainWindowRef.mainWindow = new BrowserWindow({
        width: 1200,
        height: 1400,
        webPreferences: {
          preload: path.join(__dirname, "public/js/preload.js"),  // Path to preload.js
          contextIsolation: true,
          enableRemoteModule: false,
          nodeIntegration: false,
        },
      });

      log.info('[MainWindow] Electron app is ready');

      const wc = mainWindowRef.mainWindow.webContents;

      // Attach only once listener
      wc.once('did-finish-load', () => {
        console.log('[MainWindow] did-finish-load');
        log.info('[MainWindow] did-finish-load');
        resolve();
      });

      wc.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[MainWindow] did-fail-load:', errorCode, errorDescription);
        log.error('[MainWindow] did-fail-load:', errorCode, errorDescription);

      });

      wc.on('dom-ready', () => {
        console.log('[MainWindow] dom-ready');
        log.info('[MainWindow] dom-ready');
      });

      wc.on('crashed', () => {
        console.error('[MainWindow] Renderer process crashed!');
        log.error('[MainWindow] Renderer process crashed!');
      });

      // Load the file AFTER attaching listeners
      mainWindowRef.mainWindow.loadFile(
        path.join(__dirname, 'public', 'index.html')
      );
      mainWindowRef.mainWindow.webContents.openDevTools();


      app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
          app.quit();
        }
      });
    });
  });
}




// user event handlers
// Token-aware request function (you can place this in a shared module)
async function authRequest(config, retry = true) {
    try {
        config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${accessToken}`
        };
        return await axios(config);
    } catch (error) {
        if (
            retry &&
            error.response &&
            error.response.status === 403 &&
            refreshToken
        ) {
            console.warn("Access token expired. Attempting to refresh...");
            log.warn("Access token expired. Attempting to refresh...");

            try {
                const refreshResp = await axios.post(`https://${SERVER_ADDR}:${AUTH_PORT}/token`, {
                    refreshToken
                }, {
                    httpsAgent: new https.Agent({ rejectUnauthorized: false })
                });

                accessToken = refreshResp.data.accessToken;
                refreshToken = refreshResp.data.refreshToken;

                // Retry original request with new token
                config.headers.Authorization = `Bearer ${accessToken}`;
                return await axios(config);
            } catch (refreshErr) {
                console.error("Token refresh failed:", refreshErr.message);
                log.error("Token refresh failed:", refreshErr.message);
                throw refreshErr;
            }
        } else {
            throw error;
        }
    }
}



// Handle userlogout
ipcMain.on('user-logout', (event) => {
    console.log('Received logout request');

    deleteUserStats(UserName);
});

//async function createEvent({ userId, date, exerType, set, weight, plannedReps, actualReps 

// save new event
ipcMain.on('save-event', async (event, data) => {
    const { userId, date, exerType="exercise", set, weight, plannedReps, actualReps} = data;
    createEvent({ userId, date, exerType, set, weight, plannedReps, actualReps });
});





// setup UDP client
// function initializeUDPClient(mainWindow, STATUS_PORT) {
//     const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

//     const env = process.env.NODE_ENV;
//     // const resolvedAddr = env === 'development' ? '127.0.0.1' : getLocalNetworkAddress();
//     const resolvedAddr = getLocalNetworkAddress();
//     UDP_CLIENT_ADDR = resolvedAddr;
//     console.log(`using udpAddress: ${resolvedAddr}`);

//     client.on('listening', () => {
//         const address = client.address();
//         console.log(`Client listening on ${address.address}:${address.port}`);
//     });


//     client.on('message', (data, rinfo) => {
//         // console.log('received data: ', data.toString());
//         try {
//         const status = JSON.parse(data.toString());

//         status.activeSessions = (status.users || []).map(user => ({
//             username: user.user_name,
//             platform: user.platform,
//         }));

//         // console.log('sending status:', status);

//         if (rendererIsReady && mainWindowRef.mainWindow?.webContents) {
//             mainWindowRef.mainWindow.webContents.send('receive-status', {status});
//         } else {
//             console.warn('Renderer not ready yet, skipping message.');
//         }
//         } catch (err) {
//         console.error('Failed to parse message:', err);
//         }
//     });

//     client.bind(STATUS_PORT, '0.0.0.0', () => {
//         client.setBroadcast(true);
//         console.log(`UDP client bound on ${UDP_CLIENT_ADDR}:${STATUS_PORT} (default = all interfaces)`);
//     });

//     // client.bind(STATUS_PORT, UDP_CLIENT_ADDR, () => {
//     //   client.setBroadcast(true);
//     //   console.log(`UDP client bound on ${UDP_CLIENT_ADDR}:${STATUS_PORT} (default = all interfaces)`);
//     // }); 

//     return client; // optional: in case you want to use it elsewhere
// }

// // determine user IP address
// function getLocalNetworkAddress() {
// const interfaces = os.networkInterfaces();

// for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name]) {
//     // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
//     if (iface.family === 'IPv4' && !iface.internal) {
//         return iface.address;
//     }
//     }
// }

// // Fallback: default to localhost if no external interface found
// return '127.0.0.1';
// }

// // set renderer state, used to insure renderer has been fully loaded.
// ipcMain.on('renderer-ready', () => {
//   console.log('Renderer is ready');
//   rendererIsReady = true;
// });

// Handle user login
ipcMain.on('user-login', async (event, credentials) => {
    const { userName, password } = credentials;
    loginUser(userName, password);
});

// // Handle signup new user - auth-service https interface
// ipcMain.on('user-signup', async (event, credentials) => {
//     // console.log(`user-signup, credentials: ${credentials}`);
//     const { username, password } = credentials;
//     console.log(`attempting to signup newuser: ${username}, pw: ${password}`);
        

//     const connAddr = "https://" + SERVER_ADDR + ":" + AUTH_PORT+ "/signup";
//     try {
//         const response = await axios.post(connAddr, {
//                 username: username,
//                 password: password
//             }, {
//                 httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignore self-signed cert warning
//             })

//         console.log("signup response: ", response.data);
//         accessToken  = response.data; 
//         console.log("accessToken: ", accessToken);
//         mainWindowRef.mainWindow.webContents.send('signup-response', { success: true});
//     }   
//     catch (error) {

//     // console.error('there was an error, ', error);
//     // mainWindowRef.mainWindow.webContents.send('login-response', { success: false, error: error.message });
//     if (error.response) {
//         // Server responded with a non-2xx status
//         console.error(`Signup failed (${error.response.status}):`, error.response.data);
//         mainWindowRef.mainWindow.webContents.send('signup-response', {
//             success: false,
//             status: error.response.status,
//             message: error.response.data
//         });
//         } else {
//         // Some other error (e.g., network issue)
//         console.error('Signup request error:', error.message);
//         mainWindowRef.mainWindow.webContents.send('signup-response', {
//             success: false,
//             message: 'Network or server error'
//         });
//         }
//     }
// });

// // Handle user signup - auth-service https interface
// ipcMain.on('user-change-pw', async (event, credentials) => {
//     // console.log(`user-signup, credentials: ${credentials}`);
//     const { username, password } = credentials;
//     console.log(`attempting to change user password: ${username}, pw: ${password}`);
            
    
//     const connAddr = "https://" + SERVER_ADDR + ":" + AUTH_PORT+ "/change-password";
//     try {            
//         const response = await authRequest({
//             method: 'POST',
//             url: connAddr,
//             data: {
//                 username,
//                 password
//             },
//             httpsAgent: new https.Agent({ rejectUnauthorized: false })
//         });

//         console.log("change password response: ", response.data);
//         accessToken  = response.data; 
//         console.log("accessToken: ", accessToken);
//         mainWindowRef.mainWindow.webContents.send('change-pw-response', { success: true});
//     }   
//     catch (error) {

//             // console.error('there was an error, ', error);
//             // mainWindowRef.mainWindow.webContents.send('login-response', { success: false, error: error.message });
//             if (error.response) {
//                 // Server responded with a non-2xx status
//                 console.error(`Change password failed (${error.response.status}):`, error.response.data);
//                 mainWindowRef.mainWindow.webContents.send('change-pw-response', {
//                     success: false,
//                     status: error.response.status,
//                     message: error.response.data
//                 });
//                 } else {
//                 // Some other error (e.g., network issue)
//                 console.error('Change password error:', error.message);
//                 mainWindowRef.mainWindow.webContents.send('change-pw-response', {
//                     success: false,
//                     message: 'Network or server error'
//                 });
//                 }
//     }
// });

// // Fetch all records from the database with platform parameter - refresh token support
// ipcMain.on('fetch-records', async (event, platform) => {
//     console.log(`fetching all records from ${platform} platform`);
    
//     console.log(`using accessToken: ${accessToken}`);
//     const connAddr = "http://" + SERVER_ADDR + ":"+ SERVER_PORT + "/vsccs/inventory/ci_dbf";

//     console.log(`Connection string: ${connAddr}`);
//     console.log(`typeof(platform): ${typeof(platform)}`);
//     const searchPlatform = platform.toUpperCase();

//     // post userStats
//     postUserStats(UserName, searchPlatform);

//     console.log(`fetching records for ${searchPlatform}`);
//     try {
//         const response = await authRequest({
//         method: 'get',
//         url: connAddr,
//         params: {
//             platforms: `"${searchPlatform}"`,
//             values: '"all"'
//         },
//         httpsAgent: new https.Agent({ rejectUnauthorized: false })
//         });

//         cmdInventoryArray = response.data;
//         mainWindowRef.mainWindow.webContents.send('receive-records', response.data);
//         console.log("Fetched platform cmd inv: (cmdInvArray)", JSON.stringify(cmdInventoryArray))

//     } catch (error) {
//         mainWindowRef.mainWindow.webContents.send('receive-records', { success: false, error: error.message });
//     }
// });

// // Handle CRUD operations - refresh token support
// ipcMain.on('modify-record', async (event, { operation, record }) => {
//     const {_id, cmd_id, cmd_name, cmd_string, hazlock, platform, remarks, target_ip, target_port, cmd_protocol } = record;
//     console.log("API: modifyRecord:", record);
//     console.log

//     const axiosConfig = {
//         headers: {
//             "Content-Type": "application/json",
//             'Authorization': `Bearer ${accessToken}` // Add the JWT accessToken in the Authorization header
//         }
//     };

//     try {
//         let response;
//         const connAddr = "http://" + SERVER_ADDR + ":"+ SERVER_PORT + "/vsccs/inventory/ci_dbf";

//         if (operation === 'insert') {
//         console.log("CRUD operation - insert record");
//         const _cmd_id_int = parseInt(cmd_id, 10);
//         const _hazlock_bool = (hazlock === true || hazlock === "true");

//         response = await authRequest({
//             method: 'post',
//             url: connAddr,
//             data: {
//             cmd_id: _cmd_id_int,
//             cmd_name,
//             cmd_string,
//             hazlock: _hazlock_bool,
//             target_ip,
//             target_port,
//             platform,
//             cmd_protocol,
//             remarks
//             },
//             headers: {
//             "Content-Type": "application/json"
//             },
//             httpsAgent: new https.Agent({ rejectUnauthorized: false })
//         });

//             console.log("Response:", response.data);
//             const newResponse = response.data;

//             // updatecmd inv object with modifed item 
//             insertCmdInventory(cmdInventoryArray, newResponse)

//             // and resend to renderer
//             mainWindowRef.mainWindow.webContents.send('receive-records', cmdInventoryArray);
        
//         } else if (operation === 'modify') {
//             console.log("CRUD operation - modify record");
//             const _hazlock_bool = (hazlock === true || hazlock === "true");

//             response = await authRequest({
//                 method: 'put',
//                 url: connAddr,
//                 data: {
//                 _id,
//                 cmd_id,
//                 cmd_name,
//                 cmd_string,
//                 hazlock: _hazlock_bool,
//                 platform,
//                 target_ip,
//                 target_port,
//                 cmd_protocol,
//                 remarks
//                 },
//                 headers: {
//                 "Content-Type": "application/json"
//                 },
//                 httpsAgent: new https.Agent({ rejectUnauthorized: false })
//             });

//             console.log("Response:", response.data)
//             const modifiedResponse = response.data;

//             // updatecmd inv object with modifed item 
//             updateCmdInventory(cmdInventoryArray, modifiedResponse);

//             // and resend to renderer
//             mainWindowRef.mainWindow.webContents.send('receive-records', cmdInventoryArray);

//         } else if (operation === 'delete') {
//             console.log("CRUD operation - delete record");
//             console.log(`deleting record: ${cmd_id}`);

//             response = await authRequest({
//                 method: 'delete',
//                 url: connAddr,
//                 params: {
//                 _id,
//                 cmd_id
//                 },
//                 httpsAgent: new https.Agent({ rejectUnauthorized: false })
//             });

//             console.log("Response:", response.data)
//             deleteCmdInventory(cmdInventoryArray, cmd_id)
//             // and resend to renderer
//             mainWindowRef.mainWindow.webContents.send('receive-records', cmdInventoryArray);
//         }
        
//         mainWindowRef.mainWindow.webContents.send('record-modified', response.data);
        

//     } catch (error) {
// console.error("Error modifying record:", error.message);

// // Extract error message from server response if available
// const errorMessage = error.response?.data?.message || error.message;

// mainWindowRef.mainWindow.webContents.send('record-modified', { success: false, error: errorMessage });
// }

// });

// async function postUserStats(user_name, platform) {
//     const connAddr = `http://${SERVER_ADDR}:${SERVER_PORT}/vsccs/userStats`;
//     try {
//         const response = await axios.post(connAddr, null, {
//         params: {
//             user_name,
//             platform
//         }
//         });

//         console.log('User stats response:', response.data);
//         return response.data;
//         } catch (error) {
//             console.error('Failed to post user stats:', error);
//             return null;
//         }
// }

// // Function to delete a user
// async function deleteUserStats(user_name) {
//     const connAddr = `http://${SERVER_ADDR}:${SERVER_PORT}/vsccs/userStats`;
//     try {
//         const response = await axios.delete(connAddr, {
//         params: { user_name }
//         });

//         console.log(`User ${user_name} deleted:`, response.data);
//         return response.data;
//     } catch (error) {
//         console.error(`Failed to delete user ${user_name}:`, error);
//         return null;
//     }
// }



// updates command inventory table
// function updateCmdInventory(responseDataArray, modifiedResponse) {
//     // Find the index of the object in the original array that needs to be updated
//     console.log("responseDataArray", responseDataArray);
//     console.log("updateCmdInventory: ", modifiedResponse);
//     const index = responseDataArray.findIndex(item => item._id === modifiedResponse._id);

//     // If the object is found, update it with the modified values
//     if (index !== -1) {
//         responseDataArray[index] = { ...responseDataArray[index], ...modifiedResponse };
//     } else {
//         console.log(`No element found with _id: ${modifiedResponse._id}`);
//     }

//     console.log("responseDataArray (after update)", responseDataArray);

//     // Return the updated array
//     return responseDataArray;
// }
// // delete contents of command inventory table
// function deleteCmdInventory(responseDataArray, cmd_id) {
//     console.log("Before deletion:", JSON.stringify(responseDataArray, null, 2));
//     console.log(`Attempting to delete cmd_id: ${cmd_id} (Type: ${typeof cmd_id})`);

//     // Normalize cmd_id to ensure correct type comparison
//     const normalizedCmdId = typeof cmd_id === "number" ? cmd_id : parseInt(cmd_id, 10);

//     // Find the index of the item with the matching cmd_id
//     const index = responseDataArray.findIndex(item => parseInt(item.cmd_id, 10) === normalizedCmdId);

//     if (index !== -1) {
//         console.log(`Deleting item at index ${index}:`, responseDataArray[index]);
//         responseDataArray.splice(index, 1); // Remove the found element
//     } else {
//         console.warn(`No element found with cmd_id: ${cmd_id}`);
//     }

//     console.log("After deletion:", JSON.stringify(responseDataArray, null, 2));

//     return responseDataArray;
// }

// // insert new item in command inventory table
// function insertCmdInventory(responseDataArray, newResponse) {
//     // Ensure newResponse has a unique cmd_id
//     const exists = responseDataArray.some(item => item.cmd_id === newResponse.cmd_id);

//     if (exists) {
//         console.log(`Item with cmd_id ${newResponse.cmd_id} already exists.`);
//         return responseDataArray; // Return unchanged array if duplicate cmd_id is found
//     }

//     // Insert newResponse into the array
//     responseDataArray.push(newResponse);

//     // Return updated responseDataArray
//     return responseDataArray;
// }




// log in user
async function loginUser(userName, password) {

    console.log(`logging in with user_name: ${userName}, pw: ${password}`);

    const connAddr = `https://${SERVER_ADDR}:${AUTH_PORT}/login`;
    console.log(`connAddr: ${connAddr}`);

    try {
        const response = await axios.post(connAddr, {
            userName,
            password
        }, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        console.log("log in response: ", response.data);
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        userRole = response.data.userRole;
        userId = response.data.userId;

        console.log("Access token: ", accessToken);
        console.log("Refresh token: ", refreshToken);
        console.log("UserRole: ", userRole);
        console.log("UserId: ", userId);

        mainWindowRef.mainWindow.webContents.send('login-response', {
            success: true,
            userRole: userRole
        });

    } catch (error) {
        if (error.response) {
            console.error(`Login failed (${error.response.status}):`, error.response.data);
            mainWindowRef.mainWindow.webContents.send('login-response', {
                success: false,
                status: error.response.status,
                message: error.response.data
            });
        } else {
            console.error('Login request error:', error.message);
            mainWindowRef.mainWindow.webContents.send('login-response', {
                success: false,
                message: 'Network or server error'
            });
        }
    }
}


// get events by user and date range
async function getEventsByDateRange(userId, startDate, endDate) {
    console.log(`Fetching events for userId: ${userId}, start: ${startDate}, end: ${endDate}`);

    const connAddr = `http://localhost:80/events/range?userId=${userId}&startDate=${startDate}&endDate=${endDate}`;
    console.log(`connAddr: ${connAddr}`);

    try {
        const response = await axios.get(connAddr, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log("Events response:", response.data);

        mainWindowRef.mainWindow.webContents.send('events-response', {
            success: true,
            events: response.data
        });

    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.warn('Access token expired, attempting to refresh...');

            try {
                // Attempt to refresh the access token
                const refreshResponse = await axios.post(`https://${SERVER_ADDR}:${AUTH_PORT}/refresh`, {
                    refreshToken
                }, {
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Only needed if self-signed cert
                });

                accessToken = refreshResponse.data.accessToken;
                console.log('Access token refreshed.');

                // Retry original request with new access token
                const retryResponse = await axios.get(connAddr, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                mainWindowRef.mainWindow.webContents.send('events-response', {
                    success: true,
                    events: retryResponse.data
                });

            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError.message);
                mainWindowRef.mainWindow.webContents.send('events-response', {
                    success: false,
                    message: 'Session expired. Please log in again.'
                });
            }

        } else if (error.response) {
            console.error(`Event fetch failed (${error.response.status}):`, error.response.data);
            mainWindowRef.mainWindow.webContents.send('events-response', {
                success: false,
                status: error.response.status,
                message: error.response.data
            });
        } else {
            console.error('Event fetch request error:', error.message);
            mainWindowRef.mainWindow.webContents.send('events-response', {
                success: false,
                message: 'Network or server error'
            });
        }
    }
}


// create event 
async function createEvent({ userId, date, exerType, set, weight, plannedReps, actualReps }) {
    console.log(`Creating event: userId=${userId}, date=${date}, exerType=${exerType}`);

    const connAddr = 'http://localhost:80/events';

    const eventPayload = {
        userId,
        date,
        exerType,
        set,
        weight,
        plannedReps,
        actualReps // It's okay if this is 0 — the model allows it
    };

    try {
        const response = await axios.post(connAddr, eventPayload, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log('Event created:', response.data);

        mainWindowRef.mainWindow.webContents.send('save-event-response', {
            success: true,
            event: response.data
        });

    } catch (error) {
        if (error.response) {
            console.error(`Create event failed (${error.response.status}):`, error.response.data);
            mainWindowRef.mainWindow.webContents.send('event-create-response', {
                success: false,
                status: error.response.status,
                message: error.response.data
            });
        } else {
            console.error('Event creation request error:', error.message);
            mainWindowRef.mainWindow.webContents.send('event-create-response', {
                success: false,
                message: 'Network or server error'
            });
        }
    }
}

// update event 
async function updateEvent({ userId, date, exerType, set, actualReps, weight }) {
    console.log(`Updating event: userId=${userId}, date=${date}, exerType=${exerType}, set=${set}`);

    const connAddr = 'http://localhost:80/events';

    const updatePayload = {
        userId,
        date,
        exerType,
        set,
        actualReps,
        weight
    };

    try {
        const response = await axios.patch(connAddr, updatePayload, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log('Event updated:', response.data);

        mainWindowRef.mainWindow.webContents.send('event-update-response', {
            success: true,
            event: response.data
        });

    } catch (error) {
        if (error.response) {
            console.error(`Update event failed (${error.response.status}):`, error.response.data);
            mainWindowRef.mainWindow.webContents.send('event-update-response', {
                success: false,
                status: error.response.status,
                message: error.response.data
            });
        } else {
            console.error('Event update request error:', error.message);
            mainWindowRef.mainWindow.webContents.send('event-update-response', {
                success: false,
                message: 'Network or server error'
            });
        }
    }
}






// test code
async function handleLoginAndFetchEvents() {
    await loginUser('mark', 'qwerty');

    // await createEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 1, weight: 50, plannedReps:10, actualReps:0 });
    // await createEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 2, weight: 75, plannedReps:10, actualReps:0 });
    // await createEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 3, weight: 80, plannedReps:10, actualReps:0 });
    // await getEventsByDateRange(userId, '2025-07-07', '2025-07-07');

    // await updateEvent({ userId, date:'2025-07-07', exerType: 'flatbench', set: 1, weight: 110, plannedReps:10, actualReps:10 });
    // await updateEvent({ userId, date:'2025-07-07', exerType: 'flatbench', set: 2, weight: 115, plannedReps:10, actualReps:10 });
    // await updateEvent({ userId, date:'2025-07-07', exerType: 'flatbench', set: 3, weight: 125, plannedReps:10, actualReps:10 });

    await updateEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 1, weight: 50, plannedReps:10, actualReps:12 });
    await updateEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 2, weight: 75, plannedReps:10, actualReps:11 });
    await updateEvent({ userId, date:'2025-07-07', exerType: 'inclined bench', set: 3, weight: 80, plannedReps:10, actualReps:9 });
    await getEventsByDateRange(userId, '2025-07-07', '2025-07-07');



}





