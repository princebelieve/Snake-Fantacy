import { GameRuntime } from '../../engine/GameRuntime.js';
import { SaveStore } from '../../engine/SaveStore.js';
import { JsonConfigLoader } from '../../engine/JsonConfigLoader.js';
import { GameUI } from '../../ui/GameUI.js';
import { LevelManager } from './LevelManager.js';
import { ProgressManager } from './ProgressManager.js';
import { SnakeScene } from '../SnakeScene.js';
import { SnakeAssets } from './SnakeAssets.js';
import { SoundManager } from './SoundManager.js';

/** Coordinates the Snake game flow while UI and gameplay remain separate systems. */
export class GameManager {
    constructor({ canvas, root = null, runtime = null, levelManager = null, progressManager = null, ui = null, soundManager = null } = {}) {
        this.runtime = runtime || new GameRuntime(canvas);
        this.levelManager = levelManager || new LevelManager(new JsonConfigLoader());
        this.progressManager = progressManager;
        this.ui = ui || new GameUI(root || document, { onAction: (action, value) => this.handleAction(action, value) });
        this.soundManager = soundManager || new SoundManager();
        this.assets = {};
        this.currentLevel = 1;
        this.currentScore = 0;
        this.currentFoods = 0;
        this.state = 'booting';
        this.touchStart = null;
        this.bindInput();
        this.runtime.events.on('scene:entered', scene => this.runtime.events.emit('game:scene-ready', scene?.constructor?.name));
    }

