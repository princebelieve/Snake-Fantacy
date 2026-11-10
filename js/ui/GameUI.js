/** DOM presentation and action forwarding for Amara's Fantacy. */
export class GameUI {
    constructor(root, { onAction = () => {} } = {}) {
        this.root = root;
        this.onAction = onAction;
        this.screens = new Map([
            ['boot', root.querySelector('#bootScreen')],
            ['loading', root.querySelector('#loadingScreen')],
            ['menu', root.querySelector('#menuScreen')],
            ['story', root.querySelector('#storyScreen')],
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
        this.root.querySelector('.app-shell')?.setAttribute('data-screen', name);
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

    showStory(level, text) {
        this.root.querySelector('#storyChapter').textContent = `CHAPTER ${String(level.id).padStart(2, '0')} · ${level.storyArc?.name || level.difficulty.toUpperCase()}`;
        this.root.querySelector('#storyTitle').textContent = level.id === 1 ? 'A mother becomes the river serpent' : level.name;
        this.root.querySelector('#storyNarrative').textContent = text;
        this.showScreen('story');
    }

    showTutorial(stepIndex) {
        const lessons = [
            { focus: ['.score-strip', '.goal-ribbon'], title: 'Read your river signs', body: 'OFFERINGS is the chapter goal; SCORE is your points; PERSONAL BEST is your record; SPECIAL FRUIT is its countdown. The ribbon tracks goal and leaf-score progress. Sound toggles effects, the left arrow opens the menu, and pause stops the run.' },
            { focus: ['.canvas-frame'], title: 'Follow the food', body: 'Guide Amara’s head to the red apple. Each apple, spirit fish, or water orb stays until you eat it, adds to your goal, and grows the serpent. The golden lightning spark is worth five times the last regular fruit’s points; missing it only loses those bonus points.' },
            { focus: ['.canvas-frame', '.mobile-controls'], title: 'Steer clear of danger', body: 'Turn with the arrow keys, WASD, a swipe, or the touch pad. The marked gray rocks, riverbank, and Amara’s own body end the run on contact. Plan wide turns before the serpent gets long.' }
        ];
        const lesson = lessons[stepIndex];
        for (const element of this.root.querySelectorAll('.tutorial-focus')) element.classList.remove('tutorial-focus');
        for (const selector of lesson.focus) this.root.querySelector(selector)?.classList.add('tutorial-focus');
        this.root.querySelector('#tutorialStep').textContent = `RIVER LESSON ${stepIndex + 1} OF ${lessons.length}`;
        this.root.querySelector('#tutorialTitle').textContent = lesson.title;
        this.root.querySelector('#tutorialBody').textContent = lesson.body;
        this.root.querySelector('#tutorialNext').textContent = stepIndex === lessons.length - 1 ? 'PLAY CHAPTER 01' : 'NEXT';
        this.tutorialStepCount = lessons.length;
        this.root.querySelector('#tutorialOverlay').hidden = false;
    }

    hideTutorial() {
        this.root.querySelector('#tutorialOverlay').hidden = true;
        for (const element of this.root.querySelectorAll('.tutorial-focus')) element.classList.remove('tutorial-focus');
    }

    renderLevels(levels, unlockedLevel, levelScores, levelStars = {}) {
        const grid = this.root.querySelector('#levelGrid');
        grid.replaceChildren();
        for (const level of levels) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'level-card';
            button.dataset.action = 'play-level';
            button.dataset.level = String(level.id);
            button.disabled = level.id > unlockedLevel;
            button.classList.toggle('current-chapter', level.id === unlockedLevel);
            if (level.id === unlockedLevel) button.setAttribute('aria-current', 'step');

            const number = document.createElement('span');
            number.className = 'level-number';
            number.textContent = `CHAPTER ${String(level.id).padStart(2, '0')}`;
            const name = document.createElement('strong');
            name.textContent = level.name;
            const detail = document.createElement('small');
            const stars = Number(levelStars[level.id]) || 0;
            detail.textContent = button.disabled ? 'SEALED' : `${level.storyArc?.name || level.difficulty} · BEST ${Number(levelScores[level.id]) || 0}`;
            button.append(number, name, detail);
            if (!button.disabled) {
                const rating = document.createElement('span');
                rating.className = 'level-stars';
                rating.textContent = `${'✿ '.repeat(stars)}${'· '.repeat(3 - stars)}`.trim();
                button.append(rating);
            }
            grid.append(button);
        }
    }

    updateGame({ level, score, bestScore, foodsCollected = 0, regularScore = 0 }) {
        this.root.querySelector('#levelDifficulty').textContent = `CHAPTER ${String(level.id).padStart(2, '0')} · ${level.difficulty.toUpperCase()}`;
        this.root.querySelector('#levelName').textContent = level.name;
        this.root.querySelector('#levelForm').textContent = `AWAKENED POWER · ${level.storyArc?.power || 'SERPENT FORM'}`;
        this.root.querySelector('#scoreValue').textContent = score;
        this.root.querySelector('#foodValue').textContent = `${foodsCollected} / ${level.targetFoods}`;
        this.root.querySelector('#bestValue').textContent = bestScore;
        this.root.querySelector('#goalText').textContent = `Gather ${level.targetFoods} offerings · avoid rocks and your tail`;
        this.root.querySelector('#goalProgress').textContent = `${foodsCollected}/${level.targetFoods} · ${regularScore}/${level.targetScore || 0}`;
        this.root.querySelector('#goalProgress').title = `${foodsCollected} of ${level.targetFoods} fruit · ${regularScore} of ${level.targetScore || 0} points toward three leaves`;
        this.root.querySelector('#bonusClock').textContent = 'AFTER 5 FRUIT';
    }

    updateBonus({ event, remaining, duration }) {
        const clock = this.root.querySelector('#bonusClock');
        if (event === 'spawn' || event === 'tick') clock.textContent = `BONUS ${Math.max(0, remaining).toFixed(1)}s`;
        else if (event === 'collect') clock.textContent = `+${remaining} BONUS`;
        else if (event === 'expire') clock.textContent = `AFTER ${duration || 5} FRUIT`;
        else if (event === 'regular-count') clock.textContent = remaining > 0 ? `AFTER ${remaining} FRUIT` : 'BONUS!';
    }

    setSoundState(enabled) {
        const button = this.root.querySelector('[data-action="sound"]');
        button.innerHTML = enabled ? '♫ <span>Sound on</span>' : '♫ <span>Sound off</span>';
        button.setAttribute('aria-pressed', String(enabled));
    }

    showOverlay(name) {
        for (const overlay of this.root.querySelectorAll('.game-overlay')) overlay.hidden = overlay.id !== name;
    }

    hideOverlays() {
        for (const overlay of this.root.querySelectorAll('.game-overlay')) overlay.hidden = true;
    }

    showGameOver({ score, bestScore, reason }) {
        const readableReason = {
            'Garden edge': 'Amara reached the riverbank wall.',
            'Rock collision': 'Amara struck a river rock. Watch for the visible rocks in the water.',
            'Snake collision': "Amara's serpent crossed its own body."
        }[reason] || reason;
        this.root.querySelector('#gameOverTitle').textContent = readableReason;
        this.root.querySelector('#finalScore').textContent = score;
        this.root.querySelector('#finalBest').textContent = bestScore;
        this.showOverlay('gameOverOverlay');
    }

    showVictory({ score, bestScore, nextLevelAvailable, stars = 1, targetScore = 0, finalChapter = false, formAwakened = false, chapterId = 1, formName = '', powerName = '', ending = '' }) {
        this.root.querySelector('#victoryScore').textContent = score;
        this.root.querySelector('#victoryBest').textContent = bestScore;
        this.root.querySelector('#victoryTitle').textContent = finalChapter ? 'Amara defeats Victor!' : formAwakened ? `${formName} awakened!` : 'The current carries Amara onward.';
        this.root.querySelector('#earnedStars').textContent = `${'✿ '.repeat(stars)}${'· '.repeat(3 - stars)}`.trim();
        this.root.querySelector('#prizeLine').textContent = finalChapter ? ending : `${powerName} awakens · Chapter ${chapterId + 1} opens · ${stars} leaves earned`;
        const nextButton = this.root.querySelector('#victoryOverlay [data-action="next-level"]');
        nextButton.hidden = !nextLevelAvailable;
        this.showOverlay('victoryOverlay');
    }
}
