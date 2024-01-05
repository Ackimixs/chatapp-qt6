import cuid from 'cuid';
import { PrismaClient } from '@prisma/client';
import {Server, ServerWebSocket} from 'bun';

export class MyServer {
    prisma: PrismaClient;
    server: Server;
    Clients: Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>;
    Rooms: Map<string, string[]>;

    constructor() {
        this.prisma = new PrismaClient();
        this.Clients = new Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>();
        this.Rooms = new Map<string, string[]>();
    }

    async initDatabase() {
        const rooms = await this.prisma.room.findMany({
            select: {
                name: true,
            }
        });
        for (const room of rooms) {
            this.Rooms.set(room.name, []);
        }
    }

    start() {
        const prisma = this.prisma;
        const Clients = this.Clients;
        const Rooms = this.Rooms;

        this.server = Bun.serve<{ id: string }>({
            port: 8081,
            async fetch(req, server) {
                const url = new URL(req.url);

                if (url.pathname === "/chat") {
                    const success = server.upgrade(req, {data: {id: cuid()}});
                    console.log("Upgrade: " + success);
                    return success
                        ? undefined
                        : new Response("WebSocket upgrade error", { status: 400 });
                }

                if (url.pathname.startsWith("/api/room/create")) {
                    console.log("create room api called");

                    const name = url.searchParams.get("name");
                    const id = url.searchParams.get("id");

                    if (name && id) {
                        if (Rooms.has(name)) {
                            return new Response("error room already exists");
                        } else {

                            if (Clients.has(id)) {
                                let c = Clients.get(id);
                                if (c) {
                                    if (c.roomName) {
                                        c.ws.unsubscribe("room-" + c.roomName);
                                    }

                                    Rooms.set(name, [id]);
                                    c.roomName = name;
                                    c.ws.subscribe("room-" + name);

                                    await prisma.room.create({
                                        data: {
                                            name: name,
                                        }
                                    });

                                    return new Response("joined room " + name);
                                }
                            }
                        }
                    }

                    return new Response("error no name provided");
                }
                else if (url.pathname.startsWith("/api/room/join")) {
                    console.log("join room api called");

                    const id = url.searchParams.get("id");
                    const name = url.searchParams.get("name");

                    if (id && name) {
                        let c = Clients.get(id);
                        if (c) {
                            if (c.roomName) {
                                c.ws.unsubscribe("room-" + c.roomName);
                            }
                            if (Rooms.has(name)) {
                                Rooms.get(name)?.push(id);
                                c.roomName = name;
                                c.ws.subscribe("room-" + name);
                                return new Response("joined room " + name);
                            } else {
                                return new Response("error room does not exist");
                            }
                        }
                    }
                    return new Response("error no id or name provided");
                }
                else if (url.pathname.startsWith("/api/room/leave")) {
                    console.log("leave room api called");

                    const id = url.searchParams.get("id");
                    if (id) {
                        let c = Clients.get(id);
                        if (c) {
                            if (c.roomName) {
                                c.ws.unsubscribe("room-" + c.roomName);
                                c.roomName = "";
                            }
                        }
                    }
                }
                else if (url.pathname.startsWith("/api/room/list")) {
                    console.log("list room api called");

                    const rooms = await prisma.room.findMany({
                        select: {
                            name: true,
                        }
                    });
                    let str = "";
                    for (const room of rooms) {
                        str += room.name + "\n";
                    }
                    return new Response(str);
                }
                else if (url.pathname.startsWith("/api/room/history")) {
                    console.log("history room api called");

                    const name = url.searchParams.get("name");
                    if (name) {
                        const messages = await prisma.message.findMany({
                            where: {
                                room: {
                                    name
                                }
                            },
                            take: 64,
                        });
                        let str = "";
                        for (const message of messages) {
                            str += message.content + "\n";
                        }
                        return new Response(str);
                    }
                    return new Response("error no name provided");
                }
                return new Response("error no path provided");
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