#include <QApplication>

#include "mainwindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    if (argc != 3) {
        qInfo() << "Usage: ./chat-qt6-bun-client <ip> <port>";
        return 1;
    }

    MainWindow window(argv[1], std::atoi(argv[2]));
    window.connectToServer();

    window.show();

    return QApplication::exec();
}