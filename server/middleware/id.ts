import {ServerWebSocket} from "bun";

export const middleware = {
    path: "/api/room/*",
    middlewareHandler: async function (req: Request, {Clients} : {Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>}) {
        const url = new URL(req.url);

        let id = url.searchParams.get("id");

        if (id) {
            if (Clients.has(id)) {
                return {
                    middlewareResponseStatus: 200,
                }
            } else {
                return {
                    middlewareResponseStatus: 400,
                    response: new Response(JSON.stringify({status: 400, statusText: "error no client with that id"}), {status: 400, statusText: "error no client with that id"})
                }
            }
        } else {
            return {
                middlewareResponseStatus: 400,
                response: new Response(JSON.stringify({status: 400, statusText: "error no id provided"}), {status: 400, statusText: "error no id provided"})
            }
        }
    }
}