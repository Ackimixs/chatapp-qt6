#pragma once

#include <QObject>
#include <QNetworkReply>
#include <QDebug>

class ApiClient : public QObject {
    Q_OBJECT

public:
    struct EndpointsMap
    {
        QString createRoom = "/api/room/create";
        QString joinRoom = "/api/room/join";
        QString leaveRoom = "/api/room/leave";
        QString listRooms = "/api/room/list";
        QString historyRoom = "/api/room/history";
    } endpoints;


    explicit ApiClient(QObject *parent = nullptr) : QObject(parent) {
        manager = new QNetworkAccessManager(this);
    }

    void fetchData(const QUrl &url, const std::function<void(const QString&)>& func = nullptr) {
        qInfo() << "Fetching data from" << url;
        const QNetworkRequest request(url);
        QNetworkReply *reply = manager->get(request);

        connect(reply, &QNetworkReply::finished, [=]() {
            if (reply->error() == QNetworkReply::NoError) {
                const QByteArray responseData = reply->readAll();
                qInfo() << "Response:" << responseData;

                if (responseData.startsWith("error"))
                {
                    emit errorOccurred(responseData);
                }
                else if (func != nullptr)
                {
                    func(responseData);
                }

            } else {
                qInfo() << "Error:" << reply->errorString();
                emit errorOccurred(reply->errorString());
            }

            reply->deleteLater();
        });
    }

signals:
    void dataReceived(const QByteArray &data);
    void errorOccurred(const QString &error);

private:
    QNetworkAccessManager *manager;
};