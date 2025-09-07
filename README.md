# Drafty's VideoBrowser

A Qt-based desktop application to browse and preview local video files with custom thumbnails and hover previews.

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

---

## Features

* Browse videos from a selected directory (`.mp4`, `.mkv`, `.avi`, `.mov`).
* Auto-generate thumbnails from the midpoint of videos.
* Support for custom thumbnail folders.
* Hover previews showing multiple frames of the video.
* Pin favorite videos for easy access.
* Search videos by title or channel name.
* Open videos in your system's default video player.

---

## How It Works

1. On first launch, select a video folder. Optionally, select a folder containing custom thumbnails.
2. The app scans the directory recursively for supported video files and generates video cards with thumbnails.
3. Hovering over a video card displays a short multi-frame preview.
4. Right-click on a video card to pin or unpin it. Pinned videos are sorted to appear first.
5. Click a video card to open the video using your system’s default video player.

---

## Requirements For Building Or Compiling

* Qt 6 or higher
* C++17 compatible compiler
* `ffmpeg` and `ffprobe` installed and accessible in system PATH (for thumbnail generation)

---

## Known Bugs / Desired Changes—Currently Being Worked On

* Separate video columns need to be closer together
* Video rows should reach the edges of the screen
* Reloading the grid causes crashes
* Pinned videos aren’t always restored when relaunching the app
* App icon twitches when running background tasks (Linux)
* App shouldn’t require a terminal window to run (Windows)

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
./VideoBrowser
```

### Windows (MinGW / Qt 6.x)

1. **Install Requirements**

   * Qt 6.x MinGW 64-bit
   * CMake
   * FFmpeg (`ffmpeg.exe` and `ffprobe.exe`)

2. **Open the Qt MinGW Command Prompt**

3. **Create Build Directory**

```cmd
cd C:\path\to\Draftys-VideoBrowser
mkdir build
cd build
```

Configure with CMake:

```cmd
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="C:/Qt/6.9.2/mingw_64"
```

Build the project:

```cmd
mingw32-make
```

Deploy Qt DLLs:

```cmd
C:\Qt\6.9.2\mingw_64\bin\windeployqt.exe VideoBrowser.exe
```

Include FFmpeg:

```cmd
Copy ffmpeg.exe and ffprobe.exe into the same folder as VideoBrowser.exe, or add them to PATH.
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
├── Main.cpp
├── README.md
├── .gitignore
└── LICENSE
```
