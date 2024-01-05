#include <QApplication>

#include "mainwindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    MainWindow window;
    window.connectToServer("127.0.0.1", 8081); // Replace with your server IP and port

    window.show();

    return QApplication::exec();
}