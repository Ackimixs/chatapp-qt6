import {Rooms, Clients, myRequest} from '@root/utils/type.ts';

export async function apiRouteHandler(req: myRequest, {Rooms, Clients} : {Rooms: Rooms, Clients: Clients}) {
    console.log("leave room api called");

    const { id } = await req.json();

    if (id) {
        let c = Clients.get(id);
        if (c) {
            if (c.roomName) {
                c.ws.unsubscribe("room-" + c.roomName);
                c.roomName = "";
                Rooms.get(c.roomName)?.splice(Rooms.get(c.roomName)?.indexOf(id) ?? 0, 1);

                return new Response(JSON.stringify({status: 200, statusText: "success"}), {status: 200, statusText: "success"});
            } else {
                return new Response(JSON.stringify({status: 400, statusText: "error you are not in a room"}), {status: 400, statusText: "error you are not in a room"});
            }
        }
    } else {
        return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
    }

    return new Response(JSON.stringify({status: 400, statusText: "error while leaving room"}), ({status: 400, statusText: "error while leaving room"}));
}