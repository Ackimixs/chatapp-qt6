import { PrismaClient } from '@prisma/client';
import {Clients, myRequest, myResponse} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, res: myResponse, {Clients, prisma} : {Clients: Clients, prisma: PrismaClient}) {

    console.log("history room api called");

    const url = new URL(req.url);

    const { name } = req.params;
    const limit = parseInt(url.searchParams.get("limit") ?? "64", 10);
    const id = url.searchParams.get("id");

    if (id && Clients.has(id)) {
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

        res.status(200).statusText("success").json({status: 200, statusText: "success", body: {messages}});
    } else {
        res.status(400).statusText("no id provided").json({status: 400, statusText: "no id provided"});
    }

    if (!res.isReady()) {
        res.status(400).statusText("error while listing last messages").json({status: 400, statusText: "error while listing last messages"});
    }
}