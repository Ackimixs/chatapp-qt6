import fs from "node:fs";
import path from "node:path";
import {Server, WebSocketHandler} from "bun";
import { PrismaClient } from "@prisma/client";
import * as process from "process";
import {myRequest, myResponse} from "@root/utils/type.ts";

export class Router {
    routes: Map<{path: string, method: string}, (req: myRequest, res: myResponse, options?: { [key: string]: any }) => Promise<void>>;
    middleware: {path: string, middlewareHandler: (req: Request, res: myResponse, options?: { [key: string]: any }) => Promise<{middlewareResponseStatus: number, response?: Response}>}[] = [];
    ws: {path: string[], websocket: WebSocketHandler<{ id: string }> | undefined};

    constructor() {
        this.routes = new Map<{path: string, method: string}, (req: myRequest, res: myResponse) => Promise<void>>();
        this.middleware = [];
        this.ws = {path: [], websocket: undefined};
    }

    addRoute(path: string, method: string, handler: (req: myRequest, res: myResponse) => Promise<void>) {
        this.routes.set({path, method}, handler);
    }

    async handle(req: Request, res: myResponse, server: Server, options?: { [p: string]: any }) {
        await this.handleWebSocket(req, res, server, options);
        if (res.isReady()) {
            return;
        }

        const url = new URL(req.url);

        const path = url.pathname;
        for (const middleware of this.middleware) {
            if (path.match(middleware.path)) {
                await middleware.middlewareHandler(req, res, options);

                if (res.isReady()) {
                    return;
                }
            }
        }

        let handler = findValueInMap(this.routes, {path: url.pathname, method: req.method});
        if (!handler) handler = findValueInMap(this.routes, {path: url.pathname, method: "ALL"});
        if (handler) {
            await handler(req, res, options);

            if (res.isReady()) {
                return;
            }
        } else {
            // Check for special routes like :id
            for (const [specialRoute, v] of this.routes) {
                if (matchSpecialRoute(specialRoute.path, url.pathname)) {
                    if (specialRoute.method == req.method || specialRoute.method == "ALL") {
                        const r = new myRequest(req);
                        specialRoute.path.split("/").forEach((segment, index) => {
                            if (segment.startsWith(":")) {
                                r.params[segment.slice(1)] = url.pathname.split("/")[index];
                            }
                        });
                        if (req.body) r.jsonData = await req.json();
                        await v(r, res, options);

                        if (res.isReady()) {
                            return res;
                        }
                    }
                }
            }
        }
    }

    async handleWebSocket(req: Request, res: myResponse, server: Server, options?: { [key: string]: any }) {
        const url = new URL(req.url);
        const path = url.pathname;

        if (this.ws.websocket && this.ws.path.some(p => path.match(p))) {
            const success = server.upgrade(req, {data: options});
            success
                ? res.status(101).send("WebSocket upgrade successful")
                : res.status(400).send("WebSocket upgrade failed");
        }
    }

    addWebsocketPath(path: string) {
        this.ws.path.push(path);
    }

    async initialize(Clients: any, Rooms: any, prisma: PrismaClient) {
        const files = this.getAllFiles("./src/server/api", []);

        for (const file of files) {
            const method = path.basename(file).split(".").length === 2 ? "ALL" : path.basename(file).split(".")[1].toUpperCase();
            let p = "/" + path.dirname(file).split(path.sep).slice(2).join("/") + "/" + path.basename(file).split(".")[0];
            const fullPath = path.join(process.cwd(), file);
            const handler = await import(fullPath);

            p.split("/").forEach((segment) => {
                if (segment.startsWith("[") && segment.endsWith("]")) {
                    p = p.replace(segment, ":" + segment.slice(1, segment.length - 1));
                }
            });

            this.addRoute(p, method, handler.apiRouteHandler);
        }

        const middlewareFiles = this.getAllFiles("./src/server/middleware", []);
        for (const middlewareFile of middlewareFiles) {
            const fullPath = path.join(process.cwd(), middlewareFile);
            const middleware = await import(fullPath);

            this.middleware.push(middleware.middleware);
        }

        if (fs.existsSync("./src/server/websocket.ts")) {
            const fullPath = path.join(process.cwd(), "./src/server/websocket.ts");
            const websocket = await import(fullPath);

            this.ws.websocket = websocket.websocket(Clients, Rooms, prisma);
        }
    }

    getAllFiles(dirPath: string, filesArray: string[]): string[] {
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory()) {
                this.getAllFiles(filePath, filesArray);
            } else {
                filesArray.push(filePath);
            }
        });

        return filesArray;
    }

    get(path: string, handler: (req: myRequest, res: myResponse) => Promise<void>) {
        this.addRoute(path, "GET", handler);
    }

    post(path: string, handler: (req: myRequest, res: myResponse) => Promise<void>) {
        this.addRoute(path, "POST", handler);
    }

    put(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "PUT", handler);
    }

    delete(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "DELETE", handler);
    }

    patch(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "PATCH", handler);
    }
}

function findValueInMap(map: Map<any, any>, searchIndex: any) {
    for (const [key, value] of map) {
        const keyMatches = Object.keys(searchIndex).every((prop) => key[prop] === searchIndex[prop]);

        if (keyMatches) {
            return value;
        }
    }
    return null;
}

function matchSpecialRoute(routePattern: string, requestUrl: string): boolean {
    const routeSegments = routePattern.split('/');
    const urlSegments = requestUrl.split('/');

    if (routeSegments.length !== urlSegments.length) {
        return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        const urlSegment = urlSegments[i];

        if (routeSegment.startsWith(':')) {
            // It's a parameter, so continue to the next segment
            continue;
        }

        if (routeSegment !== urlSegment) {
            // The segments don't match
            return false;
        }
    }

    return true;
}