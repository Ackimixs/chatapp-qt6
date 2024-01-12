import { PrismaClient } from '@prisma/client';
import {Rooms, Clients, myRequest} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, {Rooms, Clients, prisma} : {Rooms: Rooms, Clients: Clients, prisma: PrismaClient}) {
    console.log("create room api called");

    const { name } = req.params;
    const { id } = await req.json();

    if (name && id) {
        if (Rooms.has(name)) {
            let error = {status: 400, statusText: "error room already exists"};
            return new Response(JSON.stringify(error), error);
        } else {

            if (Clients.has(id)) {
                let c = Clients.get(id);
                if (c) {
                    if (c.roomName) {
                        c.ws.unsubscribe("room-" + c.roomName);
                    }

                    Rooms.set(name, [id]);
                    c.roomName = name;
                    c.ws.subscribe("room-" + name);

                    await prisma.room.create({
                        data: {
                            name: name,
                        }
                    });

                    return new Response(JSON.stringify({status: 200, statusText: "success", body: {room: name}}), {status: 200, statusText: "success"});
                }
            }
        }
    }

    return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
}