let customBase64 = "PlaceHolder";
let psshFound = false;
let postRequestFound = false;
let firstValidLicenseResponse = false;
let firstValidServiceCertificate = false;
let remoteCDM = null;
let decryptionKeys = null;
let messageSuppressed = false;
let interceptType = "DISABLED"; // Default to LICENSE, can be changed to 'EME' for EME interception
let originalChallenge = null;
let widevineDeviceInfo = null;
let playreadyDeviceInfo = null;

window.postMessage({ type: "__GET_INJECTION_TYPE__" }, "*");

window.addEventListener("message", function(event) {
  if (event.source !== window) return;

  if (event.data.type === "__INJECTION_TYPE__") {
    interceptType = event.data.injectionType || "DISABLED";
    console.log("Injection type set to:", interceptType);
  }
});


window.postMessage({ type: "__GET_CDM_DEVICES__" }, "*");

window.addEventListener("message", function(event) {
  if (event.source !== window) return;

  if (event.data.type === "__CDM_DEVICES__") {
    const { widevine_device, playready_device } = event.data;

    // Now you can use widevine_device and playready_device!
    console.log("Received device info:", widevine_device, playready_device);

    // Store them globally
    widevineDeviceInfo = widevine_device;
    playreadyDeviceInfo = playready_device;
  }
});


class remotePlayReadyCDM {
    constructor(security_level, host, secret, device_name) {
        this.security_level = security_level;
        this.host = host;
        this.secret = secret;
        this.device_name = device_name;
        this.session_id = null;
        this.challenge = null;
    }

