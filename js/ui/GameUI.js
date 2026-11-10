/** DOM presentation and action forwarding for the Snake Fantasy app shell. */
export class GameUI {
    constructor(root, { onAction = () => {} } = {}) {
        this.root = root;
        this.onAction = onAction;
        this.screens = new Map([
            ['menu', root.querySelector('#menuScreen')],
            ['levels', root.querySelector('#levelsScreen')],
            ['game', root.querySelector('#gameScreen')]
        ]);
        this.root.addEventListener('click', event => {
            const button = event.target.closest('[data-action]');
            if (!button || button.disabled) return;
            this.onAction(button.dataset.action, button.dataset.level ? Number(button.dataset.level) : null);
        });
        this.root.addEventListener('pointerdown', event => {
            const button = event.target.closest('[data-turn]');
            if (!button) return;
            event.preventDefault();
            this.onAction('turn', button.dataset.turn);
        });
    }

    showScreen(name) {
        for (const [screenName, screen] of this.screens) {
            const active = screenName === name;
            screen.hidden = !active;
            screen.classList.toggle('active', active);
        }
    }

    updateMenu({ bestScore, unlockedLevel }) {
        this.root.querySelector('#menuBestScore').textContent = bestScore;
        this.root.querySelector('#continueLevel').textContent = unlockedLevel;
    }

    renderLevels(levels, unlockedLevel, levelScores) {
        const grid = this.root.querySelector('#levelGrid');
        grid.replaceChildren();
        for (const level of levels) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'level-card';
            button.dataset.action = 'play-level';
            button.dataset.level = String(level.id);
            button.disabled = level.id > unlockedLevel;

            const number = document.createElement('span');
            number.className = 'level-number';
            number.textContent = `LEVEL ${String(level.id).padStart(2, '0')}`;
            const name = document.createElement('strong');
            name.textContent = level.name;
            const detail = document.createElement('small');
            detail.textContent = button.disabled ? 'Locked' : `${level.difficulty} · Best ${Number(levelScores[level.id]) || 0}`;
            button.append(number, name, detail);
            grid.append(button);
        }
    }

    updateGame({ level, score, bestScore, foodsCollected = 0 }) {
        this.root.querySelector('#levelDifficulty').textContent = `LEVEL ${String(level.id).padStart(2, '0')} · ${level.difficulty.toUpperCase()}`;
        this.root.querySelector('#levelName').textContent = level.name;
        this.root.querySelector('#scoreValue').textContent = score;
        this.root.querySelector('#foodValue').textContent = `${foodsCollected} / ${level.targetFoods}`;
        this.root.querySelector('#bestValue').textContent = bestScore;
    }

    showOverlay(name) {
        for (const overlay of this.root.querySelectorAll('.game-overlay')) overlay.hidden = overlay.id !== name;
    }

    hideOverlays() {
        for (const overlay of this.root.querySelectorAll('.game-overlay')) overlay.hidden = true;
    }

    showGameOver({ score, bestScore, reason }) {
        this.root.querySelector('#gameOverTitle').textContent = reason;
        this.root.querySelector('#finalScore').textContent = score;
        this.root.querySelector('#finalBest').textContent = bestScore;
        this.showOverlay('gameOverOverlay');
    }

    showVictory({ score, bestScore, nextLevelAvailable }) {
        this.root.querySelector('#victoryScore').textContent = score;
        this.root.querySelector('#victoryBest').textContent = bestScore;
        this.root.querySelector('#victoryTitle').textContent = nextLevelAvailable ? 'Beautiful run.' : 'You found every trail.';
        const nextButton = this.root.querySelector('#victoryOverlay [data-action="next-level"]');
        nextButton.hidden = !nextLevelAvailable;
        this.showOverlay('victoryOverlay');
    }
}
