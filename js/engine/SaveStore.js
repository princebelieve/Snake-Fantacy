/** Versioned per-game local persistence with a storage adapter for testing. */
export class SaveStore {
    constructor(namespace, { version = 1, storage = null, migrate = null } = {}) {
        if (!namespace) throw new TypeError('SaveStore needs a namespace');
        this.key = `game-save:${namespace}`;
        this.version = version;
        this.storage = storage || getLocalStorage();
        this.migrate = migrate;
    }

    load(fallback = {}) {
        try {
            const raw = this.storage?.getItem(this.key);
            if (!raw) return structuredClone(fallback);
            const envelope = JSON.parse(raw);
            if (!envelope || typeof envelope !== 'object' || !Number.isInteger(envelope.version)) return structuredClone(fallback);
            let data = envelope.data;
            if (envelope.version !== this.version) {
                if (!this.migrate) return structuredClone(fallback);
                data = this.migrate(data, envelope.version, this.version);
            }
            return data && typeof data === 'object' ? data : structuredClone(fallback);
        } catch {
            return structuredClone(fallback);
        }
    }

    save(data) {
        try {
            this.storage?.setItem(this.key, JSON.stringify({ version: this.version, data }));
            return Boolean(this.storage);
        } catch { return false; }
    }

    clear() {
        try { this.storage?.removeItem(this.key); return true; }
        catch { return false; }
    }
}

function getLocalStorage() {
    try { return globalThis.localStorage || null; }
    catch { return null; }
}
