cmake_minimum_required(VERSION 3.16)
project(VideoBrowserApp)

set(CMAKE_CXX_STANDARD 17)

# Find required Qt6 modules, including Concurrent and Multimedia
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Concurrent Multimedia MultimediaWidgets)

# Enable Qt6 features
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Add the executable
add_executable(VideoBrowserApp main.cpp VideoPlayer.cpp VideoPlayer.h)

# Link the required Qt6 libraries
target_link_libraries(VideoBrowserApp
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Concurrent
    Qt6::Multimedia
    Qt6::MultimediaWidgets
)
