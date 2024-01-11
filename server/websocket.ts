import { PrismaClient } from "@prisma/client";
import {ServerWebSocket, WebSocketHandler} from "bun";

export function websocket(Clients: any, Rooms: any, prisma: PrismaClient): WebSocketHandler<{ id: string }> {

    async function open(ws: ServerWebSocket<{ id: string }>) {
        console.log("Socket with id " + ws.data.id + " open");
        ws.send('id ' + ws.data.id);
        Clients.set(ws.data.id, {roomName: "", ws: ws});
    }

    function close(ws: ServerWebSocket<{ id: string }>) {
        let room = Clients.get(ws.data.id);
        ws.unsubscribe("room-" + room);
        Clients.delete(ws.data.id);
        Rooms.get(ws.data.id)?.splice(Rooms.get(ws.data.id)?.indexOf(ws.data.id) ?? 0, 1);
        console.log("Socket with id " + ws.data.id + " close");
    }

    async function message(ws: ServerWebSocket<{ id: string }>, message : string) {
        console.log("Message received: " + message);

        let method = message.split(' ')[0];

        if (method === "message") {
            let room = Clients.get(ws.data.id);
            if (room) {
                const messageData = message.split(' ');
                ws.publish("room-" + room.roomName, "message " + messageData.slice(1).join(' '));
                try {
                    await prisma.message.create({
                        data: {
                            content: messageData.slice(1).join(' '),
                            room: {
                                connect: {
                                    name: room.roomName
                                }
                            },
                        }
                    });
                } catch (e) {
                    console.log(e);
                }

            } else {
                ws.send("error you are not in a room");
            }
        }
    }

    return {
        open,
        close,
        message
    }
}