cmake_minimum_required(VERSION 3.16)
project(Draftys-VideoBrowser)

set(CMAKE_CXX_STANDARD 17)

# Only need Core, Gui, Widgets, Concurrent
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Concurrent)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

add_executable(Draftys-VideoBrowser main.cpp)

set_target_properties(Draftys-VideoBrowser PROPERTIES
    WIN32_EXECUTABLE TRUE
)

if(WIN32)
    set(CMAKE_WIN32_EXECUTABLE ON)
endif()

target_link_libraries(Draftys-VideoBrowser
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Concurrent
)
