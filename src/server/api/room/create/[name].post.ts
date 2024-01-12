import { PrismaClient } from '@prisma/client';
import {Rooms, Clients, myRequest, myResponse} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, res: myResponse, {Rooms, Clients, prisma} : {Rooms: Rooms, Clients: Clients, prisma: PrismaClient}) {
    console.log("create room api called");

    const { name } = req.params;
    const { id } = await req.json();

    if (name && id) {
        if (Rooms.has(name)) {
            res.status(400).statusText("error room already exists").json({status: 400, statusText: "error room already exists"});
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

                    res.status(200).statusText("success").json({status: 200, statusText: "success", body: {room: name}});
                }
            } else {
                res.status(400).statusText("error client does not exist").json({status: 400, statusText: "error client does not exist"});
            }
        }
    }

    if (!res.isReady()) {
        res.status(400).statusText("error while creating room").json({status: 400, statusText: "error while creating room"});
    }
}