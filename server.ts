import cuid from 'cuid';
import { PrismaClient } from '@prisma/client';
import {Server, ServerWebSocket} from 'bun';
import {Router} from "./router.ts";

export class MyServer {
    prisma: PrismaClient;
    server: Server | null = null;
    Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>;
    Rooms: Map<string, string[]>;
    router: Router;

    constructor() {
        this.prisma = new PrismaClient();
        this.Clients = new Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>();
        this.Rooms = new Map<string, string[]>();
        this.router = new Router();
    }

    async init() {
        await this->initDatabase();
        await this.router.initialize()
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
                const url = new URL(req.url);

                if (url.pathname === "/ws") {
                    const success = server.upgrade(req, {data: {id: cuid()}});
                    console.log("Upgrade: " + success);
                    return success
                        ? undefined
                        : new Response("WebSocket upgrade error", { status: 400 });
                }

                return await router.handle(req, {Rooms, Clients, prisma});
            },
            websocket: {
                async message(ws, message : string) {
                    console.log("Message received: " + message);

                    let method = message.split(' ')[0];

                    if (method === "message") {
                        let room = Clients.get(ws.data.id);
                        if (room) {
                            const messageData = message.split(' ');
                            ws.publish("room-" + room.roomName, "message " + messageData.slice(1).join(' '));
                            try {
                                await prisma.message.create({
                                    data: {
                                        content: messageData.slice(1).join(' '),
                                        room: {
                                            connect: {
                                                name: room.roomName
                                            }
                                        },
                                    }
                                });
                            } catch (e) {
                                console.log(e);
                            }

                        } else {
                            ws.send("error you are not in a room");
                        }
                    }
                },
                open(ws) {
                    console.log("Socket with id " + ws.data.id + " open");
                    ws.send('id ' + ws.data.id);
                    Clients.set(ws.data.id, {roomName: "", ws: ws});
                },
                close(ws, code, message) {
                    let room = Clients.get(ws.data.id);
                    ws.unsubscribe("room-" + room);
                    Clients.delete(ws.data.id);
                    Rooms.get(ws.data.id)?.splice(Rooms.get(ws.data.id)?.indexOf(ws.data.id) ?? 0, 1);
                    console.log("Socket with id " + ws.data.id + " close");
                },
            },
        });

        console.log(`Listening on ${this.server.hostname}:${this.server.port}`);
    }
}