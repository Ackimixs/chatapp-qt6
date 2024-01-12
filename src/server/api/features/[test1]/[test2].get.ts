import { myRequest } from "@root/utils/type.ts";

export async function apiRouteHandler(req: myRequest) {

    return new Response(JSON.stringify({status: 200, statusText: "success", body: {params: req.params}}), {status: 200, statusText: "success"});

}