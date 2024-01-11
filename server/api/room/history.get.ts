import { PrismaClient } from '@prisma/client';
import {ServerWebSocket} from "bun";

export async function apiRouteHandler(req: Request, {Clients, prisma} : {Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>, prisma: PrismaClient}) {

    console.log("history room api called");

    const url = new URL(req.url);

    const name = url.searchParams.get("name");
    const limit = parseInt(url.searchParams.get("limit") ?? "64", 10);
    const id = url.searchParams.get("id");

    if (id && Clients.has(id)) {
        if (name) {
            let messages = await prisma.message.findMany({
                where: {
                    room: {
                        name
                    }
                },
                take: limit,
                select: {
                    content: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
            messages = messages.reverse();
            return new Response(JSON.stringify({status: 200, statusText: "success", body: {messages}}), {status: 200, statusText: "success"});
        }
    }
    return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
}