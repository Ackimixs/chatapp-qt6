import fs from "node:fs";
import path from "node:path";
import {Server, WebSocketHandler} from "bun";
import { websocket } from "./server/websocket.ts";
import { PrismaClient } from "@prisma/client";

export class Router {
    routes: Map<{path: string, method: string}, (req: Request, options?: { [key: string]: any }) => Promise<Response>>;
    middleware: {path: string, middlewareHandler: (req: Request, options?: { [key: string]: any }) => Promise<{middlewareResponseStatus: number, response?: Response}>}[] = [];
    ws: {path: string[], websocket: WebSocketHandler<{ id: string }> | undefined};

    constructor() {
        this.routes = new Map<{path: string, method: string}, (req: Request) => Promise<Response>>();
        this.middleware = [];
        this.ws = {path: [], websocket: undefined};
    }

    addRoute(path: string, method: string, handler: (req: Request) => Promise<Response>) {
        this.routes.set({path, method}, handler);
    }

    async handle(req: Request, options?: { [key: string]: any }) {
        const url = new URL(req.url);
        const handler = findValueInMap(this.routes, {path: url.pathname, method: req.method});

        const path = url.pathname;
        for (const middleware of this.middleware) {
            if (path.match(middleware.path)) {
                const {middlewareResponseStatus, response} = await middleware.middlewareHandler(req, options);

                if (response) {
                    return response;
                }

                if (middlewareResponseStatus !== 200) {
                    return new Response("Not found", { status: 404 });
                }
            }
        }

        if (handler) {
            return await handler(req, options);
        }
    }

    async handleWebSocket(req: Request, server: Server, options?: { [key: string]: any }) {
        const url = new URL(req.url);
        const path = url.pathname;

        if (this.ws.websocket && this.ws.path.some(p => path.match(p))) {
            const success = server.upgrade(req, {data: options});
            console.log("Upgrade: " + success);
            return success
                ? undefined
                : new Response("WebSocket upgrade error", { status: 400 });
        }
    }

    addWebsocketPath(path: string) {
        this.ws.path.push(path);
    }

    async initialize(Clients: any, Rooms: any, prisma: PrismaClient) {
        const files = this.getAllFiles("./server/api", []);

        for (const file of files) {
            const method = path.basename(file).split(".").length === 2 ? "ALL" : path.basename(file).split(".")[1].toUpperCase();
            const p = "/" + path.dirname(file).split(path.sep).slice(1).join("/") + "/" + path.basename(file).split(".")[0];
            const fullPath = path.join(process.cwd(), file);
            const handler = await import(fullPath);

            this.addRoute(p, method, handler.apiRouteHandler);
        }

        const middlewareFiles = this.getAllFiles("./server/middleware", []);
        for (const middlewareFile of middlewareFiles) {
            const fullPath = path.join(process.cwd(), middlewareFile);
            const middleware = await import(fullPath);

            this.middleware.push(middleware.middleware);
        }

        this.ws.websocket = websocket(Clients, Rooms, prisma);
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
}

function findValueInMap(map: any, searchObj: { [key: string]: any }) {
    for (const [key, value] of map) {
        // @ts-ignore
        const keyMatches = Object.keys(searchObj).every((prop) => key[prop] === searchObj[prop]);

        if (keyMatches) {
            return value;
        }
    }
    return null;
}