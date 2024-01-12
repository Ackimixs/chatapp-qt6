import {Rooms, Clients, myRequest, myResponse} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, res: myResponse, {Rooms, Clients} : {Rooms: Rooms, Clients: Clients}) {

    console.log("join room api called");

    const { name } = req.params;
    const { id } = req.jsonData;

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

                res.status(200).statusText("success").json({status: 200, statusText: "success", body: {room: name}});
            } else {
                res.status(404).statusText("error room does not exist").json({status: 404, statusText: "error room does not exist"});
            }
        }
    }

    if (!res.isReady()) {
        res.status(400).statusText("error while joining room").json({status: 400, statusText: "error while joining room"});
    }
}