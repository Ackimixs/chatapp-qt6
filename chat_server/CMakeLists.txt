cmake_minimum_required(VERSION 3.27)
project(chat_server)

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

add_executable(chat_server main.cpp)
target_link_libraries(chat_server
        Qt::Core
        Qt::Gui
        Qt::Widgets
        Qt::Network
)

