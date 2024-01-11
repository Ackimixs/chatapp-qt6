import { PrismaClient } from '@prisma/client';
import {ServerWebSocket} from "bun";

export default async (req: Request, {Rooms, Clients, prisma} : {Rooms: Map<string, string[]>, Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>, prisma: PrismaClient}) => {

    console.log("leave room api called");

    const url = new URL(req.url);

    const { id } = avait req.json();

    if (id) {
        let c = Clients.get(id);
        if (c) {
            if (c.roomName) {
                c.ws.unsubscribe("room-" + c.roomName);
                c.roomName = "";
                Rooms.get(c.roomName)?.splice(Rooms.get(c.roomName)?.indexOf(id) ?? 0, 1);

               
            }
        }
    }
}