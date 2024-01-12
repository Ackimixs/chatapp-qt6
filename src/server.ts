import cuid from 'cuid';
import { PrismaClient } from '@prisma/client';
import {Server, ServerWebSocket} from 'bun';
import {Router} from "@root/router.ts";
import {Clients, Rooms } from '@root/utils/type.ts';

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
            port: 8081,
            async fetch(req, server) {
                let res = await router.handleWebSocket(req, server, {id: cuid()});

                if (res) {
                    return res;
                }

                res = await router.handle(req, {Rooms, Clients, prisma});

                if (res) {
                    return res;
                }

                return new Response("Not found", { status: 404 });
            },
            websocket: router.ws.websocket
        });

        console.log(`Listening on ${this.server.hostname}:${this.server.port}`);
    }
}