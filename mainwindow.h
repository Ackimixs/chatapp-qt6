#pragma once

#include <QApplication>
#include <QMainWindow>
#include <QTextEdit>
#include <QPushButton>
#include <QHBoxLayout>
#include <QTcpSocket>
#include <QKeyEvent>
#include <QMenu>
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

        this->sendMessage(QString("message %1").arg(text).toUtf8());

        messages.append(new QString(text));

        this->displayToTextedit();
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
            messages.append(new QString(message.split(" ").mid(1).join(" ")));
            displayToTextedit();
        }
        else if (message.startsWith("id"))
        {
            id = message.split(" ")[1];

            QUrl toFetch = serverUrl;
            toFetch.setScheme("http");
            toFetch.setPath(this->apiClient->endpoints.joinRoom);
            toFetch.setQuery("id=" + this->getId() + "&name=home");

            this->apiClient->fetchData(toFetch, [this](const QString& data)
            {
                roomChanged(data.split(" ")[2]);
            });
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

    void listChatrooms(const QStringList& list)
    {
        auto *listWidget = new QDialog(this);

        auto *layout = new QVBoxLayout(listWidget);

        for (const auto& room : list) {
            auto *button = new QPushButton(room, listWidget);
            connect(button, &QPushButton::clicked, this, [this, room, listWidget]() {
                if (roomName != room)
                {

                    QUrl toFetch = serverUrl;
                    toFetch.setScheme("http");
                    toFetch.setPath(this->apiClient->endpoints.joinRoom);
                    toFetch.setQuery("name=" + room + "&id=" + this->getId());

                    this->apiClient->fetchData(toFetch, [this](const QString& data)
                    {
                        roomChanged(data.split(" ")[2]);
                    });
                }
                listWidget->close();
            });
            layout->addWidget(button);
        }

        listWidget->setLayout(layout);

        listWidget->show();
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

        this->apiClient->fetchData(toFetch, [this](const QString& history)
        {
            this->messages.clear();
            auto d = history.split("\n");
            d.pop_back();
            for (const auto& message : d)
            {
                this->messages.append(new QString(message));
            }
            this->messages.append(new QString("------- You joined the chatroom"));
            this->displayToTextedit();
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
