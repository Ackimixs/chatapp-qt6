import {ServerWebSocket} from "bun";

export type Rooms = Map<string, string[]>;

export type Clients = Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>;

export class myRequest extends Request {
    params: { [key: string]: string } = {};
    jsonData: any = {};
}