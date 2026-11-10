/** Snake progression backed by the engine's game-namespaced SaveStore. */
export class ProgressManager {
    constructor(saveStore, totalLevels) {
        this.saveStore = saveStore;
        this.totalLevels = totalLevels;
        this.data = { unlockedLevel: 1, bestScore: 0, levelScores: {}, levelStars: {}, hasSeenTutorial: false };
    }

    initialize() {
        const saved = this.saveStore.load(this.data);
        this.data = {
            unlockedLevel: this.clampLevel(saved.unlockedLevel),
            bestScore: Number.isFinite(saved.bestScore) ? Math.max(0, saved.bestScore) : 0,
            levelScores: saved.levelScores && typeof saved.levelScores === 'object' ? saved.levelScores : {},
            levelStars: saved.levelStars && typeof saved.levelStars === 'object' ? saved.levelStars : {},
            hasSeenTutorial: Boolean(saved.hasSeenTutorial)
        };
        return this;
    }

    isUnlocked(level) { return Number(level) <= this.data.unlockedLevel; }
    getUnlockedLevel() { return this.data.unlockedLevel; }
    getBestScore() { return this.data.bestScore; }
    getLevelScore(level) { return Number(this.data.levelScores[level]) || 0; }

    recordScore(level, score) {
        this.data.bestScore = Math.max(this.data.bestScore, Number(score) || 0);
        this.data.levelScores[level] = Math.max(this.getLevelScore(level), Number(score) || 0);
        this.persist();
    }

    completeLevel(level, score, stars = 1) {
        this.recordScore(level, score);
        this.data.levelStars[level] = Math.max(Number(this.data.levelStars[level]) || 0, Math.max(1, Math.min(3, Number(stars) || 1)));
        this.data.unlockedLevel = this.clampLevel(Math.max(this.data.unlockedLevel, Number(level) + 1));
        this.persist();
        return this.data.unlockedLevel;
    }

    markTutorialSeen() { this.data.hasSeenTutorial = true; this.persist(); }

    persist() { return this.saveStore.save(this.data); }
    clampLevel(level) { return Math.max(1, Math.min(this.totalLevels, Number.isInteger(level) ? level : 1)); }
}
