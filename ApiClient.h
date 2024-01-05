#pragma once

#include <QObject>
#include <QNetworkReply>
#include <QDebug>

class ApiClient : public QObject {
    Q_OBJECT

public:
    explicit ApiClient(QObject *parent = nullptr) : QObject(parent) {
        manager = new QNetworkAccessManager(this);
    }

    void fetchData(const QUrl &url, const std::function<void(const QString&)>& func = nullptr) {
        qInfo() << "Fetching data from" << url;
        QNetworkRequest request(url);
        QNetworkReply *reply = manager->get(request);

        connect(reply, &QNetworkReply::finished, [=]() {
            if (reply->error() == QNetworkReply::NoError) {
                QByteArray responseData = reply->readAll();
                qInfo() << "Response:" << responseData;
                if (func != nullptr)
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