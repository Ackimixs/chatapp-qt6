import fs from "node:fs";
import path from "node:path";

export class Router {
    routes: Map<{path: string, method: string}, (req: Request, options?: { [key: string]: any }) => Promise<Response>>;

    constructor() {
        this.routes = new Map<{path: string, method: string}, (req: Request) => Promise<Response>>();
    }

    addRoute(path: string, method: string, handler: (req: Request) => Promise<Response>) {
        this.routes.set({path, method}, handler);
    }

    async handle(req: Request, options?: { [key: string]: any }) {
        const url = new URL(req.url);
        const handler = findValueInMap(this.routes, {path: url.pathname, method: req.method});

        if (handler) {
            return await handler(req, options);
        }
        else {
            return new Response("Not found", { status: 404 });
        }
    }

    async initialize() {
        const files = this.getAllFiles("./server", []);

        for (const file of files) {
            const method = path.basename(file).split(".").length === 2 ? "ALL" : path.basename(file).split(".")[1].toUpperCase();
            const p = "/" + path.dirname(file).split(path.sep).slice(1).join("/") + "/" + path.basename(file).split(".")[0];
            const fullPath = path.join(process.cwd(), file);
            const handler = await import(fullPath);

            this.addRoute(p, method, handler.default);
        }
    }

    getAllFiles(dirPath: string, filesArray: string[]): string[] {
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

function findValueInMap(map, searchObj) {
    for (const [key, value] of map) {
        const keyMatches = Object.keys(searchObj).every((prop) => key[prop] === searchObj[prop]);

        if (keyMatches) {
            return value; // Return the value associated with the matching key
        }
    }
    return null; // If no matching key is found
}