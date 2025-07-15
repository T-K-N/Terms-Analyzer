declare global {
    interface WorkerEventMap {
        fetch: FetchEvent;
    }

    interface FetchEvent extends Event {
        clientId: string;
        preloadResponse: Promise<any>;
        request: Request;
        resultingClientId: string;
        handled: Promise<void>;
        waitUntil(f: Promise<any>): void;
        respondWith(r: Promise<Response> | Response): void;
    }
}
