#ifndef MAINWINDOW_H
#define MAINWINDOW_H

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

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);

    void displayToTextedit()
    {
        QString text = "";

        for (const auto message : messages) {
            text += *message + "\n";
        }

        bigTextEdit->setText(text);

    }

private slots:
    void onSendClicked()
    {
        const QString text = smallTextEdit->text();

        smallTextEdit->clear();

        if (text.isEmpty()) {
            return;
        }

        this->sendMessage(QString("message %1 %2").arg(roomName).arg(text).toUtf8());

        messages.append(new QString(text));

        this->displayToTextedit();
    }

    void onConnected() {
        qInfo() << "Connected to server!";

        this->sendMessage("join " + roomName);
    }

    void onReadyRead() {
        QByteArray data = socket->readAll();
        qInfo() << "Received message:" << QString::fromUtf8(data);
        handleMessage(QString::fromUtf8(data));
    }

    void onErrorOccurred(QAbstractSocket::SocketError socketError) {
        qInfo() << "Error occurred:" << socketError;
        this->displayError(socketError == QAbstractSocket::ConnectionRefusedError ? "Connection refused" : "Unknown error");
    }

    void removeDisplayedError()
    {
        errorLabel->setText("");
        errorDisplayTimer->stop();

    }

public slots:
        void connectToServer(const QString &ipAddress, quint16 port) {
            socket->connectToHost(ipAddress, port);
       }

        void sendMessage(const QString &message) {
            socket->write(message.toUtf8());
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

    void handleMessage(const QString &message) {
        if (message.startsWith("room")) {
            roomName = message.split(" ")[1];
            this->setWindowTitle(QString("Chatroom : " + roomName));
            messages.clear();
            this->displayToTextedit();
        }

        else if (message.startsWith("message"))
        {
            messages.append(new QString(message.split(" ").mid(1).join(" ")));
            displayToTextedit();
        }

        else if (message.startsWith("error"))
        {
            const auto mes = message.split(" ").mid(1).join(" ");
            displayError(mes);
        }

        else if (message.startsWith("list"))
        {
            const auto listOfChatroom = message.split("\n");
            listChatrooms(listOfChatroom.mid(1, listOfChatroom.size() - 2));
        }
    }

    void listChatrooms(const QStringList& list)
    {
        auto *listWidget = new QDialog(this);

        auto *layout = new QVBoxLayout(listWidget);

        for (const auto& room : list) {
            auto *button = new QPushButton(room, listWidget);
            connect(button, &QPushButton::clicked, this, [this, room, listWidget]() {
                this->sendMessage("join " + room);
                listWidget->close();
            });
            layout->addWidget(button);
        }

        listWidget->setLayout(layout);

        listWidget->show();
    }

    void displayError(const QString& error, const int& time = 3000)
    {
        errorLabel->setText(error);
        errorDisplayTimer->start(time);
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

    QTcpSocket *socket;

    QList<QString *> messages;

    QString roomName;
};

#endif // MAINWINDOW_H
