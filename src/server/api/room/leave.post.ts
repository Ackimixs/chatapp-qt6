import {Rooms, Clients, myRequest, myResponse} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, res: myResponse, {Rooms, Clients} : {Rooms: Rooms, Clients: Clients}) {
    console.log("leave room api called");

    const { id } = await req.json();

    if (id) {
        let c = Clients.get(id);
        if (c) {
            if (c.roomName) {
                c.ws.unsubscribe("room-" + c.roomName);
                c.roomName = "";
                Rooms.get(c.roomName)?.splice(Rooms.get(c.roomName)?.indexOf(id) ?? 0, 1);

                res.status(200).statusText("success").json({status: 200, statusText: "success"});
            } else {
                res.status(400).statusText("error you are not in a room").json({status: 400, statusText: "error you are not in a room"});
            }
        }
    } else {
        res.status(400).statusText("error no name provided").json({status: 400, statusText: "error no name provided"});
    }

    if (!res.isReady()) {
        res.status(400).statusText("error while leaving room").json({status: 400, statusText: "error while leaving room"});
    }
}