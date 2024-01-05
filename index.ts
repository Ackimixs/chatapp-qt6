import {MyServer} from "./server.ts";

const server = new MyServer();

await server.initDatabase();

server.start();