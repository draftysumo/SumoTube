# SumoTube

A Windows/Linux desktop application to browse and preview local video files with custom thumbnails, custom artist' name & pages, hover previews, random sorting, and video pinning. Open any video in your devices default media player just by double clicking the video card inside the app.

<img width="1920" height="1032" alt="Screenshot from 2025-10-10 19-08-14" src="https://github.com/user-attachments/assets/0e6701f6-f822-4340-869a-10ba1bacf3d5" />
<img width="1920" height="1032" alt="Screenshot from 2025-10-10 19-07-40" src="https://github.com/user-attachments/assets/3d343be8-dfb0-4236-ac53-16c37125614e" />


## Table of Contents

* [Features](#features)
* [UI Components](#ui-components)
* [How It Works](#how-it-works)
* [Installation](#installation)
* [Compilation](#compilation)
  * [Linux](#linux)
  * [Windows](#windows)
* [Contributing](#contributing)

---

## Features

* **Local Video Browsing:** Recursively scans folders for video files (`.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.flv`, `.ogg`) and displays them as cards.
* **Custom Thumbnails:** Supports sidecar images (`.jpg`, `.jpeg`, `.png`, `.webp`) with the same base filename. You can also assign custom thumbnails manually.
* **Hover Previews:** Hovering over a video thumbnail plays a looping video preview.
* **Duration Display:** Each video shows its runtime in a rounded pill overlay.
* **Pin Videos:** Right-click a video to pin or unpin it. Pinned videos always appear at the start of the grid, regardless of sort mode.
* **Random Home Page:** Default random shuffle to mimic algorithmic rediscovery.
* **Sorting Options:** Sort by random, title (asc/desc), or artist (asc/desc).
* **Search:** Filter by video title or artist name in real time.
* **Artist View:** Navigate into an artist (parent folder) page, set profile pictures, and edit artist bios.
* **Persistent State:** Last folder, pinned videos, custom thumbnails, and artist bios are saved between sessions.
* **Resizable Layout:** Responsive grid that adapts to window size.
* **Open Videos:** Click a card to open the video in your system’s default player.
* **Minimal Chrome:** Default application menu is removed for a clean look.

---

## UI Components

* **Top Bar**

  * Search bar for quick filtering.
  * Sort selector (random, title, artist).
  * Buttons to change folder or refresh.
* **Video Grid**

  * Thumbnail, title, artist, duration pill, pin icon.
  * Hover to preview video.
  * Click to play.
* **Artist Sidebar**

  * Lists artists (folders) with video counts.
  * Click an artist to open their dedicated page.
* **Artist Page**

  * Large profile picture and bio (editable).
  * Buttons for setting PFP, editing bio, and going back.

---

## How It Works

1. On startup, the app restores the last folder (if available) and rebuilds the video grid.
2. Videos are scanned recursively, with sidecar thumbnails automatically detected.
3. Hovering a card plays a short looping preview.
4. Right-click a card to toggle pin state.
5. Search bar dynamically filters results by title or artist.
6. Artists are grouped by parent folder. Selecting one opens their profile page.
7. Custom thumbnails and artist bios are saved persistently in local storage.
8. Opening a video launches it with the system’s default video player.

---

## Installation

Download the latest builds from the [Releases page](https://github.com/draftysumo/sumotube/releases).

---

## Requirements For Building

Node.js (>= 20 recommended)
npm
Electron
Linux only: fakeroot, dpkg-dev, rpm (for .deb / .rpm)
Linux only: wine64 (if building Windows .exe on Linux)

## Compilation
### Linux

1. Install Node.js:

```sudo apt install nodejs npm```

2. Install Linux build dependencies:

```sudo apt install -y fakeroot dpkg-dev rpm```

3. Clone the repo and install dependencies:

```
git clone https://github.com/draftysumo/sumotube.git
cd sumotube
npm install
npm install electron
npm install electron-store
```

4. Test the app:

```
npm start
```

5. Package for Linux x86_64 and ARM64:

```
npm run build-linux
# or directly:
npx electron-builder build --linux deb,rpm,AppImage --x64 --arm64
```


This produces:

```
dist/SumoTube_5.1.0_amd64.deb
dist/SumoTube_5.1.0_arm64.deb
dist/SumoTube-5.1.0.x86_64.rpm
dist/SumoTube-5.1.0.aarch64.rpm
dist/SumoTube-5.1.0.AppImage
```

### Windows

1. Install Node.js (LTS):

```
https://nodejs.org/en/download
```

2. Clone repo and install dependencies (use Command Prompt, not PowerShell):

```
git clone https://github.com/draftysumo/sumotube.git
cd sumotube
npm install
npm install electron
npm install electron-store
```

3. Test the app:

```
npm start
```


4. Package Windows installer for x86_64 and ARM64:

```
npm run build-windows
# or directly:
npx electron-builder build --win nsis --x64 --arm64
```


This produces:

```
dist/SumoTube Setup 5.1.0.exe (x64)
dist/SumoTube Setup 5.1.0.exe (ARM64)
```

---

## Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/my-feature
```

3. Commit and push changes:

```bash
git commit -m "Add my feature"
git push origin feature/my-feature
```

4. Open a Pull Request.

**Guidelines:**

* Use consistent code style.
* Document new features in the README.
* Keep commits small and descriptive.

## Suggested Repository Structure

```
sumotube/
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── package.json
├── README.md
└── assets/
```
---
