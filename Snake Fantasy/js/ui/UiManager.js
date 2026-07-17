// js/ui/UIManager.js
export class UIManager {
    constructor(app) {
        this.app = app;
        this.screens = {};
        this.overlays = {};
        this.currentScreen = null;
        this.audio = app.audio;
        this.storage = app.storage;
        this.levelManager = app.levelManager;
    }

    init() {
        this.screens = {
            splash: document.getElementById('splash'),
            menu: document.getElementById('menu'),
            game: document.getElementById('game'),
            levels: document.getElementById('levelsScreen'),
            settings: document.getElementById('settingsScreen')
        };
        
        this.overlays = {
            pause: document.getElementById('pauseOverlay'),
            gameOver: document.getElementById('gameOverOverlay'),
            victory: document.getElementById('victoryOverlay')
        };
        
        this.setupEventListeners();
        this.setupToggles();
    }

    setupEventListeners() {
        // Menu buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.audio.playSound('click');
                const action = btn.dataset.action;
                switch(action) {
                    case 'start':
                        this.app.startGame(this.app.currentLevel);
                        break;
                    case 'resume':
                        this.app.resumeGame();
                        break;
                    case 'levels':
                        this.showLevels();
                        break;
                    case 'settings':
                        this.showSettings();
                        break;
                    case 'backMenu':
                        this.showScreen('menu');
                        break;
                }
            });
        });
        
        // Game controls
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.pauseGame();
            });
        }
        
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.resumeGame();
            });
        }
        
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.quitGame();
            });
        }
        
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.restartGame();
            });
        }
        
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.quitGame();
            });
        }
        
        const nextLevelBtn = document.getElementById('nextLevelBtn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.nextLevel();
            });
        }
        
        const victoryMenuBtn = document.getElementById('victoryMenuBtn');
        if (victoryMenuBtn) {
            victoryMenuBtn.addEventListener('click', () => {
                this.audio.playSound('click');
                this.app.quitGame();
            });
        }
        
        // Touch controls
        document.querySelectorAll('.touch-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.audio.playSound('click');
                const dir = btn.dataset.dir;
                if (this.app.engine) {
                    this.app.engine.setDirection(dir);
                }
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.audio.playSound('click');
                const dir = btn.dataset.dir;
                if (this.app.engine) {
                    this.app.engine.setDirection(dir);
                }
            });
        });
    }

    setupToggles() {
        const soundToggle = document.getElementById('soundToggle');
        const musicToggle = document.getElementById('musicToggle');
        const vibrationToggle = document.getElementById('vibrationToggle');
        
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const enabled = this.audio.toggleSound();
                const track = soundToggle.querySelector('.toggle-track');
                if (track) track.classList.toggle('active', enabled);
                this.storage.saveSettings({
                    sound: enabled,
                    music: this.audio.musicEnabled,
                    vibration: this.storage.settings.vibration
                });
            });
        }
        
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                const enabled = this.audio.toggleMusic();
                const track = musicToggle.querySelector('.toggle-track');
                if (track) track.classList.toggle('active', enabled);
                this.storage.saveSettings({
                    sound: this.audio.soundEnabled,
                    music: enabled,
                    vibration: this.storage.settings.vibration
                });
            });
        }
        
        if (vibrationToggle) {
            vibrationToggle.addEventListener('click', () => {
                const enabled = !this.storage.settings.vibration;
                this.storage.settings.vibration = enabled;
                this.storage.saveSettings(this.storage.settings);
                const track = vibrationToggle.querySelector('.toggle-track');
                if (track) track.classList.toggle('active', enabled);
                if (enabled) this.audio.vibrate(30);
            });
        }
        
        // Set initial states
        if (soundToggle) {
            const track = soundToggle.querySelector('.toggle-track');
            if (track) track.classList.toggle('active', this.audio.soundEnabled);
        }
        if (musicToggle) {
            const track = musicToggle.querySelector('.toggle-track');
            if (track) track.classList.toggle('active', this.audio.musicEnabled);
        }
        if (vibrationToggle) {
            const track = vibrationToggle.querySelector('.toggle-track');
            if (track) track.classList.toggle('active', this.storage.settings.vibration);
        }
    }

    showScreen(id) {
        Object.values(this.screens).forEach(el => {
            if (el) el.classList.remove('active');
        });
        if (this.screens[id]) {
            this.screens[id].classList.add('active');
            this.currentScreen = id;
        }
    }

    showOverlay(id) {
        if (this.overlays[id]) {
            this.overlays[id].style.display = 'flex';
        }
    }

    hideOverlay(id) {
        if (this.overlays[id]) {
            this.overlays[id].style.display = 'none';
        }
    }

    hideAllOverlays() {
        Object.values(this.overlays).forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    showGameOver(score, highScore) {
        const finalScore = document.getElementById('finalScore');
        const finalHigh = document.getElementById('finalHigh');
        if (finalScore) finalScore.textContent = score;
        if (finalHigh) finalHigh.textContent = highScore;
        this.showOverlay('gameOver');
    }

    showVictory(score) {
        const victoryScore = document.getElementById('victoryScore');
        if (victoryScore) victoryScore.textContent = score;
        this.showOverlay('victory');
    }

    showLevels() {
        const list = document.getElementById('levelList');
        if (!list) return;
        
        list.innerHTML = '';
        const total = this.levelManager.getTotalLevels();
        
        for (let i = 1; i <= total; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn'; Pop
            const unlocked = this.levelManager.isLevelUnlocked(i);
            const current = i === this.app.currentLevel;
            
            btn.textContent = i;
            if (unlocked) btn.classList.add('unlocked');
            if (!unlocked) btn.classList.add('locked');
            if (current) btn.classList.add('current');
            
            if (unlocked) {
                btn.addEventListener('click', () => {
                    this.audio.playSound('click');
                    this.app.currentLevel = i;
                    this.showScreen('menu');
                    this.updateMenuStats(this.app.highScore, this.app.currentLevel);
                    this.app.startGame(i);
                });
            }
            
            list.appendChild(btn);
        }
        
        this.showScreen('levels');
    }

    showSettings() {
        this.showScreen('settings');
    }

    updateMenuStats(highScore, level) {
        const highEl = document.getElementById('menuHighScore');
        const levelEl = document.getElementById('menuLevel');
        if (highEl) highEl.textContent = highScore;
        if (levelEl) levelEl.textContent = level;
    }

    updateGameStats(score, level, highScore) {
        const scoreEl = document.getElementById('scoreDisplay');
        const levelEl = document.getElementById('levelDisplay');
        const highEl = document.getElementById('highDisplay');
        if (scoreEl) scoreEl.textContent = score;
        if (levelEl) levelEl.textContent = level;
        if (highEl) highEl.textContent = highScore;
    }
}
