/** Loads and memoizes same-origin JSON game data. The service worker supplies offline responses. */
export class JsonConfigLoader {
    constructor({ fetcher = (...args) => fetch(...args) } = {}) {
        this.fetcher = fetcher;
        this.cache = new Map();
    }

    async load(path, { validate = null, force = false } = {}) {
        if (!force && this.cache.has(path)) return structuredClone(this.cache.get(path));
        const response = await this.fetcher(path);
        if (!response.ok) throw new Error(`Could not load game data (${response.status}): ${path}`);
        let data;
        try { data = await response.json(); }
        catch { throw new Error(`Game data is not valid JSON: ${path}`); }
        const errors = validate ? validate(data) : [];
        if (errors.length) throw new Error(`Invalid game data at ${path}: ${errors.join('; ')}`);
        this.cache.set(path, data);
        return structuredClone(data);
    }

    clear(path = null) {
        if (path) this.cache.delete(path);
        else this.cache.clear();
    }
}