    async openSession() {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/open`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.data?.session_id) {
                this.session_id = jsonData.data.session_id;
                return { success: true, session_id: this.session_id };
            } else {
                return { success: false, error: jsonData.message || 'Unknown error occurred.' };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getChallenge(init_data) {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/get_license_challenge`;

        const body = {
            session_id: this.session_id,
            init_data: init_data,
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.data?.challenge) {
                return {
                    success: true,
                    challenge: jsonData.data.challenge
                };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to retrieve license challenge.'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async parseLicense(license_message) {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/parse_license`;

        const body = {
            session_id: this.session_id,
            license_message: license_message
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.message === "Successfully parsed and loaded the Keys from the License message") {
                return {
                    success: true,
                    message: jsonData.message
                };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to parse license.'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async closeSession() {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/close/${this.session_id}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const jsonData = await response.json();

            if (response.ok) {
                return { success: true, message: jsonData.message };
            } else {
                return { success: false, error: jsonData.message || 'Failed to close session.' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }


    async getKeys() {
        const url = `${this.host}/remotecdm/playready/${this.device_name}/get_keys`;

        const body = {
            session_id: this.session_id
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.data?.keys) {
                decryptionKeys = jsonData.data.keys;

                // Automatically close the session after key retrieval
                await this.closeSession();

                return { success: true, keys: decryptionKeys };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to retrieve decryption keys.'
                };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

class remoteWidevineCDM {
    constructor(device_type, system_id, security_level, host, secret, device_name) {
        this.device_type = device_type;
        this.system_id = system_id;
        this.security_level = security_level;
        this.host = host;
        this.secret = secret;
        this.device_name = device_name;
        this.session_id = null;
        this.challenge = null;
    }

    async openSession() {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/open`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200 && jsonData.data?.session_id) {
                this.session_id = jsonData.data.session_id;
                return { success: true, session_id: this.session_id };
            } else {
                return { success: false, error: jsonData.message || 'Unknown error occurred.' };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async setServiceCertificate(certificate) {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/set_service_certificate`;

        const body = {
            session_id: this.session_id,
            certificate: certificate ?? null
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: jsonData.message || 'Failed to set service certificate.' };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getChallenge(init_data, license_type = 'STREAMING', privacy_mode = false) {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/get_license_challenge/${license_type}`;

        const body = {
            session_id: this.session_id,
            init_data: init_data,
            privacy_mode: privacy_mode
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200 && jsonData.data?.challenge_b64) {
                return {
                    success: true,
                    challenge: jsonData.data.challenge_b64
                };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to retrieve license challenge.'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async parseLicense(license_message) {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/parse_license`;

        const body = {
            session_id: this.session_id,
            license_message: license_message
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200) {
                return {
                    success: true,
                    message: jsonData.message
                };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to parse license.'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async closeSession() {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/close/${this.session_id}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200) {
                return { success: true, message: jsonData.message };
            } else {
                return { success: false, error: jsonData.message || 'Failed to close session.' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }


    async getKeys() {
        const url = `${this.host}/remotecdm/widevine/${this.device_name}/get_keys/ALL`;

        const body = {
            session_id: this.session_id
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const jsonData = await response.json();

            if (response.ok && jsonData.status === 200 && jsonData.data?.keys) {
                decryptionKeys = jsonData.data.keys;

                // Automatically close the session after key retrieval
                await this.closeSession();

                return { success: true, keys: decryptionKeys };
            } else {
                return {
                    success: false,
                    error: jsonData.message || 'Failed to retrieve decryption keys.'
                };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}



// --- Utility functions ---
const hexStrToU8 = hexString =>
    Uint8Array.from(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const u8ToHexStr = bytes =>
    bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

const b64ToHexStr = b64 =>
    [...atob(b64)].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join``;

function jsonContainsValue(obj, target) {
    if (typeof obj === "string") return obj === target;
    if (Array.isArray(obj)) return obj.some(val => jsonContainsValue(val, target));
    if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).some(val => jsonContainsValue(val, target));
    }
    return false;
}

function jsonReplaceValue(obj, target, newValue) {
    if (typeof obj === "string") {
        return obj === target ? newValue : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => jsonReplaceValue(item, target, newValue));
    }

    if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            if (Object.hasOwn(obj, key)) {
                newObj[key] = jsonReplaceValue(obj[key], target, newValue);
            }
        }
        return newObj;
    }

    return obj;
}

const isJson = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

// --- Widevine-style PSSH extractor ---
function getWidevinePssh(buffer) {
    const hex = u8ToHexStr(new Uint8Array(buffer));
    const match = hex.match(/000000(..)?70737368.*/);
    if (!match) return null;

    const boxHex = match[0];
    const bytes = hexStrToU8(boxHex);
    return window.btoa(String.fromCharCode(...bytes));
}

// --- PlayReady-style PSSH extractor ---
function getPlayReadyPssh(buffer) {
    const u8 = new Uint8Array(buffer);
    const systemId = "9a04f07998404286ab92e65be0885f95";
    const hex = u8ToHexStr(u8);
    const index = hex.indexOf(systemId);
    if (index === -1) return null;
    const psshBoxStart = hex.lastIndexOf("70737368", index);
    if (psshBoxStart === -1) return null;
    const lenStart = psshBoxStart - 8;
    const boxLen = parseInt(hex.substr(lenStart, 8), 16) * 2;
    const psshHex = hex.substr(lenStart, boxLen);
    const psshBytes = hexStrToU8(psshHex);
    return window.btoa(String.fromCharCode(...psshBytes));
}

// --- Clearkey Support ---
function getClearkey(response) {
  let obj = JSON.parse((new TextDecoder("utf-8")).decode(response));
  return obj["keys"].map(o => ({
    key_id: b64ToHexStr(o["kid"].replace(/-/g, '+').replace(/_/g, '/')),
    key: b64ToHexStr(o["k"].replace(/-/g, '+').replace(/_/g, '/')),
  }));
}

// --- Convert Base64 to Uint8Array ---
function base64ToUint8Array(base64) {
    const binaryStr = atob(base64); // Decode base64 to binary string
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(uint8array) {
  let binary = '';
  const len = uint8array.length;

  // Convert each byte to a character
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8array[i]);
  }

  // Encode the binary string to Base64
  return window.btoa(binary);
}

// --- Intercepting EME Calls ---
const originalGenerateRequest = MediaKeySession.prototype.generateRequest;

MediaKeySession.prototype.generateRequest = async function(initDataType, initData) {
    console.log(initData);
    const session = this;

    let playReadyAttempted = false;
    let playReadySucceeded = false;
    let playReadyPssh = null;
    let widevinePssh = null;

    if (!psshFound && !messageSuppressed && (interceptType === 'EME' || interceptType === 'LICENSE')) {
        // === Try PlayReady First ===
        playReadyPssh = getPlayReadyPssh(initData);
        playReadyAttempted = !!playReadyPssh;

        if (playReadyPssh) {
            console.log("[PlayReady PSSH] Found:", playReadyPssh);
            const drmType = {
                type: "__DRM_TYPE__",
                    data: 'PlayReady'
                };
            window.postMessage(drmType, "*");
            try {
                const {
                    security_level, host, secret, device_name
                } = playreadyDeviceInfo;
                remoteCDM = new remotePlayReadyCDM(security_level, host, secret, device_name);
                const sessionResult = await remoteCDM.openSession();
                if (sessionResult.success) {
                    console.log("PlayReady session opened:", sessionResult.session_id);
                    const challengeResult = await remoteCDM.getChallenge(playReadyPssh);
                    if (challengeResult.success) {
                        customBase64 = btoa(challengeResult.challenge);
                        playReadySucceeded = true;
                        psshFound = true;
                        window.postMessage({ type: "__PSSH_DATA__", data: playReadyPssh }, "*");
                    } else {
                        console.warn("PlayReady challenge failed:", challengeResult.error);
                    }
                } else {
                    console.warn("PlayReady session failed:", sessionResult.error);
                }
            } catch (err) {
                console.error("PlayReady error:", err.message);
            }
        } else {
            console.log("[PlayReady PSSH] Not found.");
        }

        // === Fallback to Widevine ===
        if (!playReadySucceeded) {
            widevinePssh = getWidevinePssh(initData);
            if (widevinePssh) {
                console.log("[Widevine PSSH] Found:", widevinePssh);
                const drmType = {
                    type: "__DRM_TYPE__",
                    data: 'Widevine'
                };
                window.postMessage(drmType, "*");
                try {
                    const {
                        device_type, system_id, security_level, host, secret, device_name
                    } = widevineDeviceInfo;
                    remoteCDM = new remoteWidevineCDM(device_type, system_id, security_level, host, secret, device_name);
                    const sessionResult = await remoteCDM.openSession();
                    if (sessionResult.success) {
                        console.log("Widevine session opened:", sessionResult.session_id);
                        const challengeResult = await remoteCDM.getChallenge(widevinePssh);
                        if (challengeResult.success) {
                            customBase64 = challengeResult.challenge;
                            psshFound = true;
                            window.postMessage({ type: "__PSSH_DATA__", data: widevinePssh }, "*");
                        } else {
                            console.warn("Widevine challenge failed:", challengeResult.error);
                        }
                    } else {
                        console.warn("Widevine session failed:", sessionResult.error);
                    }
                } catch (err) {
                    console.error("Widevine error:", err.message);
                }
            } else {
                console.log("[Widevine PSSH] Not found.");
            }
        }

        // === Intercept License or EME Messages ===
        if (!messageSuppressed && interceptType === 'EME') {
            session.addEventListener("message", function originalMessageInterceptor(event) {
                event.stopImmediatePropagation();
                console.log("[Intercepted EME Message] Injecting custom message.");
                console.log(event.data);

                const uint8 = base64ToUint8Array(customBase64);
                const arrayBuffer = uint8.buffer;

                const syntheticEvent = new MessageEvent("message", {
                    data: event.data,
                    origin: event.origin,
                    lastEventId: event.lastEventId,
                    source: event.source,
                    ports: event.ports
                });

                Object.defineProperty(syntheticEvent, "message", {
                    get: () => arrayBuffer
                });
                console.log(syntheticEvent);
                setTimeout(() => session.dispatchEvent(syntheticEvent), 0);
            }, { once: true });

            messageSuppressed = true;
        }

        if (!messageSuppressed && interceptType === 'LICENSE') {
            session.addEventListener("message", function originalMessageInterceptor(event) {
                if (playReadyAttempted && playReadySucceeded) {
                    const buffer = event.message;
                    const decoder = new TextDecoder('utf-16');
                    const decodedText = decoder.decode(buffer);
                    const match = decodedText.match(/<Challenge encoding="base64encoded">([^<]+)<\/Challenge>/);
                    if (match) {
                        originalChallenge = match[1];
                        console.log("[PlayReady Challenge Extracted]");
                        messageSuppressed = true;
                    }
                }

                if (!playReadySucceeded && widevinePssh && psshFound) {
                    const uint8Array = new Uint8Array(event.message);
                    const b64array = arrayBufferToBase64(uint8Array);
                    if (b64array !== "CAQ=") {
                        originalChallenge = b64array;
                        console.log("[Widevine Challenge Extracted]");
                        messageSuppressed = true;
                    }
                }
            }, { once: false });
        }
    }

    // Proceed with original generateRequest
    return originalGenerateRequest.call(session, initDataType, initData);
};

// license message handler
const originalUpdate = MediaKeySession.prototype.update;

MediaKeySession.prototype.update = function(response) {
    const uint8 = response instanceof Uint8Array ? response : new Uint8Array(response);
    const base64Response = window.btoa(String.fromCharCode(...uint8));

    // Handle Service Certificate
    if (base64Response.startsWith("CAUS") && !firstValidServiceCertificate) {
        const base64ServiceCertificateData = {
            type: "__CERTIFICATE_DATA__",
            data: base64Response
        };
        window.postMessage(base64ServiceCertificateData, "*");
        firstValidServiceCertificate = true;
    }

    // Handle License Data
    if (!base64Response.startsWith("CAUS") && (interceptType === 'EME' || interceptType === 'LICENSE')) {

        // 🔁 Call parseLicense, then getKeys from global remoteCDM
        if (remoteCDM !== null && remoteCDM.session_id) {
            remoteCDM.parseLicense(base64Response)
                .then(result => {
                    if (result.success) {
                        console.log("[Base64 Response]", base64Response);
                        const base64LicenseData = {
                            type: "__LICENSE_DATA__",
                            data: base64Response
                        };
                        window.postMessage(base64LicenseData, "*");
                        console.log("[remoteCDM] License parsed successfully");

                        // 🚀 Now call getKeys after parsing
                        return remoteCDM.getKeys();
                    } else {
                        console.warn("[remoteCDM] License parse failed:", result.error);
                    }
                })
                .then(keysResult => {
                    if (keysResult?.success) {
                        const keysData = {
                            type: "__KEYS_DATA__",
                            data: keysResult.keys
                        };
                        window.postMessage(keysData, "*");
                        console.log("[remoteCDM] Decryption keys retrieved:", keysResult.keys);
                    } else if (keysResult) {
                        console.warn("[remoteCDM] Failed to retrieve keys:", keysResult.error);
                    }
                })
                .catch(err => {
                    console.error("[remoteCDM] Unexpected error in license flow:", err);
                });
        } else {
            console.warn("[remoteCDM] Cannot parse license: remoteCDM not initialized or session_id missing.");
        }
    }

    const updatePromise = originalUpdate.call(this, response);

    if (!psshFound) {
        updatePromise
            .then(() => {
                let clearKeys = getClearkey(response);
                if (clearKeys && clearKeys.length > 0) {
                  console.log("[CLEARKEY] ", clearKeys);
                  const drmType = {
                      type: "__DRM_TYPE__",
                      data: 'ClearKey'
                  };
                  window.postMessage(drmType, "*");
                  const keysData = {
                      type: "__KEYS_DATA__",
                      data: clearKeys
                  };
                  window.postMessage(keysData, "*");
                }
            })
            .catch(e => {
                console.log("[CLEARKEY] Not found");
            });
    }

    return updatePromise;
};

// --- Request Interception ---
(function interceptRequests() {
    const sendToBackground = (data) => {
        window.postMessage({ type: "__INTERCEPTED_POST__", data }, "*");
    };

// Intercept fetch
const originalFetch = window.fetch;

window.fetch = async function(input, init = {}) {
    const method = (init.method || 'GET').toUpperCase();

    if (method === "POST") {
        const url = typeof input === "string" ? input : input.url;
        let body = init.body;

        // If the body is FormData, convert it to an object (or JSON)
        if (body instanceof FormData) {
            const formData = {};
            body.forEach((value, key) => {
                formData[key] = value;
            });
            body = JSON.stringify(formData); // Convert formData to JSON string
        }

        const headers = {};
        if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v; });
        } else {
            Object.assign(headers, init.headers || {});
        }

        try {
            let modifiedBody = body; // Keep a reference to the original body

            // Handle body based on its type
            if (typeof body === 'string') {
                if (isJson(body)) {
                    const parsed = JSON.parse(body);
                    if (jsonContainsValue(parsed, customBase64)) {
                        sendToBackground({ url, method, headers, body });
                    }
                    if (jsonContainsValue(parsed, originalChallenge)) {
                        newJSONBody = jsonReplaceValue(parsed, originalChallenge, customBase64);
                        modifiedBody = JSON.stringify(newJSONBody)
                        sendToBackground({ url, method, headers, modifiedBody });
                    }
                } else if (body === customBase64) {
                    sendToBackground({ url, method, headers, body });
                } else if (btoa(body) == originalChallenge) {
                    modifiedBody = atob(customBase64);
                    sendToBackground({ url, method, headers, modifiedBody });
                }
            }else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
                const base64Body = window.btoa(String.fromCharCode(...buffer));
                if (base64Body === customBase64) {
                    sendToBackground({ url, method, headers, body: base64Body });
                }
                if (base64Body === originalChallenge) {
                    modifiedBody = base64ToUint8Array(customBase64); // Modify the body
                    sendToBackground({ url, method, headers, body: modifiedBody });
                }
            }

            // Ensure the modified body is used and passed to the original fetch call
            init.body = modifiedBody;

        } catch (e) {
            console.warn("Error handling fetch body:", e);
        }
    }

    // Call the original fetch method with the potentially modified body
    return originalFetch(input, init);
};

// Intercept XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
    if (this._method?.toUpperCase() === "POST") {
        const xhr = this;
        const headers = {};
        const originalSetRequestHeader = xhr.setRequestHeader;

        xhr.setRequestHeader = function(header, value) {
            headers[header] = value;
            return originalSetRequestHeader.apply(this, arguments);
        };

        setTimeout(() => {
            try {
                let modifiedBody = body; // Start with the original body

                // Check if the body is a string and can be parsed as JSON
                if (typeof body === 'string') {
                    if (isJson(body)) {
                        const parsed = JSON.parse(body);
                        if (jsonContainsValue(parsed, customBase64)) {
                            sendToBackground({ url: xhr._url, method: xhr._method, headers, body });
                        }
                        if (jsonContainsValue(parsed, originalChallenge)) {
                            newJSONBody = jsonReplaceValue(parsed, originalChallenge, customBase64);
                            modifiedBody = JSON.stringify(newJSONBody);
                            sendToBackground({ url: xhr._url, method: xhr._method, headers, modifiedBody });
                        }
                    } else if (body === originalChallenge) {
                        modifiedBody = customBase64
                        sendToBackground({ url: xhr._url, method: xhr._method, headers, body });
                    } else if (btoa(body) == originalChallenge) {
                        modifiedBody = atob(customBase64);
                        sendToBackground({ url: xhr._url, method: xhr._method, headers, body });
                    }
                } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                    const buffer = body instanceof Uint8Array ? body : new Uint8Array(body);
                    const base64Body = window.btoa(String.fromCharCode(...buffer));
                    if (base64Body === customBase64) {
                        sendToBackground({ url: xhr._url, method: xhr._method, headers, body: base64Body });
                    }
                    if (base64Body === originalChallenge) {
                        modifiedBody = base64ToUint8Array(customBase64); // Modify the body
                        sendToBackground({ url: xhr._url, method: xhr._method, headers, body: modifiedBody });
                    }
                }

                // Ensure original send is called only once with the potentially modified body
                originalSend.apply(this, [modifiedBody]);

            } catch (e) {
                console.warn("Error handling XHR body:", e);
            }
        }, 0);
    } else {
        // Call the original send for non-POST requests
        return originalSend.apply(this, arguments);
    }
};
})();
