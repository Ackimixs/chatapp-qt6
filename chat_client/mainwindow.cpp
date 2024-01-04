#include "mainwindow.h"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent), roomName("home") {
    socket = new QTcpSocket(this);
    connect(socket, &QTcpSocket::connected, this, &MainWindow::onConnected);
    connect(socket, &QTcpSocket::readyRead, this, &MainWindow::onReadyRead);
    connect(socket, &QTcpSocket::errorOccurred, this, &MainWindow::onErrorOccurred);

    errorLabel = new QLabel(this);
    errorLabel->setStyleSheet("QLabel { color : red; }");

    bigTextEdit = new QTextEdit(this);
    bigTextEdit->setReadOnly(true);
    bigTextEdit->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOn);
    bigTextEdit->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    smallTextEdit = new QLineEdit(this);

    sendButton = new QPushButton("Send", this);
    connect(sendButton, &QPushButton::clicked, this, &MainWindow::onSendClicked);

    auto *layout = new QVBoxLayout;
    layout->addWidget(errorLabel);
    layout->addWidget(bigTextEdit);

    auto *bottomLayout = new QHBoxLayout;
    bottomLayout->addWidget(smallTextEdit);
    bottomLayout->addWidget(sendButton);

    layout->addLayout(bottomLayout);

    auto *centralWidget = new QWidget(this);
    centralWidget->setLayout(layout);
    setCentralWidget(centralWidget);

    menuBar = new QMenuBar(this);
    menuBar->setNativeMenuBar(false);
    mainMenu = menuBar->addMenu("Main");

    auto *action4 = mainMenu->addAction("Connect to server");
    connect(action4, &QAction::triggered, this, [this]() {
        // get the ip address and the port
        auto *dialog = new QDialog(this);
        auto *dialogLayout = new QVBoxLayout(dialog);
        auto *ipLayout = new QHBoxLayout;
        auto *ipLabel = new QLabel("IP Address", dialog);
        auto *ipEdit = new QLineEdit(dialog);
        ipLayout->addWidget(ipLabel);
        ipLayout->addWidget(ipEdit);
        dialogLayout->addLayout(ipLayout);

        auto *portLayout = new QHBoxLayout;
        auto *portLabel = new QLabel("Port", dialog);
        auto *portEdit = new QLineEdit(dialog);
        portLayout->addWidget(portLabel);
        portLayout->addWidget(portEdit);
        dialogLayout->addLayout(portLayout);

        auto *button = new QPushButton("Connect", dialog);
        connect(button, &QPushButton::clicked, dialog, [this, dialog, ipEdit, portEdit]() {
            socket->disconnectFromHost();

            if (socket->state() == QAbstractSocket::UnconnectedState || socket->waitForDisconnected(5000)) {
                socket->connectToHost(ipEdit->text(), portEdit->text().toInt());
                errorLabel->setText("");
            } else {
                this->displayError("Could not disconnect from host");
            }

            dialog->close();
        });
        dialogLayout->addWidget(button);

        dialog->setLayout(dialogLayout);
        dialog->show();
    });

    auto *action5 = mainMenu->addAction("Quit");
    connect(action5, &QAction::triggered, this, [this]() {
        this->close();
    });


    chatroomMenu = menuBar->addMenu("ChatRoom");

    auto *action = chatroomMenu->addAction("Create ChatRoom");
    connect(action, &QAction::triggered, this, [this]() {
        bool ok;
        QString text = QInputDialog::getText(this, tr("Create ChatRoom"),
                                             tr("ChatRoom name:"), QLineEdit::Normal,
                                             "", &ok);
        if (ok && !text.isEmpty()) {
            this->sendMessage("create " + text);
        }
    });

    auto *action2 = chatroomMenu->addAction("Join ChatRoom");
    connect(action2, &QAction::triggered, this, [this]() {
        bool ok;
        QString text = QInputDialog::getText(this, tr("Join ChatRoom"),
                                             tr("ChatRoom name:"), QLineEdit::Normal,
                                             "", &ok);
        if (ok && !text.isEmpty()) {
            this->sendMessage("join " + text);
        }
    });

    auto *action3 = chatroomMenu->addAction("List of ChatRooms");
    connect(action3, &QAction::triggered, this, [this]() {
        this->sendMessage("list");
    });

    setMenuBar(menuBar);

    resize(600, 400);

    errorDisplayTimer = new QTimer(this);

    connect(errorDisplayTimer, &QTimer::timeout, this, &MainWindow::removeDisplayedError);
}
