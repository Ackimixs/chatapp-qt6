#pragma once

#include <QObject>
#include <QtWebSockets/QWebSocket>
#include <QUrl>

class WebSocketClient final : public QObject {
    Q_OBJECT

public:
    explicit WebSocketClient(QObject *parent = nullptr) : QObject(parent) {
        socket = new QWebSocket();
        connect(socket, &QWebSocket::connected, this, &WebSocketClient::onConnected);
        connect(socket, &QWebSocket::disconnected, this, &WebSocketClient::onDisconnected);
        connect(socket, &QWebSocket::textMessageReceived, this, &WebSocketClient::onTextMessageReceived);
    }

    void connectTo(const QUrl &url) const
    {
        socket->open(url);
    }

    void sendText(const QString &message) const
    {
        socket->sendTextMessage(message);
    }

    void close() const
    {
        socket->close();
    }

signals:
    void connected();
    void disconnected();
    void messageReceived(const QString &message);

private slots:
    void onConnected() {
        qInfo() << "WebSocket Connected!";

        emit connected();
    }

    void onDisconnected() {
        qInfo() << "WebSocket Disconnected!";

        emit disconnected();
    }

    void onTextMessageReceived(const QString &message) {
        qInfo() << "Message received:" << message;

        emit messageReceived(message);
    }

private:
    QWebSocket *socket;
};
