# CDRM-Extension

**CDRM-Extension** is a browser extension designed to intercept DRM license requests for Widevine and PlayReady content, enabling advanced manipulation such as license interception, challenge injection, and remote Content Decryption Module (CDM) session handling. This can be useful for debugging, research, or integration with custom DRM solutions.

---

## Features

- Intercept and modify XMLHttpRequest POST requests related to DRM license challenges.
- Supports Widevine and PlayReady DRM systems.
- Remote CDM session management:
  - Open and close sessions remotely.
  - Request and inject license challenges.
  - Parse and retrieve keys from license responses.
- Dynamic DRM override and injection type settings via content script communication.
- Works with both binary and JSON license payloads.
- Logs detailed debug information in the console for tracking operations.

---

## Installation

1. Clone or download this repository.

```bash
git clone https://github.com/ex3mpli/CDRM-Extension.git
