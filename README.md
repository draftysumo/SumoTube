# VideoBrowser

VideoBrowser is a desktop application that organizes and displays your local video files in a grid layout, randomly shuffled each time you open the app. It automatically pulls video titles from filenames and creator names from parent folders, supports attaching custom thumbnails, and includes a search bar to quickly find videos or creators.

## What It Is

- **Randomized Grid**: Videos are displayed in a grid that shuffles randomly on every app launch, making browsing dynamic and engaging.
- **Automatic Metadata**: 
  - Titles are extracted from filenames (e.g., "Vacation.mp4" becomes "Vacation").
  - Creator names are taken from parent folder names (e.g., a folder named "HomeVideos" is the creator).
- **Custom Thumbnails**: Attach your own images (JPG, PNG) as thumbnails for any video, stored in a user-specified thumbnail directory.
- **Search Bar**: Search for videos by title or creator (parent folder name) with real-time filtering.
- **Universal Video Support**: Compatible with common video formats (e.g., MP4, MKV, AVI, MOV) supported by your system’s media player.
- **Sort and Filter**: Sort by date, size, or duration (via FFmpeg metadata extraction) alongside search functionality.
- **Pinning**: Right-click videos to pin them to the top of the grid, persisting through shuffles.
- **Local and Offline**: Runs entirely on your device, ensuring privacy and no internet dependency.
- **Cross-Platform**: Works on Windows, macOS, and Linux.
- **Lightweight**: Efficiently handles large video libraries with minimal resource use.

## Why It’s Useful

VideoBrowser offers a more interactive way to navigate local video collections compared to standard file explorers. The randomized grid refreshes the experience each time, helping you rediscover content. Automatic metadata extraction saves time by using existing file and folder names, while custom thumbnails improve visual organization. The search bar and pinning features make it easy to locate and prioritize specific videos or creators, which is especially helpful for large libraries. It’s practical for managing personal video archives, educational materials, or creative projects, providing an offline, privacy-focused way to browse media.

## Installation

### Prerequisites (Must be installed FIRST)
- **Qt 5 or Qt 6**: The application is built using the Qt framework for the GUI and cross-platform functionality.
- **FFmpeg**: Required for thumbnail generation and duration extraction. Install via:
  - **Windows**: Download from [FFmpeg official site](https://ffmpeg.org/download.html) and add `ffmpeg.exe` and `ffprobe.exe` to your PATH.
  - **macOS**: Install via Homebrew (`brew install ffmpeg`) or download from the FFmpeg site.
  - **Linux**: Install via package manager (e.g., `sudo apt install ffmpeg` on Ubuntu/Debian or `sudo dnf install ffmpeg` on Fedora).

### Install & Run
1. Download the latest release from [Releases](https://github.com/yourusername/VideoBrowser/releases).
2. Ensure FFmpeg (`ffmpeg` and `ffprobe`) is installed and accessible in your system PATH.
3. Extract and run:
   - **Windows**: `VideoBrowser.exe`
   - **macOS**: `VideoBrowser.app`
   - **Linux**: `./VideoBrowser`

## Usage

1. **Start Up**: On first launch, select your video folder(s) (e.g., `/Videos` or `C:\Media`) and an optional thumbnail folder via the dialog prompts.
2. **Browse**: View videos in a randomized grid showing titles, creator names, thumbnails, and durations.
3. **Search**: Use the search bar to filter videos by title or creator (parent folder name) in real-time.
4. **Pin Videos**: Right-click a video card to pin it to the top of the grid, keeping it prominent across shuffles.
5. **Add Thumbnails**: Store custom thumbnails (named after the video, e.g., `VideoName.png`) in the selected thumbnail directory.
6. **Play Videos**: Double-click a video to open it in your default media player.
7. **Change Folders**: Use the "Video Folder" or "Thumbnail Folder" buttons to update directories, which are saved for future sessions.

## Contributing

Fork, create a branch, and submit pull requests.

## License

GNU 3.0 Public License. See [LICENSE](LICENSE) for details.
