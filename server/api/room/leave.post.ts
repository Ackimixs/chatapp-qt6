import {ServerWebSocket} from "bun";

export async function apiRouteHandler(req: Request, {Rooms, Clients} : {Rooms: Map<string, string[]>, Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>}) {

    console.log("leave room api called");

    const url = new URL(req.url);

    const id = url.searchParams.get("id");
    if (id) {
        let c = Clients.get(id);
        if (c) {
            if (c.roomName) {
                c.ws.unsubscribe("room-" + c.roomName);
                c.roomName = "";
                Rooms.get(c.roomName)?.splice(Rooms.get(c.roomName)?.indexOf(id) ?? 0, 1);
            }
        }
    }
}