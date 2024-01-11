import {ServerWebSocket} from "bun";

export async function apiRouteHandler(req: Request, {Rooms, Clients} : {Rooms: Map<string, string[]>, Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>}) {
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
        } else {
            return new Response(JSON.stringify({status: 400, statusText: "error you are not in a room"}), {status: 400, statusText: "error you are not in a room"});
        }
    } else {
        return new Response(JSON.stringify({status: 400, statusText: "error no name provided"}), {status: 400, statusText: "error no name provided"});
    }
}