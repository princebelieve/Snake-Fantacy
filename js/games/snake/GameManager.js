import { GameRuntime } from '../../engine/GameRuntime.js';
import { SaveStore } from '../../engine/SaveStore.js';
import { JsonConfigLoader } from '../../engine/JsonConfigLoader.js';
import { GameUI } from '../../ui/GameUI.js';
import { LevelManager } from './LevelManager.js';
import { ProgressManager } from './ProgressManager.js';
import { SnakeScene } from '../SnakeScene.js';

/** Coordinates the Snake game flow while UI and gameplay remain separate systems. */
export class GameManager {
    constructor({ canvas, root = null, runtime = null, levelManager = null, progressManager = null, ui = null } = {}) {
        this.runtime = runtime || new GameRuntime(canvas);
        this.levelManager = levelManager || new LevelManager(new JsonConfigLoader());
        this.progressManager = progressManager;
        this.ui = ui || new GameUI(root || document, { onAction: (action, value) => this.handleAction(action, value) });
        this.currentLevel = 1;
        this.currentScore = 0;
        this.currentFoods = 0;
        this.state = 'booting';
        this.touchStart = null;
        this.bindInput();
        this.runtime.events.on('scene:entered', scene => this.runtime.events.emit('game:scene-ready', scene?.constructor?.name));
    }

    async initialize() {
        await this.levelManager.initialize();
        if (!this.progressManager) this.progressManager = new ProgressManager(
            new SaveStore('snake-fantasy-progress', { version: 1 }), this.levelManager.getTotalLevels()
        );
        this.progressManager.initialize();
        this.refreshProgressUI();
        this.state = 'menu';
        this.ui.showScreen('menu');
        return this;
    }

    bindInput() {
        this.runtime.input
            .bind('snakeUp', ['ArrowUp', 'KeyW'])
            .bind('snakeDown', ['ArrowDown', 'KeyS'])
            .bind('snakeLeft', ['ArrowLeft', 'KeyA'])
            .bind('snakeRight', ['ArrowRight', 'KeyD']);
        window.addEventListener('keydown', this.handleBrowserKeyDown = event => {
            if (this.ui.screens.get('game')?.hidden) return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
            if (event.code === 'Escape') this.handleAction(this.state === 'paused' ? 'resume' : 'pause');
        });
        const canvas = this.runtime.canvas;
        canvas.addEventListener('pointerdown', this.handlePointerDown = event => {
            if (this.ui.screens.get('game')?.hidden) return;
            this.touchStart = { x: event.clientX, y: event.clientY };
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointerup', this.handlePointerUp = event => {
            if (!this.touchStart) return;
            const dx = event.clientX - this.touchStart.x;
            const dy = event.clientY - this.touchStart.y;
            this.touchStart = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
            const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : (dy > 0 ? 'Down' : 'Up');
            this.runtime.input.trigger(`snake${direction}`);
        });
        canvas.addEventListener('pointercancel', () => { this.touchStart = null; });
    }

    async handleAction(action, value) {
        switch (action) {
            case 'start': return this.playLevel(this.progressManager.getUnlockedLevel());
            case 'levels': this.refreshLevelsUI(); this.ui.showScreen('levels'); break;
            case 'menu': this.showMenu(); break;
            case 'play-level': return this.playLevel(value);
            case 'pause': this.pauseGame(); break;
            case 'resume': this.resumeGame(); break;
            case 'restart': return this.playLevel(this.currentLevel);
            case 'next-level': return this.playLevel(this.currentLevel + 1);
            case 'turn': if (this.state === 'playing') this.runtime.input.trigger(`snake${value[0].toUpperCase()}${value.slice(1)}`); break;
        }
    }

    async playLevel(levelId) {
        if (!this.progressManager.isUnlocked(levelId)) return;
        this.currentLevel = Number(levelId);
        this.currentScore = 0;
        this.currentFoods = 0;
        this.state = 'loading-level';
        const level = this.levelManager.getLevel(this.currentLevel);
        const scene = new SnakeScene(level, {
            onScore: (score, currentLevel, foodsCollected) => this.updateScore(score, currentLevel, foodsCollected),
            onGameOver: (reason, score) => this.finishLevel(reason, score),
            onVictory: result => this.completeLevel(result)
        });
        this.ui.hideOverlays();
        this.ui.showScreen('game');
        this.runtime.resize?.();
        await this.runtime.setScene(scene);
        this.state = 'playing';
        this.ui.updateGame({ level, score: 0, bestScore: this.progressManager.getBestScore(), foodsCollected: 0 });
        this.startRuntime();
    }

    startRuntime() {
        if (this.runtime.running) this.runtime.resume();
        else this.runtime.start();
    }

    updateScore(score, level, foodsCollected) {
        this.currentScore = score;
        this.currentFoods = foodsCollected;
        this.ui.updateGame({ level, score, bestScore: this.progressManager.getBestScore(), foodsCollected });
    }

    finishLevel(reason, score) {
        this.state = 'failed';
        this.progressManager.recordScore(this.currentLevel, score);
        this.currentScore = score;
        this.runtime.pause();
        this.refreshProgressUI();
        this.ui.showGameOver({ score, bestScore: this.progressManager.getBestScore(), reason });
    }

    completeLevel({ score }) {
        this.state = 'won';
        this.progressManager.completeLevel(this.currentLevel, score);
        this.runtime.pause();
        this.refreshProgressUI();
        this.ui.showVictory({
            score,
            bestScore: this.progressManager.getBestScore(),
            nextLevelAvailable: this.currentLevel < this.levelManager.getTotalLevels()
        });
    }

    pauseGame() {
        if (this.state !== 'playing' || !this.runtime.running || this.runtime.paused) return;
        this.state = 'paused';
        this.runtime.pause();
        this.ui.showOverlay('pauseOverlay');
    }

    resumeGame() {
        if (this.state !== 'paused' || !this.runtime.running) return;
        this.state = 'playing';
        this.ui.hideOverlays();
        this.runtime.resume();
    }

    showMenu() {
        if (this.runtime.running) this.runtime.pause();
        this.state = 'menu';
        this.ui.hideOverlays();
        this.refreshProgressUI();
        this.ui.showScreen('menu');
    }

    refreshProgressUI() {
        this.ui.updateMenu({
            bestScore: this.progressManager.getBestScore(),
            unlockedLevel: this.progressManager.getUnlockedLevel()
        });
        this.refreshLevelsUI();
    }

    refreshLevelsUI() {
        this.ui.renderLevels(this.levelManager.list(), this.progressManager.getUnlockedLevel(), this.progressManager.data.levelScores);
    }

    destroy() {
        window.removeEventListener('keydown', this.handleBrowserKeyDown);
        this.runtime.destroy();
    }
}
