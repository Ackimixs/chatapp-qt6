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
        connect(socket, &QWebSocket::errorOccurred, this, &WebSocketClient::onErrorOccurred);
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
    void errorOccurred(const QString &error);

private slots:
    void onConnected() {
        qDebug() << "WebSocket Connected!";

        emit connected();
    }

    void onDisconnected() {
        qDebug() << "WebSocket Disconnected!";

        emit disconnected();
    }

    void onTextMessageReceived(const QString &message) {
        qDebug() << "Message received:" << message;

        emit messageReceived(message);
    }

    void onErrorOccurred(QAbstractSocket::SocketError error) {
        qDebug() << "Error occurred:" << error;

        emit errorOccurred(socket->errorString());
    }

private:
    QWebSocket *socket;
};
