cmake_minimum_required(VERSION 3.27)
project(chat-qt6-bun-client VERSION 0.1.3 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 COMPONENTS
        Core
        Gui
        Widgets
        Network
        WebSockets
        REQUIRED)

if(NOT Qt6_FOUND)
    # Handle the case where Qt6 is not found
    message(FATAL_ERROR "Qt6 not found. Please specify the Qt6 installation path.")
endif()

add_executable(chat-qt6-bun-client main.cpp mainwindow.cpp mainwindow.h ApiClient.cpp ApiClient.h WebSocketClient.cpp WebSocketClient.h)
target_link_libraries(chat-qt6-bun-client
        Qt::Core
        Qt::Gui
        Qt::Widgets
        Qt::Network
        Qt::WebSockets
)

