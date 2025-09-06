# Drafty's VideoBrowser

A Qt-based desktop application to browse, preview, and play local video files with custom thumbnails and hover previews.

---

## Features

* Browse videos from a selected directory (`.mp4`, `.mkv`, `.avi`, `.mov`).
* Auto-generate thumbnails from the midpoint of videos.
* Support for custom thumbnail folders.
* Hover previews showing multiple frames of the video.
* Pin favorite videos for easy access.
* Search videos by title or channel name.
* Full-featured video player with:

  * Play/Pause
  * Skip forward/backward (10s)
  * Mute/Unmute
  * Volume control
  * Playback speed control
  * Fullscreen toggle

---

## How It Works

1. On first launch, select a video folder. Optionally, select a folder containing custom thumbnails.
2. The app scans the directory recursively for supported video files and generates video cards with thumbnails.
3. Hovering over a video card displays a short multi-frame preview.
4. Right-click on a video card to pin or unpin it. Pinned videos are sorted to appear first.
5. Click a video card to open the built-in video player with full playback controls.

---

## Requirements For Building Or Compiling

* Qt 6 or higher
* C++17 compatible compiler
* `ffmpeg` and `ffprobe` installed and accessible in system PATH

---

## Compilation

1. Clone the repository:

```bash
git clone https://github.com/draftysumo/draftys-videobrowser.git
cd video-browser
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

*Coming soon.*

---

### Suggested Repository Structure

```
video-browser/
├── Main.cpp
├── VideoPlayer.h
├── VideoPlayer.cpp
├── README.md
├── .gitignore
└── LICENSE
```
