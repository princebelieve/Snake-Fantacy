const SOUNDS = {
    eat: './assets/audio/fruit-pickup.wav',
    bonus: './assets/audio/bonus-sparkle.wav',
    crash: './assets/audio/snake-crash.wav',
    win: './assets/audio/level-clear.wav',
    expire: './assets/audio/bonus-expire.wav'
};

/** Local audio files; no remote request and playback starts after the first gesture. */
export class SoundManager {
    constructor({ AudioClass = globalThis.Audio, storage = null } = {}) {
        this.enabled = true;
        try { this.enabled = (storage || globalThis.localStorage)?.getItem('snake-fantasy-muted') !== 'true'; } catch {}
        this.pool = {};
        if (AudioClass) for (const [name, src] of Object.entries(SOUNDS)) {
            try { const audio = new AudioClass(src); audio.preload = 'auto'; this.pool[name] = audio; } catch {}
        }
    }

    play(name) {
        if (!this.enabled || !this.pool[name]) return;
        const audio = this.pool[name].cloneNode();
        audio.volume = name === 'win' ? 0.7 : 0.55;
        audio.play().catch(() => {});
    }

    toggle() {
        this.enabled = !this.enabled;
        try { globalThis.localStorage?.setItem('snake-fantasy-muted', String(!this.enabled)); } catch {}
        return this.enabled;
    }
}
