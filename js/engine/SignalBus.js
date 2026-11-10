/** Lightweight event service for decoupled engine and game notifications. */
export class SignalBus {
    constructor() { this.listeners = new Map(); }

    on(name, callback) {
        if (typeof callback !== 'function') throw new TypeError('SignalBus listeners must be functions');
        if (!this.listeners.has(name)) this.listeners.set(name, new Set());
        this.listeners.get(name).add(callback);
        return () => this.off(name, callback);
    }

    once(name, callback) {
        const unsubscribe = this.on(name, payload => {
            unsubscribe();
            callback(payload);
        });
        return unsubscribe;
    }

    off(name, callback) {
        const listeners = this.listeners.get(name);
        if (!listeners) return false;
        const removed = listeners.delete(callback);
        if (listeners.size === 0) this.listeners.delete(name);
        return removed;
    }

    emit(name, payload) {
        for (const callback of [...(this.listeners.get(name) || [])]) callback(payload);
    }

    clear() { this.listeners.clear(); }
}
