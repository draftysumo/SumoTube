cmake_minimum_required(VERSION 3.16)
project(VideoBrowserApp)

set(CMAKE_CXX_STANDARD 17)

# Only need Core, Gui, Widgets, Concurrent
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Concurrent)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

add_executable(VideoBrowserApp main.cpp)

target_link_libraries(VideoBrowserApp
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Concurrent
)
