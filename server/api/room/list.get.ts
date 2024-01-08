import { PrismaClient } from '@prisma/client';
import {ServerWebSocket} from "bun";

export default async (req: Request, {Rooms, Clients, prisma} : {Rooms: Map<string, string[]>, Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>, prisma: PrismaClient}) => {

    console.log("list room api called");

    const url = new URL(req.url);

    const limit = url.searchParams.get("limit") ?? "10";
    const page = url.searchParams.get("page") ?? "0";

    const rooms = await prisma.room.findMany({
        select: {
            name: true,
        },
        skip: parseInt(page) * parseInt(limit),
        take: parseInt(limit)
    });

    const nbTotal = await prisma.room.count();

    return new Response(JSON.stringify({status: 200, statusText: "success", body: {rooms, roomsNumber: nbTotal}}), {status: 200, statusText: "success"});
}