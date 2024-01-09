import {MyServer} from "./server.ts";

const server = new MyServer();

await server.init();

server.start();