import {Rooms, Clients, myRequest} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, {Rooms, Clients} : {Rooms: Rooms, Clients: Clients}) {

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
                return new Response(JSON.stringify({status: 200, statusText: "success", body: {room: name}}), {status: 200, statusText: "success"});
            } else {
                return new Response(JSON.stringify({status: 404, statusText: "error room does not exist"}), {status: 404, statusText: "error room does not exist"});
            }
        }
    }
    return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
}