    async initialize() {
        this.ui.showScreen('boot');
        await new Promise(resolve => setTimeout(resolve, 750));
        this.ui.showScreen('loading');
        await new Promise(resolve => setTimeout(resolve, 350));
        this.assets = await SnakeAssets.load();
        await this.levelManager.initialize();
        if (!this.progressManager) this.progressManager = new ProgressManager(
            new SaveStore('snake-fantasy-progress', { version: 1 }), this.levelManager.getTotalLevels()
        );
        this.progressManager.initialize();
        this.ui.setSoundState?.(this.soundManager.enabled);
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
            if (['Space', 'KeyP'].includes(event.code) && !event.repeat && !event.target?.closest?.('button, input, textarea, select')) {
                event.preventDefault();
                this.handleAction(this.state === 'paused' ? 'resume' : 'pause');
            }
        });
        const canvas = this.runtime.canvas;
        this.trackpadStroke = null;
        window.addEventListener('wheel', this.handleTrackpadSwipe = event => {
            if (event.ctrlKey || this.state !== 'playing' || this.ui.screens.get('game')?.hidden) {
                this.trackpadStroke = null;
                return;
            }
            // Two-finger touchpad swipes are wheel events, not pointer movements.
            event.preventDefault();
            const time = event.timeStamp;
            if (!this.trackpadStroke || time - this.trackpadStroke.time > 160) {
                this.trackpadStroke = { x: 0, y: 0, time };
            }
            const stroke = this.trackpadStroke;
            const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1;
            const dx = event.deltaX * scale, dy = event.deltaY * scale;
            const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            const sign = Math.sign(axis === 'x' ? dx : dy);
            // A fresh stroke must not first cancel leftover movement from the last one.
            if (stroke.axis !== axis || stroke.sign !== sign) { stroke.x = 0; stroke.y = 0; }
            stroke.axis = axis; stroke.sign = sign;
            stroke.x += dx;
            stroke.y += dy;
            stroke.time = time;
            if (Math.max(Math.abs(stroke.x), Math.abs(stroke.y)) < 5) return;
            const direction = Math.abs(stroke.x) > Math.abs(stroke.y)
                ? (stroke.x > 0 ? 'Left' : 'Right') : (stroke.y > 0 ? 'Up' : 'Down');
            this.steer(direction);
            stroke.x = 0; stroke.y = 0;
        }, { passive: false });
        this.mouseAnchor = null;
        window.addEventListener('pointermove', this.handleMouseMove = event => {
            if (event.pointerType !== 'mouse') return;
            if (this.state !== 'playing' || this.ui.screens.get('game')?.hidden) {
                this.mouseAnchor = null;
                return;
            }
            const point = { x: event.clientX, y: event.clientY };
            if (!this.mouseAnchor) { this.mouseAnchor = point; return; }
            const dx = point.x - this.mouseAnchor.x, dy = point.y - this.mouseAnchor.y;
            // Ignore small hand tremors; every deliberate stroke chooses its dominant axis.
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
            const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : (dy > 0 ? 'Down' : 'Up');
            this.steer(direction);
            this.mouseAnchor = point;
        });
        window.addEventListener('mouseout', this.handleMouseLeave = event => {
            if (!event.relatedTarget) this.mouseAnchor = null;
        });
        window.addEventListener('blur', this.handleMouseBlur = () => { this.mouseAnchor = null; });
        canvas.addEventListener('pointerdown', this.handlePointerDown = event => {
            if (event.pointerType === 'mouse' || this.state !== 'playing' || this.ui.screens.get('game')?.hidden) return;
            this.touchStart = { x: event.clientX, y: event.clientY };
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointerup', this.handlePointerUp = event => {
            if (!this.touchStart) return;
            const dx = event.clientX - this.touchStart.x;
            const dy = event.clientY - this.touchStart.y;
            this.touchStart = null;
            if (this.state !== 'playing') return;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
            const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : (dy > 0 ? 'Down' : 'Up');
            this.runtime.input.trigger(`snake${direction}`);
        });
        canvas.addEventListener('pointercancel', this.handlePointerCancel = () => { this.touchStart = null; this.mouseAnchor = null; });
    }

    async handleAction(action, value) {
        this.soundManager.unlock?.();
        switch (action) {
            case 'start': return this.openStory(this.progressManager.getUnlockedLevel());
            case 'begin-story': return this.playLevel(this.currentLevel, { tutorial: !this.progressManager.data.hasSeenTutorial && this.currentLevel === 1 });
            case 'start-chapter': return this.beginChapter();
            case 'tutorial-next': return this.advanceTutorial(false);
            case 'tutorial-skip': return this.advanceTutorial(true);
            case 'levels': this.runtime.pause(); this.state = 'levels'; this.soundManager.setMode?.('menu'); this.refreshLevelsUI(); this.ui.showScreen('levels'); break;
            case 'menu': this.showMenu(); break;
            case 'play-level': return this.openStory(value);
            case 'pause': this.pauseGame(); break;
            case 'resume': this.resumeGame(); break;
            case 'restart': return this.playLevel(this.currentLevel);
            case 'next-level': return this.openStory(this.currentLevel + 1);
            case 'turn': if (this.state === 'playing') this.runtime.input.trigger(`snake${value[0].toUpperCase()}${value.slice(1)}`); break;
            case 'sound': this.ui.setSoundState(this.soundManager.toggle()); break;
        }
    }

    steer(direction) {
        if (this.state !== 'playing') return;
        if (this.runtime.scene?.requestTurn) this.runtime.scene.requestTurn(direction.toLowerCase());
        else this.runtime.input.trigger(`snake${direction}`);
    }

    openStory(levelId) {
        if (!this.progressManager.isUnlocked(levelId)) return;
        this.currentLevel = Number(levelId);
        const level = this.levelManager.getLevel(this.currentLevel);
        const narrative = this.currentLevel === 1 ? this.levelManager.story.prologue : level.storyArc?.story || '';
        this.ui.showStory(level, narrative);
        this.state = 'story';
        this.soundManager.setMode?.('story');
    }

    async playLevel(levelId, { tutorial = false } = {}) {
        if (!this.progressManager.isUnlocked(levelId)) return;
        this.currentLevel = Number(levelId);
        this.currentScore = 0;
        this.currentFoods = 0;
        this.ui.hideTutorial?.();
        this.runtime.pause();
        this.state = 'loading-level';
        this.ui.showScreen('loading');
        await new Promise(resolve => setTimeout(resolve, 250));
        const level = this.levelManager.getLevel(this.currentLevel);
        const scene = new SnakeScene(level, {
            assets: this.assets,
            onScore: (score, currentLevel, foodsCollected, regularScore) => this.updateScore(score, currentLevel, foodsCollected, regularScore),
            onGameOver: (reason, score) => this.finishLevel(reason, score),
            onVictory: result => this.completeLevel(result),
            onBonus: (event, value, duration) => this.handleBonusEvent(event, value, duration)
        });
        this.ui.hideOverlays();
        this.ui.showScreen('game');
        this.runtime.resize?.();
        await this.runtime.setScene(scene);
        this.ui.updateGame({ level, score: 0, bestScore: this.progressManager.getBestScore(), foodsCollected: 0 });
        if (tutorial) {
            this.state = 'tutorial';
            this.tutorialStep = 0;
            this.ui.showTutorial(0);
            this.runtime.render?.(0);
        } else {
            this.waitForStart();
        }
    }

    advanceTutorial(skip) {
        if (this.state !== 'tutorial') return;
        if (!skip && this.tutorialStep + 1 < this.ui.tutorialStepCount) {
            this.tutorialStep++;
            this.ui.showTutorial(this.tutorialStep);
            return;
        }
        this.progressManager.markTutorialSeen();
        this.ui.hideTutorial();
        this.waitForStart();
    }

    waitForStart() {
        this.state = 'ready';
        this.mouseAnchor = null;
        this.touchStart = null;
        this.runtime.pause();
        this.soundManager.setMode?.('ready');
        this.ui.showOverlay('readyOverlay');
        this.runtime.render?.(0);
    }

    beginChapter() {
        if (this.state !== 'ready') return;
        this.state = 'playing';
        this.ui.hideOverlays();
        this.startRuntime();
    }

    startRuntime() {
        this.trackpadStroke = null;
        this.mouseAnchor = null;
        this.soundManager.setMode?.('playing');
        this.soundManager.play('hiss');
        if (this.runtime.running) this.runtime.resume();
        else this.runtime.start();
    }

    updateScore(score, level, foodsCollected, regularScore = 0) {
        this.currentScore = score;
        this.currentFoods = foodsCollected;
        this.ui.updateGame({ level, score, bestScore: this.progressManager.getBestScore(), foodsCollected, regularScore });
    }

    handleBonusEvent(event, value, duration) {
        if (event === 'eat') this.soundManager.play('eat');
        if (event === 'collect') this.soundManager.play('bonus');
        if (event === 'expire') this.soundManager.play('expire');
        this.ui.updateBonus?.({ event, remaining: value, duration });
    }

    finishLevel(reason, score) {
        this.state = 'failed';
        this.soundManager.setMode?.('failed');
        this.progressManager.recordScore(this.currentLevel, score);
        this.currentScore = score;
        this.runtime.pause();
        this.soundManager.play('crash');
        this.refreshProgressUI();
        this.ui.showGameOver({ score, bestScore: this.progressManager.getBestScore(), reason });
    }

    completeLevel({ score, regularScore = 0 }) {
        this.state = 'won';
        this.soundManager.setMode?.('won');
        const level = this.levelManager.getLevel(this.currentLevel);
        const nextLevelAvailable = this.currentLevel < this.levelManager.getTotalLevels();
        const nextLevel = nextLevelAvailable ? this.levelManager.getLevel(this.currentLevel + 1) : null;
        const scoreRatio = regularScore / Math.max(1, level.targetScore || 0);
        const stars = scoreRatio >= 1 ? 3 : scoreRatio >= .75 ? 2 : 1;
        this.progressManager.completeLevel(this.currentLevel, score, stars);
        this.soundManager.play('win');
        this.runtime.pause();
        this.refreshProgressUI();
        this.ui.showVictory({
            score,
            bestScore: this.progressManager.getBestScore(),
            nextLevelAvailable,
            stars,
            targetScore: level.targetScore || 0,
            chapterId: this.currentLevel,
            finalChapter: !nextLevelAvailable,
            formAwakened: Boolean(nextLevel && this.currentLevel % 10 === 0),
            formName: nextLevel?.storyArc?.form || level.storyArc?.form || 'River Serpent',
            powerName: nextLevel?.storyArc?.power || level.storyArc?.power || 'Serpent form',
            ending: this.currentLevel === this.levelManager.getTotalLevels() ? this.levelManager.story.ending : ''
        });
    }

    pauseGame() {
        if (this.state !== 'playing' || !this.runtime.running || this.runtime.paused) return;
        this.state = 'paused';
        this.soundManager.setMode?.('paused');
        this.runtime.pause();
        this.ui.showOverlay('pauseOverlay');
    }

    resumeGame() {
        if (this.state !== 'paused' || !this.runtime.running) return;
        this.state = 'playing';
        this.trackpadStroke = null;
        this.mouseAnchor = null;
        this.soundManager.setMode?.('playing');
        this.ui.hideOverlays();
        this.runtime.resume();
    }

    showMenu() {
        if (this.runtime.running) this.runtime.pause();
        this.state = 'menu';
        this.soundManager.setMode?.('menu');
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
        this.ui.renderLevels(this.levelManager.list(), this.progressManager.getUnlockedLevel(), this.progressManager.data.levelScores, this.progressManager.data.levelStars);
    }

    destroy() {
        window.removeEventListener('wheel', this.handleTrackpadSwipe);
        window.removeEventListener('pointermove', this.handleMouseMove);
        window.removeEventListener('mouseout', this.handleMouseLeave);
        window.removeEventListener('blur', this.handleMouseBlur);
        for (const [type, handler] of [['pointerdown', this.handlePointerDown], ['pointerup', this.handlePointerUp], ['pointercancel', this.handlePointerCancel]]) {
            this.runtime.canvas.removeEventListener(type, handler);
        }
        this.soundManager.destroy?.();
        window.removeEventListener('keydown', this.handleBrowserKeyDown);
        this.runtime.destroy();
    }
}
