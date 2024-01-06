#include "mainwindow.h"

#include <utility>

MainWindow::MainWindow(QString ip, qint16 port, QWidget *parent) : QMainWindow(parent), roomName("home"), ipAddress(std::move(ip)), port(port) {
    serverUrl = QUrl();
    serverUrl.setHost(ipAddress);
    serverUrl.setPort(port);

    apiClient = new ApiClient();
    wsClient = new WebSocketClient();
    connect(wsClient, &WebSocketClient::connected, this, &MainWindow::onConnected);
    connect(wsClient, &WebSocketClient::disconnected, this, &MainWindow::onDisconnected);
    connect(wsClient, &WebSocketClient::messageReceived, this, &MainWindow::handleMessage);
    connect(wsClient, &WebSocketClient::errorOccurred, this, &MainWindow::onErrorOccurred);

    connect(apiClient, &ApiClient::errorOccurred, this, &MainWindow::onErrorOccurred);

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
            wsClient->close();

            const QString newIp = ipEdit->text();
            const QString newPort = portEdit->text();

            this->ipAddress = newIp;
            this->port = newPort.toInt();
            this->serverUrl.setHost(this->ipAddress);
            this->serverUrl.setPort(this->port);

            this->connectToServer();

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

            if (text.size() > 20)
            {
                this->displayError("Chatroom name cannot be longer than 20 characters");
                return;
            }
            for (const auto& c : text)
            {
                if (!c.isLetterOrNumber())
                {
                    this->displayError("Chatroom name can only contain letters and numbers");
                    return;
                }
            }

            QUrl toFetch = serverUrl;
            toFetch.setScheme("http");
            toFetch.setPath(this->apiClient->endpoints.createRoom);

            QJsonObject body;
            body.insert("name", text);
            body.insert("id", this->getId());

            this->apiClient->fetchData(toFetch, POST, [this](const QJsonDocument& data)
            {
                if (data.isObject())
                {
                    const auto dataObj = data.object();
                    if (dataObj.contains("body") && dataObj.value("body").isObject())
                    {
                        const auto dataBody = dataObj.value("body").toObject();
                        if (dataBody.contains("room"))
                        {
                            roomChanged(dataBody.value("room").toString());
                        }
                    }
                }
            }, QJsonDocument(body).toJson());
        }
    });

    const auto *action2 = chatroomMenu->addAction("Join ChatRoom");
    connect(action2, &QAction::triggered, this, [this]() {
        bool ok;
        const QString text = QInputDialog::getText(this, tr("Join ChatRoom"),
                                                   tr("ChatRoom name:"), QLineEdit::Normal,
                                                   "", &ok);
        if (ok && !text.isEmpty()) {

            QUrl toFetch = serverUrl;
            toFetch.setScheme("http");
            toFetch.setPath(this->apiClient->endpoints.joinRoom);

            QJsonObject body;
            body.insert("name", text);
            body.insert("id", this->getId());

            this->apiClient->fetchData(toFetch, POST, [this](const QJsonDocument& data)
            {
                if (data.isObject())
                {
                    const auto dataObj = data.object();
                    if (dataObj.contains("body") && dataObj.value("body").isObject())
                    {
                        const auto dataBody = dataObj.value("body").toObject();
                        if (dataBody.contains("room"))
                        {
                            roomChanged(dataBody.value("room").toString());
                        }
                    }
                }
            }, QJsonDocument(body).toJson());
        }
    });

    auto *action3 = chatroomMenu->addAction("List of ChatRooms");
    connect(action3, &QAction::triggered, this, [this]() {

        this->listChatrooms(0, 10);

    });

    setMenuBar(menuBar);

    resize(600, 400);

    errorDisplayTimer = new QTimer(this);

    connect(errorDisplayTimer, &QTimer::timeout, this, &MainWindow::removeDisplayedError);
}
