cmake_minimum_required(VERSION 3.27)
project(server)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

set(CMAKE_PREFIX_PATH "/usr/lib64")

find_package(Qt6 COMPONENTS
        Core
        Gui
        Widgets
        Network
        REQUIRED)

file(GLOB_RECURSE SOURCES
        "*.cpp"
)

add_executable(server ${SOURCES})
target_link_libraries(server
        Qt::Core
        Qt::Gui
        Qt::Widgets
        Qt::Network
)

