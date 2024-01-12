export const middleware = {
    path: "/api/room/*",
    middlewareHandler: async function () {
        return {
            middlewareResponseStatus: 200,
            response: undefined
        }
    }
}