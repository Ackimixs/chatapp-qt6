import cuid from 'cuid';
import { PrismaClient } from '@prisma/client';
import {Server, ServerWebSocket} from 'bun';
import {Router} from "@root/router.ts";
import {Clients, myResponse, Rooms} from '@root/utils/type.ts';

export class MyServer {
    prisma: PrismaClient;
    server: Server | null = null;
    Clients: Clients;
    Rooms: Rooms;
    router: Router;

    constructor() {
        this.prisma = new PrismaClient();
        this.Clients = new Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>();
        this.Rooms = new Map<string, string[]>();
        this.router = new Router();
    }

    async init() {
        await this.initDatabase();
        await this.router.initialize(this.Clients, this.Rooms, this.prisma);
    }

    async initDatabase() {
        const rooms = await this.prisma.room.findMany({
            select: {
                name: true,
            }
        });

        if (rooms.length === 0) {
            const r = await this.prisma.room.create({
                data: {
                    name: "home",
                }
            });

            this.Rooms.set(r.name, []);
        }
        else {
            for (const room of rooms) {
                this.Rooms.set(room.name, []);
            }
        }
    }

    start() {
        const prisma = this.prisma;
        const Clients = this.Clients;
        const Rooms = this.Rooms;
        const router = this.router;

        this.server = Bun.serve<{ id: string }>({
            port: Bun.env.PORT ?? 8080,
            async fetch(req, server) {

                let res: myResponse = new myResponse();

                await router.handle(req, res, server, {Rooms, Clients, prisma, id: cuid()});

                if (res.isReady()) {
                    return res.end();
                } else {
                    return res.status(404).statusText("Not found").json({status: 404, statusText: "Not found"}).end();
                }
            },
            websocket: router.ws.websocket
        });

        console.log(`Listening on ${this.server.hostname}:${this.server.port}`);
    }
}