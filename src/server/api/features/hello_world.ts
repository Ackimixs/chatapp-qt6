export function apiRouteHandler() {
    return new Response(JSON.stringify({ status: 200, body: {message: "Hello World!"} }), { status: 200 });
}