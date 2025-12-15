## Architectural Overview

SumoTube is structured around two main processes:

1.  **Main Process (`main.js`):** The single entry point, responsible for operating system interactions, window management, and persistent storage of settings.
2.  **Renderer Process (`renderer.js`, `index.html`):** The application interface, responsible for rendering the UI, managing application state, and handling user input.

These two processes communicate exclusively through **Inter-Process Communication (IPC)**, which is secured and facilitated by the **Preload Script (`preload.js`)**.

---

## 1. Main Process (`main.js`)

The Main Process acts as the application's backend and intermediary to the operating system (Node.js API access).

| Component | Responsibility | Details |
| :--- | :--- | :--- |
| **Window Management** | Creates and manages the `BrowserWindow` instance. | Sets initial size, title ("SumoTube"), and configuration for the renderer. |
| **System Interaction** | Handles all file system operations and external calls. | Uses Node.js modules (`fs`, `path`) to scan folders (`scanFolder`), find sidecar images (`findSidecarImage`), and uses the Electron `dialog` and `shell` modules to choose folders and open files externally (`openFile`). |
| **Persistence (Settings)** | Stores and retrieves application settings. | Uses the `electron-store` module to persistently save the `lastFolder` path, allowing the app to reload the previous view on startup. |
| **IPC Endpoint** | Exposes core system functions to the Renderer. | Handlers for `choose-folder`, `rescan-folder`, `select-thumbnail`, `open-file`, `get-last-folder`, and `set-last-folder`. |

### Folder Scanning Logic

The `scanFolder` function in `main.js` is critical for data ingestion. It:
1.  Recursively traverses the selected directory.
2.  Filters files based on a hardcoded list of video extensions (`.mp4`, `.mkv`, etc.).
3.  For each video, it attempts to find a co-located "sidecar" image file (e.g., `video.mp4` -> `video.jpg`/`video.png`) to use as a default thumbnail.
4.  It extracts the `path`, `name`, and the parent directory name (`parent`) which is used as the default *Artist* name.

---

## 2. Renderer Process (`renderer.js` & `index.html`)

The Renderer Process is the application's frontend, running within the Chromium environment.

| Component | Responsibility | Details |
| :--- | :--- | :--- |
| **UI and View Logic** | Renders the primary grid, artist views, and playlist views. | Functions like `renderGrid()`, `renderArtist()`, and `renderPlaylist()` manage which set of video cards are displayed based on `currentView` state. |
| **Application State Management** | Stores all user-created and session-specific data. | Uses **`localStorage`** to persist: `videos` (the indexed file list), `pinned` (set of pinned video paths), `artistProfiles` (artist bios/PFP paths), `customThumbs` (user-selected thumbnail paths), `playlists`, and **`customMetadata`** (user-overridden titles/artists). |
| **User Interaction** | Handles all DOM events, modals, and search/sort filters. | Implements modals for editing artist bios, creating/editing playlists, and setting custom video metadata. Applies sort logic (`applySort`) and filters the videos based on the search input. |
| **Media Handling** | Previews and displays video metadata. | Uses HTML `<video>` elements in a temporary, off-screen capacity to load video metadata, extract and format the duration, and capture a frame for a default thumbnail if no dedicated thumbnail is available. |

### Data Model and Display Logic

A key feature is the separation of **Raw Video Data** (from file system scan) and **Display Video Data** (what the user sees):

* The `normalizeFiles` function prepares the raw data from the Main Process.
* The `getDisplayVideo` function applies overrides from the `customMetadata` state (if present) to the title and artist name before the video is displayed.

---

## 3. Inter-Process Communication (IPC) (`preload.js`)

IPC is the security-focused mechanism for communication.

* **`preload.js`** is the bridge. It runs in an isolated context and uses Electron's `contextBridge` to expose a limited, safe API (`window.electronAPI`) to the Renderer. This prevents the Renderer from having direct access to Node.js APIs or the Main Process's global context.
* The **Renderer** calls methods like `window.electronAPI.chooseFolder()`.
* The **Preload Script** relays this to the **Main Process** via `ipcRenderer.invoke()`.
* The **Main Process** handles the request via `ipcMain.handle()` and returns a result.

| IPC Method (Renderer Call) | Main Process Handler | Purpose |
| :--- | :--- | :--- |
| `chooseFolder` | `ipcMain.handle('choose-folder')` | Opens file dialog for folder selection and returns the file list. |
| `rescanFolder` | `ipcMain.handle('rescan-folder')` | Refreshes the video list for the current folder. |
| `selectThumbnail` | `ipcMain.handle('select-thumbnail')` | Opens file dialog to select an image for a custom thumbnail. |
| `openFile` | `ipcMain.handle('open-file')` | Uses the operating system's default program to open the video file. |
| `setLastFolder` | `ipcMain.handle('set-last-folder')` | Saves the current folder path using `electron-store`. |

---

## 4. Data Flow and Persistence

Data flows primarily between the file system, the Main Process, and the Renderer Process.

1.  **File System Scan:** User clicks "Open Folder" (`renderer.js`) → Calls `chooseFolder` (IPC) → `main.js` scans directory and returns video objects.
2.  **State Initialization:** `renderer.js` receives the raw data, applies `getDisplayVideo()` logic (using `customMetadata` from `localStorage`), and updates the `videos` state.
3.  **App State Persistence:** User makes changes (e.g., pins a video, edits a bio, creates a playlist) → `saveState()` function in `renderer.js` writes the updated application state (playlists, pins, custom metadata) to **`localStorage`**.
4.  **Settings Persistence:** The last opened folder is saved separately to **`electron-store`** in the Main Process, ensuring the Main Process can attempt to restore the folder before the Renderer even fully loads.