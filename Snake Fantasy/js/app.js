// js/app.js
import { GameEngine } from './engine/GameEngine.js';
import { AudioManager } from './audio/AudioManager.js';
import { StorageManager } from './storage/StorageManager.js';
import { LevelManager } from './levels/LevelManager.js';
import { UIManager } from './ui/UIManager.js';

class SnakeFantasy {
    constructor() {
        this.engine = null;
        this.audio = new AudioManager();
        this.storage = new StorageManager();
        this.levelManager = new LevelManager(this.storage);
        this.ui = new UIManager(this);
        
        this.currentLevel = 1;
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.score = 0;
        this.highScore = 0;
        
        this.init();
    }

    async init() {
        await this.audio.init();
        await this.storage.init();
        
        this.highScore = this.storage.getHighScore();
        this.currentLevel = this.storage.getUnlockedLevel();
        
        this.ui.init();
        this.showSplash();
    }

    showSplash() {
        this.ui.showScreen('splash');
        setTimeout(() => {
            this.ui.showScreen('menu');
            this.ui.updateMenuStats(this.highScore, this.currentLevel);
        }, 2500);
    }

    startGame(level = 1) {
        this.currentLevel = level;
        this.score = 0;
        this.isGameOver = false;
        this.isVictory = false;
        this.isPaused = false;
        
        const levelData = this.levelManager.getLevel(level);
        this.engine = new GameEngine(
            document.getElementById('gameCanvas'),
            levelData,
            this.onScore.bind(this),
            this.onGameOver.bind(this),
            this.onVictory.bind(this)
        );
        
        this.engine.start();
        this.ui.showScreen('game');
        this.ui.updateGameStats(this.score, this.currentLevel, this.highScore);
        this.audio.playMusic('background');
    }

    pauseGame() {
        if (this.engine) {
            this.isPaused = true;
            this.engine.pause();
            this.ui.showOverlay('pause');
        }
    }

    resumeGame() {
        if (this.engine) {
            this.isPaused = false;
            this.engine.resume();
            this.ui.hideOverlay('pause');
            this.audio.playMusic('background');
        }
    }

    quitGame() {
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        if (this.engine) {
            this.engine.destroy();
            this.engine = null;
        }
        this.ui.hideAllOverlays();
        this.ui.showScreen('menu');
        this.ui.updateMenuStats(this.highScore, this.currentLevel);
        this.audio.stopMusic();
    }

    restartGame() {
        this.isGameOver = false;
        this.isVictory = false;
        this.isPaused = false;
        this.ui.hideAllOverlays();
        this.startGame(this.currentLevel);
    }

    nextLevel() {
        this.isVictory = false;
        this.ui.hideAllOverlays();
        const next = this.currentLevel + 1;
        if (this.levelManager.isLevelUnlocked(next)) {
            this.startGame(next);
        } else {
            this.storage.unlockLevel(next);
            this.currentLevel = next;
            this.startGame(next);
        }
    }

    onScore(score) {
        this.score = score;
        this.ui.updateGameStats(this.score, this.currentLevel, this.highScore);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.storage.saveHighScore(this.highScore);
            this.ui.updateMenuStats(this.highScore, this.currentLevel);
        }
    }

    onGameOver() {
        this.isGameOver = true;
        this.audio.playSound('gameOver');
        this.audio.stopMusic();
        this.ui.showGameOver(this.score, this.highScore);
    }

    onVictory() {
        this.isVictory = true;
        this.audio.playSound('victory');
        this.audio.stopMusic();
        this.storage.unlockLevel(this.currentLevel + 1);
        this.ui.showVictory(this.score);
    }

    handleKeyDown(e) {
        if (!this.engine || this.isPaused || this.isGameOver || this.isVictory) return;
        
        const key = e.key;
        const dirMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            's': 'down',
            'a': 'left',
            'd': 'right'
        };
        
        const dir = dirMap[key];
        if (dir) {
            e.preventDefault();
            this.engine.setDirection(dir);
        }
        
        if (key === ' ' || key === 'Escape') {
            e.preventDefault();
            if (this.isPaused) {
                this.resumeGame();
            } else {
                this.pauseGame();
            }
        }
    }

    handleTouchSwipe(startX, startY, endX, endY) {
        if (!this.engine || this.isPaused || this.isGameOver || this.isVictory) return;
        
        const dx = endX - startX;
        const dy = endY - startY;
        
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.engine.setDirection(dx > 0 ? 'right' : 'left');
        } else {
            this.engine.setDirection(dy > 0 ? 'down' : 'up');
        }
    }
}

// Initialize app
const app = new SnakeFantasy();

// Keyboard controls
document.addEventListener('keydown', (e) => app.handleKeyDown(e));

// Touch swipe for canvas
let touchStartX = 0;
let touchStartY = 0;

const canvas = document.getElementById('gameCanvas');
if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (touchStartX === 0 && touchStartY === 0) return;
        const touch = e.changedTouches[0];
        app.handleTouchSwipe(touchStartX, touchStartY, touch.clientX, touch.clientY);
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
}

// Export for UI
window.app = app;