import { PrismaClient } from '@prisma/client';
import {ServerWebSocket} from "bun";

export default async (req: Request, {Rooms, Clients, prisma} : {Rooms: Map<string, string[]>, Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>, prisma: PrismaClient}) => {

    console.log("join room api called");

    const { name, id } = await req.json();

    if (id && name) {
        let c = Clients.get(id);
        if (c) {
            if (c.roomName) {
                c.ws.unsubscribe("room-" + c.roomName);
            }
            if (Rooms.has(name)) {
                Rooms.get(name)?.push(id);
                c.roomName = name;
                c.ws.subscribe("room-" + name);
                return new Response(JSON.stringify({status: 200, statusText: "success", body: {room: name}}), {status: 200, statusText: "success"});
            } else {
                return new Response(JSON.stringify({status: 404, statusText: "error room does not exist"}), {status: 404, statusText: "error room does not exist"});
            }
        }
    }
    return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
}