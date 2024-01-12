import {ServerWebSocket} from "bun";

export type Rooms = Map<string, string[]>;

export type Clients = Map<string, {roomName: string, ws: ServerWebSocket<{ id: string }>}>;

export class myRequest extends Request {
    params: { [key: string]: string } = {};
    jsonData: any = {};
}

export class myResponse {
    response: Response;
    options: ResponseInit;

    constructor(response?: Response, options?: ResponseInit) {
        this.response = response ?? new Response();
        this.options = options ?? {};
    }

    status(status: number) {
        this.options.status = status;
        return this;
    }

    statusText(statusText: string) {
        this.options.statusText = statusText;
        return this;
    }

    json(body: any) {
        this.response = Response.json(body, this.options);
        return this;
    }

    send(body: any) {
        this.response = new Response(body, this.options);
        return this;
    }

    end() {
        return this.response;
    }

    isReady() {
        return this.response.body != null;
    }
}