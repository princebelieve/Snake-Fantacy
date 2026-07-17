// js/storage/StorageManager.js
export class StorageManager {
    constructor() {
        this.prefix = 'snake_fantasy_';
        this.highScore = 0;
        this.unlockedLevel = 1;
        this.settings = {
            sound: true,
            music: true,
            vibration: true
        };
    }

    init() {
        this.highScore = this.getHighScore();
        this.unlockedLevel = this.getUnlockedLevel();
        this.settings = this.getSettings();
        return Promise.resolve();
    }

    getHighScore() {
        return parseInt(localStorage.getItem(this.prefix + 'high_score') || '0');
    }

    saveHighScore(score) {
        localStorage.setItem(this.prefix + 'high_score', String(score));
        this.highScore = score;
    }

    getUnlockedLevel() {
        return parseInt(localStorage.getItem(this.prefix + 'unlocked_level') || '1');
    }

    unlockLevel(level) {
        const current = this.getUnlockedLevel();
        if (level > current) {
            localStorage.setItem(this.prefix + 'unlocked_level', String(level));
            this.unlockedLevel = level;
        }
    }

    isLevelUnlocked(level) {
        return level <= this.getUnlockedLevel();
    }

    getSettings() {
        try {
            const data = localStorage.getItem(this.prefix + 'settings');
            return data ? JSON.parse(data) : this.settings;
        } catch {
            return this.settings;
        }
    }

    saveSettings(settings) {
        localStorage.setItem(this.prefix + 'settings', JSON.stringify(settings));
        this.settings = settings;
    }

    getSoundEnabled() {
        return this.settings.sound;
    }

    getMusicEnabled() {
        return this.settings.music;
    }

    getVibrationEnabled() {
        return this.settings.vibration;
    }
}