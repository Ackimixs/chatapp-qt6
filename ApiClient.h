#pragma once

#include <QObject>
#include <QNetworkReply>
#include <QDebug>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QNetworkAccessManager>

#include "ApiClient.h"

enum ApiMethod
{
    GET,
    POST,
    PUT,
    DELETE
};

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

    void fetchData(const QUrl &url, ApiMethod apiMethod = GET, const std::function<void(const QJsonDocument&)>& func = nullptr, const QByteArray& data = "") {
        qDebug() << "Fetching data from" << url;
        QNetworkRequest request(url);
        QNetworkReply *reply = nullptr;

        switch (apiMethod)
        {
            case GET:
                reply = manager->get(request);
                break;
            case POST:
                request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
                reply = manager->post(request, data);
                break;
            case PUT:
                request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
                reply = manager->put(request, data);
                break;
            case DELETE:
                reply = manager->deleteResource(request);
                break;
        }

        connect(reply, &QNetworkReply::finished, [=]() {
            if (reply->error() == QNetworkReply::NoError) {
                const QByteArray responseData = reply->readAll();
                qDebug() << "Api Response:" << responseData;

                const QJsonDocument doc = QJsonDocument::fromJson(responseData);

                if (doc.isObject())
                {
                    if (doc.object().contains("status"))
                    {
                        const auto status = QString::number(doc.object().value("status").toInt());
                        if (status.startsWith("4") || status.startsWith("5"))
                        {
                            emit errorOccurred(doc.object().value("message").toString());
                            return;
                        }
                        if (status.startsWith("2") && func != nullptr)
                        {
                            func(doc);
                        }
                    }
                }

            } else {
                qDebug() << "Error:" << reply->errorString();

                const auto doc = QJsonDocument::fromJson(reply->readAll());

                if (!doc.isNull() && doc.isObject() && doc.object().contains("statusText"))
                {
                    emit errorOccurred(doc.object().value("statusText").toString());
                    return;
                }

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
