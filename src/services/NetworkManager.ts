/// <reference lib="webworker" />

// Network status checker and retry handler
export class NetworkManager {
    private static instance: NetworkManager;
    private isOnline: boolean = true;
    private listeners: ((status: boolean) => void)[] = [];

    private constructor() {
        if (typeof window !== 'undefined') {
            // Browser context
            this.isOnline = navigator.onLine;
            window.addEventListener('online', () => this.updateOnlineStatus(true));
            window.addEventListener('offline', () => this.updateOnlineStatus(false));
        } else {
            // Service worker context
            this.isOnline = true; // Default to true in service worker
            if ('addEventListener' in self) {
                (self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', (event: FetchEvent) => {
                    event.waitUntil(
                        fetch(event.request.clone())
                            .then(() => this.updateOnlineStatus(true))
                            .catch(() => this.updateOnlineStatus(false))
                    );
                });
            }
        }
    }

    static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    private updateOnlineStatus(status: boolean) {
        this.isOnline = status;
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isOnline));
    }

    public addListener(listener: (status: boolean) => void) {
        this.listeners.push(listener);
    }

    public removeListener(listener: (status: boolean) => void) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public isNetworkAvailable(): boolean {
        return this.isOnline;
    }
}
