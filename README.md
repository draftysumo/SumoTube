# Drafty's VideoBrowser

A Qt-based desktop application to browse and preview local video files with custom thumbnails, hover previews, and pinning support.

## Table of Contents

* [Features](#features)
* [How It Works](#how-it-works)
* [Requirements For Building Or Compiling](#requirements-for-building-or-compiling)
* [Compilation](#compilation)

  * [Linux](#linux)
  * [Windows (MinGW / Qt 6.x)](#windows-mingw--qt-6x)
* [Contributing](#contributing)
* [Installation (Downloading Build)](#installation-downloading-build)
* [Suggested Repository Structure](#suggested-repository-structure)

## Features

* **Local Video Browsing:** Scan a folder recursively for video files (`.mp4`, `.mkv`, `.avi`, `.mov`) and display them as clickable video cards.
* **Custom Thumbnails:** Supports custom thumbnail images stored in a separate folder. If no custom thumbnail exists, it generates one from the video automatically.
* **Hover Previews:** Hovering over a video shows a short frame sequence preview extracted from the video.
* **Duration Display:** Each video shows its total duration on a pill-style overlay.
* **Pin Videos:** Pin videos to keep them at the top of the grid. Right-click on a video to pin or unpin.
* **Dynamic Sorting:** Change the sort order instantly using the sort dropdown without reloading:

  * **Home:** Pinned videos first, others shuffled (default).
  * **Title A-Z / Z-A**
  * **Channel A-Z**
  * **Duration ↑ / ↓**
* **Search:** Filter videos by title or channel dynamically as you type.
* **Resizable Layout:** Video grid adjusts to window size with scroll support, keeping consistent spacing between cards.
* **Open Videos:** Click a video card to open it in the system's default video player.

## UI Components

* **Top Bar:**

  * Search bar for filtering videos.
  * Buttons to change the video folder and custom thumbnail folder.
  * Reload button to refresh videos.
  * Sort dropdown to select the desired sort mode.
* **Video Grid:** Displays video cards with thumbnail, title, channel, duration, and pinned state. Scrollable when content exceeds window size.

## Notes

* Hover preview and thumbnail generation require **FFmpeg** and **FFprobe** installed on your system.
* Pinned videos are preserved across sessions using `QSettings`.
* Vertical spacing between video rows is fixed to ensure a consistent grid layout, regardless of window height.

---

## How It Works

1. On first launch, select a video folder. Optionally, select a folder containing custom thumbnails.
2. The app scans the directory recursively for supported video files and generates video cards with thumbnails.
3. Hovering over a video card displays a short multi-frame preview. Frames are generated asynchronously and cached.
4. Right-click on a video card to pin or unpin it. Pinned videos always appear at the start of the grid.
5. Search dynamically filters videos by title or channel name.
6. Click a video card to open the video using your system’s default video player.
7. Reloading the video folder refreshes all thumbnails and hover previews safely without crashes.

---

## Requirements For Building Or Compiling

* Qt 6 or higher
* C++17 compatible compiler
* `ffmpeg` and `ffprobe` installed and accessible in system PATH (for thumbnail generation)
* CMake (for building cross-platform)

---

## Compilation

### Linux

1. Clone the repository:

```bash
git clone https://github.com/draftysumo/draftys-videobrowser.git
cd draftys-videobrowser
```

2. Create a build directory and run:

```bash
mkdir build && cd build
cmake ..
make -j$(nproc)
```

3. Run the application:

```bash
./VideoBrowserApp
```

### Windows (MinGW / Qt 6.x)

1. **Install Requirements**

   * Qt 6.x MinGW 64-bit
   * CMake
   * FFmpeg (`ffmpeg.exe` and `ffprobe.exe`)
   * Draftys-VideoBrowser source code

2. **Unzip the source code** .zip file, then **open the Qt MinGW Command Prompt** and navigate (cd) into the **project directory** (c:\users\user\downloads)

3. **Create Build Directory**

```cmd
mkdir build
cd build
```

4. Configure with CMake:

```cmd
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="C:/Qt/6.9.2/mingw_64"
```

5. Build the project:

```cmd
mingw32-make
```

6. Deploy Qt DLLs:

```cmd
C:\Qt\6.9.2\mingw_64\bin\windeployqt.exe VideoBrowserApp.exe
```

7. Include FFmpeg:

```cmd
Copy ffmpeg.exe and ffprobe.exe into the same folder as VideoBrowserApp.exe, or add them to PATH.
```

---

## Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Make changes, commit with clear messages:

```bash
git commit -am "Add feature description"
```

4. Push to your branch:

```bash
git push origin feature/your-feature
```

5. Open a Pull Request to merge your changes into `main`.

**Guidelines:**

* Use clear, consistent code formatting.
* Document new functionality in the README.
* Keep commits atomic and descriptive.
* Ensure `ffmpeg` commands work on all platforms.

---

## Installation (Downloading Build)

[Download Latest Release](https://github.com/draftysumo/draftys-videobrowser/releases)

---

### Suggested Repository Structure

```
video-browser/
├── main.cpp
├── README.md
├── CMakeLists.txt
└── LICENSE
```
