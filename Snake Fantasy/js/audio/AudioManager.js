// js/audio/AudioManager.js
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.initialized = false;
    }

    async init() {
        this.soundEnabled = localStorage.getItem('snake_fantasy_sound') !== 'false';
        this.musicEnabled = localStorage.getItem('snake_fantasy_music') !== 'false';
        this.initialized = true;
        return Promise.resolve();
    }

    createSound(name, frequency = 440, duration = 100, type = 'sine') {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + duration / 1000);
            
            this.sounds[name] = { oscillator, gainNode, audioCtx };
        } catch (e) {
            // Silent fallback for audio context issues
        }
    }

    playSound(name) {
        if (!this.soundEnabled || !this.initialized) return;
        
        const soundMap = {
            'eat': { freq: 523, dur: 100, type: 'sine' },
            'levelComplete': { freq: 659, dur: 150, type: 'sine' },
            'gameOver': { freq: 330, dur: 300, type: 'sawtooth' },
            'victory': { freq: 784, dur: 200, type: 'sine' },
            'click': { freq: 440, dur: 50, type: 'sine' }
        };
        
        const config = soundMap[name];
        if (config) {
            this.createSound(name, config.freq, config.dur, config.type);
        }
    }

    playMusic(name) {
        if (!this.musicEnabled || !this.initialized) return;
        // Placeholder - in production would use Web Audio for simple music
        this.createSound('background', 220, 500, 'sine');
        setTimeout(() => {
            if (this.musicEnabled) {
                this.createSound('background', 277, 500, 'sine');
            }
        }, 500);
    }

    stopMusic() {
        // Clean up any playing sounds
        for (const key in this.sounds) {
            try {
                this.sounds[key].oscillator.stop();
            } catch (e) {}
        }
        this.sounds = {};
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('snake_fantasy_sound', String(this.soundEnabled));
        if (!this.soundEnabled) {
            this.stopMusic();
        }
        return this.soundEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('snake_fantasy_music', String(this.musicEnabled));
        if (!this.musicEnabled) {
            this.stopMusic();
        }
        return this.musicEnabled;
    }

    vibrate(pattern = 50) {
        if (navigator.vibrate && localStorage.getItem('snake_fantasy_vibration') !== 'false') {
            navigator.vibrate(pattern);
        }
    }
}