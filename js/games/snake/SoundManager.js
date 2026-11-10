/** Offline river soundscape. A single gesture-unlocked graph mixes music and effects. */
export class SoundManager {
    constructor({ storage = null, ContextClass = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
        this.storage = storage || globalThis.localStorage;
        this.ContextClass = ContextClass;
        this.enabled = true;
        try { this.enabled = this.storage?.getItem('snake-fantasy-muted') !== 'true'; } catch {}
        this.mode = 'menu';
        this.beat = 0;
    }

    unlock() {
        if (!this.ContextClass) return;
        if (!this.context) {
            const ctx = this.context = new this.ContextClass();
            this.master = ctx.createGain();
            this.master.gain.value = this.enabled ? .65 : 0;
            const limiter = ctx.createDynamicsCompressor();
            this.master.connect(limiter).connect(ctx.destination);
            this.music = ctx.createGain();
            this.music.gain.value = 1.1;
            this.music.connect(this.master);
            this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
            const samples = this.noise.getChannelData(0);
            this.breathNoise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const breath = this.breathNoise.getChannelData(0);
            for (let i = 0; i < breath.length; i++) breath[i] = Math.random() * 2 - 1;
            let brown = 0;
            for (let i = 0; i < samples.length; i++) {
                brown = (brown + (Math.random() * 2 - 1) * .035) / 1.015;
                samples[i] = brown * 3;
            }
            this.scheduleMusic();
            this.timer = setInterval(() => this.scheduleMusic(), 100);
        }
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    }

    tone(frequency, time, duration, volume = .12, type = 'sine', endFrequency = frequency, bus = this.master) {
        const ctx = this.context;
        const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + Math.min(.035, duration / 5));
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        oscillator.connect(envelope).connect(bus);
        oscillator.start(time); oscillator.stop(time + duration + .02);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }

    splash(time, duration = .4, volume = .4, frequency = 1000) {
        const ctx = this.context, source = ctx.createBufferSource();
        source.buffer = this.noise;
        const filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
        filter.type = 'bandpass'; filter.Q.value = .65;
        filter.frequency.setValueAtTime(frequency, time);
        filter.frequency.exponentialRampToValueAtTime(250, time + duration);
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        source.connect(filter).connect(envelope).connect(this.master);
        source.start(time, Math.random()); source.stop(time + duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    }

    scheduleMusic() {
        const ctx = this.context;
        if (!ctx || ctx.state !== 'running') return;
        if (!this.nextNote || this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + .05;
        // An original, slow pentatonic phrase over four warm drone chords.
        const melody = [0,7,12,10,7,3,5,7, 0,3,7,12,15,12,10,7];
        const roots = [146.832,130.813,174.614,130.813];
        while (this.nextNote < ctx.currentTime + .3) {
            const index = this.beat % 16, root = roots[Math.floor(this.beat / 8) % roots.length];
            const t = this.nextNote;
            this.tone(root * 2 ** (melody[index] / 12), t, 1.1, .09, 'sine', undefined, this.music);
            this.tone(root * 2 ** (melody[index] / 12) * 2, t, .65, .018, 'triangle', undefined, this.music);
            if (this.beat % 4 === 0) {
                this.tone(root / 2, t, 2.7, .10, 'sine', undefined, this.music);
                this.tone(root * 1.5, t, 2.3, .035, 'sine', undefined, this.music);
            }
            if (this.mode === 'playing') {
                this.tone(110, t, .16, .085, 'sine', 48, this.music);
            }
            this.beat++;
            this.nextNote += .48;
        }
    }

    hiss(time, duration, volume) {
        const ctx = this.context, source = ctx.createBufferSource();
        source.buffer = this.breathNoise;
        const filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
        filter.type = 'bandpass'; filter.Q.value = .8;
        filter.frequency.setValueAtTime(5200, time);
        filter.frequency.exponentialRampToValueAtTime(1300, time + duration);
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + .08);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        source.connect(filter).connect(envelope).connect(this.master);
        source.start(time); source.stop(time + duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    }

    setMode(mode) {
        this.mode = mode;
        if (!this.context) return;
        const time = this.context.currentTime;
        this.music.gain.setTargetAtTime(mode === 'playing' ? 1.2 : mode === 'failed' ? .24 : .8, time, .25);
    }

    play(name) {
        if (!this.enabled) return;
        this.unlock();
        if (!this.context) return;
        const t = this.context.currentTime;
        if (name === 'eat') {
            this.splash(t, .32, .7, 1500);
            this.tone(540, t, .18, .17, 'sine', 820);
            this.tone(1080, t + .07, .28, .08);
        } else if (name === 'crash') {
            // A long, weakening serpent breath instead of a pitched collision beep.
            this.hiss(t, 1.15, .5);
            this.hiss(t + .55, .8, .23);
            this.hiss(t + 1.05, .65, .12);
        } else if (name === 'hiss') {
            this.hiss(t, .65, .3);
        } else {
            const notes = name === 'win' ? [293.66,369.99,440,587.33,880] : name === 'bonus' ? [587.33,880,1174.66,1760] : [440,330,220];
            notes.forEach((note, i) => this.tone(note, t + i * .12, .65, .16, 'sine'));
            if (name === 'bonus' || name === 'win') this.splash(t, .6, .35, 2200);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        this.unlock();
        if (this.master) this.master.gain.setTargetAtTime(this.enabled ? .65 : 0, this.context.currentTime, .03);
        try { this.storage?.setItem('snake-fantasy-muted', String(!this.enabled)); } catch {}
        return this.enabled;
    }

    setVisible(visible) {
        if (!this.context) return;
        if (!visible) this.context.suspend().catch(() => {});
        else if (this.enabled) this.context.resume().catch(() => {});
    }

    destroy() {
        clearInterval(this.timer);
        this.context?.close().catch(() => {});
    }
}
