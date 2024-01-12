import { PrismaClient } from '@prisma/client';
import {Clients, myRequest} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, {Clients, prisma} : {Clients: Clients, prisma: PrismaClient}) {

    console.log("list room api called");

    const url = new URL(req.url);

    const limit = url.searchParams.get("limit") ?? "10";
    const page = url.searchParams.get("page") ?? "0";
    const id = url.searchParams.get("id");

    if (id && Clients.has(id)) {
        const rooms = await prisma.room.findMany({
            select: {
                name: true,
            },
            skip: parseInt(page) * parseInt(limit),
            take: parseInt(limit)
        });

        const nbTotal = await prisma.room.count();

        return new Response(JSON.stringify({
            status: 200,
            statusText: "success",
            body: {rooms, roomsNumber: nbTotal}
        }), {status: 200, statusText: "success"});
    }

    return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {
        status: 400,
        statusText: "error no name provided"
    });
}