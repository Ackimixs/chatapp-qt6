#include <QTcpServer>
#include <QTcpSocket>
#include <QList>
#include <QTextStream>
#include <QDebug>
#include <QCoreApplication>

enum ChatRoomType
{
    Public,
    Private
};

struct ChatRoom
{
    QString name;
    ChatRoomType type;
    QString password;
    QList<QTcpSocket *> clients;
};

class ChatServer : public QTcpServer {
    Q_OBJECT

public:
    explicit ChatServer(QObject *parent = nullptr) : QTcpServer(parent) {
        connect(this, &ChatServer::newConnection, this, &ChatServer::onNewConnection);
    }

    void createRoom(const QString& name)
    {
        auto* room = new ChatRoom();
        room->name = name;
        room->type = ChatRoomType::Public;
        room->password = "";
        chatrooms.insert(name, room);
    }

private slots:
    void onNewConnection() {
        qInfo() << "New connection!";
        QTcpSocket *clientSocket = nextPendingConnection();
        clients.append(clientSocket);

        connect(clientSocket, &QTcpSocket::readyRead, this, [clientSocket, this]() {
            QString message = QString::fromUtf8(clientSocket->readAll());
            handleMessage(message, clientSocket);
            qInfo() << "Received message:" << message;
        });

        connect(clientSocket, &QTcpSocket::disconnected, this, [clientSocket, this]() {
            clients.removeOne(clientSocket);
            for (const auto room : chatrooms) {
                room->clients.removeOne(clientSocket);
            }
            clientSocket->deleteLater();
            qInfo() << "Deletibg client socket";
        });
    }

private:
    QList<QTcpSocket *> clients;

    QMap<QString, ChatRoom *> chatrooms;

    void broadcastMessage(const QString &message, const QTcpSocket *senderSocket, const QString& roomId) {
        ChatRoom* room = chatrooms[roomId];

        if (room == nullptr) {
            return;
        }

        for (QTcpSocket *socket : room->clients) {
            if (socket != senderSocket && socket->state() == QAbstractSocket::ConnectedState) {
                QString d = "message " + message;
                socket->write(d.toUtf8());
                socket->flush();
            }
        }
    }

    void handleMessage(const QString &message, QTcpSocket *senderSocket) {
        if (message.startsWith("message"))
        {
            const QString mes = message.split(" ").mid(2).join(" ");
            broadcastMessage(mes, senderSocket, message.split(" ")[1]);
        }
        else if (message.startsWith("create"))
        {
            if (chatrooms.contains(message.split(" ")[1])) {
                senderSocket->write("error room already exists");
                return;
            }

            // Remove client from all rooms
            for (const auto chatroom : chatrooms) {
                chatroom->clients.removeOne(senderSocket);
            }

            auto* room = new ChatRoom();
            room->name = message.split(" ")[1];
            room->type = ChatRoomType::Public;
            room->password = "";
            room->clients.append(senderSocket);
            chatrooms[room->name] = room;
            senderSocket->write(QString("room " + room->name).toUtf8());
            senderSocket->flush();
        }
        else if (message.startsWith("join"))
        {
            auto name = message.split(" ")[1];
            ChatRoom* room = chatrooms.value(name);
            if (room == nullptr) {
                senderSocket->write("error room does not exist");
                return;
            }

            for (const auto client : room->clients) {
                if (client == senderSocket) {
                    senderSocket->write("error already in room");
                    return;
                }
            }

            for (const auto chatroom : chatrooms) {
                chatroom->clients.removeOne(senderSocket);
            }

            room->clients.append(senderSocket);
            senderSocket->write(QString("room " + room->name).toUtf8());
            senderSocket->flush();
        }
        else if (message.startsWith("leave"))
        {
            ChatRoom* room = chatrooms[message.split(" ")[1]];
            if (room == nullptr) {
                return;
            }
            room->clients.removeOne(senderSocket);
        }
        else if (message.startsWith("delete"))
        {
            const ChatRoom* room = chatrooms[message.split(" ")[1]];
            if (room == nullptr) {
                return;
            }
            chatrooms.remove(room->name);
            delete room;
        }
        else if (message.startsWith("list"))
        {
            QString list = "list\n";
            for (const auto room : chatrooms) {
                list += room->name + "\n";
            }
            senderSocket->write(list.toUtf8());
            senderSocket->flush();
        }
        else if (message.startsWith("help"))
        {
            QString help = "Commands:\n";
            help += "create <room name>\n";
            help += "join <room id>\n";
            help += "leave <room id>\n";
            help += "delete <room id>\n";
            help += "list\n";
            help += "message <room name> <message>\n";
            senderSocket->write(help.toUtf8());
            senderSocket->flush();
        }
        else
        {
            senderSocket->write("error unknown command");
            senderSocket->flush();
        }
    }
};

int main(int argc, char *argv[]) {
    QCoreApplication a(argc, argv);

    if (argc != 2) {
        qInfo() << "Usage: server <port>";
        return -1;
    }

    ChatServer server;
    if (!server.listen(QHostAddress::LocalHost, QString(argv[1]).toInt())) {
        qInfo() << "Server could not start!";
        return -1;
    }
    qInfo() << "Server started. Listening on port" << argv[1] << "...";

    server.createRoom("home");

    return QCoreApplication::exec();
}

#include "main.moc"
