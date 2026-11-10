const DIRECTIONS = new Set(['up', 'down', 'left', 'right']);

/** Loads and validates Snake level definitions without embedding level content. */
export class LevelManager {
    constructor(configLoader, configUrl = new URL('../../../data/snake/levels.json', import.meta.url)) {
        this.configLoader = configLoader;
        this.configUrl = configUrl;
        this.levels = new Map();
        this.foodTypes = [];
        this.grid = null;
    }

    async initialize() {
        const config = await this.configLoader.load(this.configUrl, { validate: LevelManager.validate });
        this.grid = config.grid;
        this.foodTypes = config.foodTypes;
        this.levels = new Map(config.levels.map(level => [level.id, level]));
        return this;
    }

    getLevel(id) {
        const level = this.levels.get(Number(id));
        if (!level) throw new RangeError(`Snake level ${id} does not exist`);
        return { ...structuredClone(level), grid: this.grid, foodTypes: this.foodTypes };
    }

    getTotalLevels() { return this.levels.size; }
    list() { return [...this.levels.values()].map(level => ({ ...level })); }

    static validate(config) {
        const errors = [];
        if (!config || config.game !== 'snake-fantasy' || !Number.isInteger(config.version)) return ['expected a versioned snake-fantasy config'];
        const { columns, rows } = config.grid || {};
        if (!Number.isInteger(columns) || columns < 12 || !Number.isInteger(rows) || rows < 10) errors.push('grid must be at least 12 by 10');
        if (!Array.isArray(config.foodTypes) || config.foodTypes.length === 0) errors.push('foodTypes must not be empty');
        else {
            if (config.foodTypes.some(type => !type || !type.type || !Number.isFinite(type.points) || type.points < 1 || typeof type.color !== 'string')) errors.push('each foodType needs a type, positive points, and color');
            if (new Set(config.foodTypes.filter(Boolean).map(type => type.type)).size !== config.foodTypes.length) errors.push('foodTypes must have unique identifiers');
        }
        if (!Array.isArray(config.levels) || config.levels.length === 0) return [...errors, 'levels must not be empty'];
        const foodTypeList = Array.isArray(config.foodTypes) ? config.foodTypes.filter(Boolean) : [];
        const ids = new Set();
        for (const level of config.levels) {
            if (!level || typeof level !== 'object') { errors.push('each level must be an object'); continue; }
            if (!Number.isInteger(level.id) || ids.has(level.id)) errors.push(`level id is missing or duplicated: ${level.id}`);
            ids.add(level.id);
            if (!Number.isInteger(level.stepMs) || level.stepMs < 65 || level.stepMs > 500) errors.push(`level ${level.id} has an invalid stepMs`);
            if (!Number.isInteger(level.targetFoods) || level.targetFoods < 1) errors.push(`level ${level.id} needs a positive targetFoods`);
            if (!level.start || !Number.isInteger(level.start.x) || !Number.isInteger(level.start.y)) errors.push(`level ${level.id} has an invalid start`);
            if (!DIRECTIONS.has(level.direction)) errors.push(`level ${level.id} has an invalid direction`);
            for (const name of ['obstacles', 'foods', 'portals']) {
                if (level[name] !== undefined && !Array.isArray(level[name])) errors.push(`level ${level.id} ${name} must be an array`);
            }
            const obstacles = Array.isArray(level.obstacles) ? level.obstacles : [];
            const foods = Array.isArray(level.foods) ? level.foods : [];
            const portals = Array.isArray(level.portals) ? level.portals : [];
            const contents = [...obstacles, ...foods, ...portals];
            for (const cell of contents) {
                if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= columns || cell.y >= rows) {
                    errors.push(`level ${level.id} contains an out-of-grid cell`);
                    break;
                }
            }
            const obstacleCells = obstacles.filter(Boolean);
            const foodCells = foods.filter(Boolean);
            const portalCells = portals.filter(Boolean);
            if (portals.length !== 0 && portals.length !== 2) errors.push(`level ${level.id} must have zero or two portals`);
            const vector = DIRECTIONS.has(level.direction) ? { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[level.direction] : [0, 0];
            const length = Number.isInteger(level.initialLength) ? level.initialLength : 3;
            if (length < 2 || length > Math.min(columns, rows)) errors.push(`level ${level.id} has an invalid initialLength`);
            const startingCells = level.start ? Array.from({ length }, (_, index) => ({
                x: level.start.x - vector[0] * index,
                y: level.start.y - vector[1] * index
            })) : [];
            if (startingCells.some(cell => cell.x < 0 || cell.y < 0 || cell.x >= columns || cell.y >= rows)) errors.push(`level ${level.id} starting snake is outside the grid`);
            if (startingCells.some(start => obstacleCells.some(cell => cell.x === start.x && cell.y === start.y))) errors.push(`level ${level.id} starts inside an obstacle`);
            const validFoodTypes = new Set(foodTypeList.map(type => type.type));
            if (foodCells.some(food => !validFoodTypes.has(food.type))) errors.push(`level ${level.id} uses an unknown food type`);
            if (foodCells.some(food => food.points !== undefined && (!Number.isFinite(food.points) || food.points < 1))) errors.push(`level ${level.id} has an invalid food score`);
            const portalKeys = new Set(portalCells.map(cell => `${cell.x},${cell.y}`));
            if (portalKeys.size !== portals.length) errors.push(`level ${level.id} has duplicate portal positions`);
            if (foodCells.some(food => portalKeys.has(`${food.x},${food.y}`))) errors.push(`level ${level.id} places food on a portal`);
            if (startingCells.some(start => portalKeys.has(`${start.x},${start.y}`))) errors.push(`level ${level.id} starts the snake on a portal`);
            if (portalCells.some(portal => obstacleCells.some(obstacle => obstacle.x === portal.x && obstacle.y === portal.y))) errors.push(`level ${level.id} places a portal inside an obstacle`);
            if (foodCells.some(food => startingCells.some(start => start.x === food.x && start.y === food.y))) errors.push(`level ${level.id} places food inside the starting snake`);
            if (foodCells.some(food => obstacleCells.some(obstacle => obstacle.x === food.x && obstacle.y === food.y))) errors.push(`level ${level.id} places food inside an obstacle`);
            const obstacleKeys = new Set(obstacleCells.map(cell => `${cell.x},${cell.y}`));
            if (obstacleKeys.size !== obstacles.length) errors.push(`level ${level.id} has duplicate obstacles`);
            const foodKeys = new Set(foodCells.map(cell => `${cell.x},${cell.y}`));
            if (foodKeys.size !== foods.length) errors.push(`level ${level.id} has duplicate fixed food positions`);
        }
        for (let id = 1; id <= config.levels.length; id++) if (!ids.has(id)) errors.push(`levels must use consecutive ids beginning at 1; missing ${id}`);
        return errors;
    }
}
