#pragma once

#include <QApplication>
#include <QMainWindow>
#include <QTextEdit>
#include <QPushButton>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QInputDialog>
#include <QLabel>
#include <QTimer>
#include <QDialog>
#include <QMenuBar>

#include "ApiClient.h"
#include "WebSocketClient.h"

class MainWindow final : public QMainWindow {
    Q_OBJECT

public:
    MainWindow(QString  ip, qint16 port, QWidget *parent = nullptr);

    void displayToTextedit()
    {
        QString text = "";

        for (const auto message : messages) {
            text += *message + "\n";
        }

        bigTextEdit->setText(text);

    }

    [[nodiscard]] QString getId() const
    {
        return id;
    }

private slots:
    void onSendClicked()
    {
        const QString text = smallTextEdit->text();

        smallTextEdit->clear();

        if (text.isEmpty()) {
            return;
        }
        if (text.size() > 256) {
            this->displayError("Message too long");
            return;
        }

        this->sendMessage(QString("message %1").arg(text).toUtf8());

        bigTextEdit->append(QString(text));
    }

    void onConnected() const
    {
        qInfo() << "Connected to server!";
    }

    void onDisconnected() const
    {
        qInfo() << "Disconnected from server!";
    }

    void removeDisplayedError() const
    {
        errorLabel->setText("");
        errorDisplayTimer->stop();
    }

public slots:
    void connectToServer() const
    {
        QUrl wsUrl = serverUrl;
        wsUrl.setScheme("ws");
        wsUrl.setPath("/ws");

        wsClient->connectTo(wsUrl);
   }

    void sendMessage(const QString &message) const
    {
        wsClient->sendText(message);
    }

    void handleMessage(const QString &message) {
        if (message.startsWith("message"))
        {
            this->bigTextEdit->append(QString(message.split(" ").mid(1).join(" ")));
        }
        else if (message.startsWith("id"))
        {
            id = message.split(" ")[1];

            QUrl toFetch = serverUrl;
            toFetch.setScheme("http");
            toFetch.setPath(this->apiClient->endpoints.joinRoom);

            QJsonObject body;
            body.insert("name", "home");
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
    }

    void onErrorOccurred(const QString& error) const
    {
        qInfo() << "Error occurred:" << error;
        this->displayError(error);
    }

protected:
    void keyPressEvent(QKeyEvent *event) override
    {
        if (event->key() == Qt::Key_Return || event->key() == Qt::Key_Enter) {
            onSendClicked();
        } else {
            QMainWindow::keyPressEvent(event);
        }
    };

    void listChatrooms(const int& page = 0, const int& limit = 10)
    {

        QUrl toFetch = serverUrl;
        toFetch.setScheme("http");
        toFetch.setPath(this->apiClient->endpoints.listRooms);
        toFetch.setQuery("page=" + QString::number(page) + "&limit=" + QString::number(limit));

        this->apiClient->fetchData(toFetch, GET, [this, page, limit](const QJsonDocument& data)
        {
            QStringList roomsList = {};
            int total = 0;

            if (data.isObject())
            {
                auto dataObj = data.object();
                if (dataObj.contains("body") && dataObj.value("body").isObject() && dataObj.value("body").toObject().contains("rooms"))
                {
                    const auto rooms = dataObj.value("body").toObject().value("rooms");
                    if (rooms.isArray())
                    {
                        auto roomsArray = rooms.toArray();
                        for (const auto& room : roomsArray)
                        {
                            if (room.isObject() && room.toObject().contains("name"))
                            {
                                roomsList.append(room.toObject().value("name").toString());
                            }
                        }

                        if (dataObj.value("body").toObject().contains("roomsNumber"))
                        {
                            total = dataObj.value("body").toObject().value("roomsNumber").toInt();
                        }
                    }
                }
            }

            auto *listWidget = new QDialog(this);
            listWidget->setWindowTitle("List of Chatrooms");
            auto *layout = new QVBoxLayout(listWidget);

            auto *label = new QLabel("Chatrooms | page " + QString::number(page + 1) + " / " + QString::number(total / limit + 1));
            layout->addWidget(label);

            for (const auto& room : roomsList) {
                auto *button = new QPushButton(room, listWidget);
                connect(button, &QPushButton::clicked, this, [this, room, listWidget]() {
                    if (roomName != room)
                    {

                        QUrl toFetch = serverUrl;
                        toFetch.setScheme("http");
                        toFetch.setPath(this->apiClient->endpoints.joinRoom);

                        QJsonObject body;
                        body.insert("name", room);
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
                    listWidget->close();
                });

                layout->addWidget(button);
            }

            const auto pageLayout = new QHBoxLayout();
            const auto previousPageButton = new QPushButton("<", listWidget);
            const auto nextPageButton = new QPushButton(">", listWidget);

            if (page == 0)
            {
                previousPageButton->setEnabled(false);
            } else
            {
                connect(previousPageButton, &QPushButton::clicked, this, [this, listWidget, page, limit]()
                {
                    listWidget->close();
                    this->listChatrooms(page - 1, limit);
                });
            }

            if (page * limit + limit >= total)
            {
                nextPageButton->setEnabled(false);
            } else
            {
                connect(nextPageButton, &QPushButton::clicked, this, [this, listWidget, page, limit]()
                {
                    listWidget->close();
                    this->listChatrooms(page + 1, limit);
                });
            }

            pageLayout->addWidget(previousPageButton);
            pageLayout->addWidget(nextPageButton);
            layout->addLayout(pageLayout);

            listWidget->setLayout(layout);

            listWidget->show();
        });
    }

    void displayError(const QString& error, const int& time = 3000) const
    {
        errorLabel->setText(error);
        errorDisplayTimer->start(time);
    }

    void roomChanged(const QString& room)
    {
        roomName = room;
        this->setWindowTitle(QString("Chatroom : " + roomName));

        QUrl toFetch = serverUrl;
        toFetch.setScheme("http");
        toFetch.setPath(this->apiClient->endpoints.historyRoom);
        toFetch.setQuery("name=" + roomName);

        this->apiClient->fetchData(toFetch, GET, [this](const QJsonDocument& history)
        {
            if (history.isObject())
            {
                auto obj = history.object();
                if (obj.contains("body") && obj.value("body").isObject() && obj.value("body").toObject().contains("messages"))
                {
                    const auto messages = obj.value("body").toObject().value("messages");
                    if (messages.isArray())
                    {
                        auto messageArray = messages.toArray();
                        this->messages.clear();
                        for (const auto& message : messageArray)
                        {
                            if (message.isObject() && message.toObject().contains("content"))
                            {
                                this->bigTextEdit->append(message.toObject().value("content").toString());
                            }
                        }
                        this->bigTextEdit->append("------- You joined the chatroom : " + roomName + " -------");
                    }
                }
            }
        });
    }

private:
    QTextEdit *bigTextEdit;
    QLineEdit *smallTextEdit;
    QPushButton *sendButton;
    QMenuBar *menuBar;
    QMenu *chatroomMenu;
    QMenu *mainMenu;
    QLabel *errorLabel;
    QTimer *errorDisplayTimer;

    QList<QString *> messages;

    QString roomName;

    ApiClient *apiClient;
    WebSocketClient *wsClient;

    QString id;

    QString ipAddress;
    quint16 port;
    QUrl serverUrl;
};
