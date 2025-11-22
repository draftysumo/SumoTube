<div align="center">

<img width="250" height="250" alt="icon" src="https://github.com/user-attachments/assets/20c2ea77-1635-4e91-a8b0-bfda531c0e9a" />


# SumoTube

**A no-fuss, offline video browser for Windows, Linux, and eventually Android TV**  
Browse and preview all your local videos — all in a clean, minimal UI.

[![Downloads](https://img.shields.io/github/downloads/draftysumo/SumoTube/total?style=for-the-badge&color=4CAF50)](https://github.com/draftysumo/SumoTube/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue?style=for-the-badge)](#)
![Built with Electron](https://img.shields.io/badge/Built%20With-Electron-gray?style=for-the-badge&logo=electron)
[![License](https://img.shields.io/github/license/draftysumo/SumoTube?style=for-the-badge&color=orange)](LICENSE)

### [⬇️ Install](https://github.com/draftysumo/sumotube/releases)
### [👷 Contribute](#contributing)

---

<img width="1920" height="1032" alt="Screenshot from 2025-10-11 12-02-38" src="https://github.com/user-attachments/assets/b79323c7-e935-4e22-8699-5c0ffa2cf3e5" />
<img width="1920" height="1032" alt="Screenshot from 2025-10-11 12-03-04" src="https://github.com/user-attachments/assets/88c0e6da-0041-4682-90a3-178fbbe7ce9c" />
<img width="1920" height="1032" alt="Screenshot from 2025-10-26 18-56-33" src="https://github.com/user-attachments/assets/57eec449-c8e5-4f22-a058-acee4918294c" />

</div>

## Table of Contents

* [Features](#features)
* [Future Additions](#planned-implementations)
* [UI Components](#ui-components)
* [How It Works](#how-it-works)
* [Download](#download)
* [Compilation](#compilation)
  * [Linux](#linux)
  * [Windows](#windows)
* [Contributing](#contributing)
* [Legal](#license)

---

## Features

* **Local Video Browsing:** Recursively scans folders for video files (`.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.flv`, `.ogg`) and displays them as cards.
* **Custom Thumbnails:** Supports sidecard images (`.jpg`, `.jpeg`, `.png`, `.webp`) with the same base filename. You can also assign custom thumbnails manually.
* **Hover Previews:** Hovering over a video thumbnail plays a looping video preview.
* **Duration Display:** Each video shows its runtime in a rounded pill overlay.
* **Pin Videos:** Right-click a video to pin or unpin it. Pinned videos always appear at the start of the grid, regardless of sort mode.
* **Random Home Page:** Default random shuffle to mimic algorithmic rediscovery.
* **Sorting Options:** Sort by random, title (asc/desc), or artist (asc/desc).
* **Search:** Filter by video title or artist name in real time.
* **Artist View:** Navigate into an artist (parent folder) page, set profile pictures, and edit artist bios.
* **Playlists:** Full playlist creation and management.
* **Resizable Layout:** Responsive grid that adapts to window size.
* **Open Videos:** Click a card to open the video in your system’s default player.
* **Controller Support:** Navigate the grid ui with a controller when you are away from your mouse. Great for Laptop-to-TV setups. (WIP)

---

## Planned Implementations
* Theme picker with custom themes
* App sound effects (sfx)
* Built in youtube downloader (yt-dlp gui built in)
* FULL Controller support (for navigating when Away. From. Keyboard)
* Android TV Build
* Ported to Flatpak

---

## UI Components

* **Top Bar**

  * Search bar for quick filtering.
  * Sort selector (random, title, artist).
  * Buttons to change folder or refresh.
* **Video Grid**

  * Thumbnail, title, artist, duration pill, pin icon.
  * Hover to preview video.
  * Double click to play.
* **Sidebar**

  * Lists artists (folders) & playlists with video counts.
  * Click an artist to open their dedicated page.
  * Click a playlist to open it's page.
* **Artist & Playlist Page**
  
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
7. Custom thumbnails, playlists and artist bios are saved persistently in local storage.
8. Opening a video launches it with the system’s default video player.

---

## Download

Download the latest version from the [Releases page](https://github.com/draftysumo/sumotube/releases).

---

## Requirements For Building

- Node.js (>= 20 recommended)
- npm
- Electron
- Linux only: fakeroot, dpkg-dev, rpm (for .deb / .rpm)

## Compilation
### Linux

1. Install Node.js & npm:

```
sudo apt install nodejs npm
```

2. Install Linux build dependencies:

```
sudo apt install -y fakeroot dpkg-dev rpm
```

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

### Windows

1. Install Node.js (LTS): ```https://nodejs.org/en/download```

2. Clone repo and install dependencies (use Command Prompt as Admin, not PowerShell):

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
npm run build-win
# or directly:
npx electron-builder build --win nsis --x64 --arm64
```


This produces:

```
dist/SumoTube-Setup-X.X.X-arm64.exe
dist/SumoTube-Setup-X.X.X-x64.exe
dist/SumoTube-Setup-X.X.X.exe (delete this one, its identical to the x64 version. -will fix soon so this doesnt appear)
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
* Use the same or less amount of GenAI as the Me.

## Suggested Repository Structure

```
sumotube/
├── node_modules/
├── assets/
|    └──icons/
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── styles.css
```

---

## License
### Gnu Public License v3.0 (GPL-30)
The GNU General Public License v3.0 (GPL-3.0) is a copyleft open-source license that allows anyone to use, modify, and distribute software freely, as long as any derivative works are also released under the same license. It ensures that the source code remains accessible, prevents the addition of DRM or patent restrictions, and prohibits hardware or software measures that would block modified versions from running, thereby guaranteeing that users always retain the freedom to study, change, and share the software.

---

## Transparent GenAI Use Summary/Guidelines
### Total Code Generated: ~20-30%
Generative AI has been used to clean up, smarten or fix code within this app. It has also been used for documentation & organising code. Majority of this app will always be coded by me or other contributors and not generated by AI or ML.
