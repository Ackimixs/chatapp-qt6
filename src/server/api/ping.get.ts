export function apiRouteHandler() {
    return new Response(JSON.stringify({status: 200, statusText: "success", body: {time: Date.now()}}), {status: 200, statusText: "success"});
}