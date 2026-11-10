import { GameEntity } from '../engine/Entity.js';
import { GameScene } from '../engine/Scene.js';

const DIRECTIONS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

/** Data-driven Snake gameplay. Rendering, timing, input, and lifecycle come from the engine. */
export class SnakeScene extends GameScene {
    constructor(level, { onGameOver = () => {}, onVictory = () => {}, onScore = () => {} } = {}) {
        super({ background: '#101a1e' });
        if (!level) throw new TypeError('SnakeScene needs validated level data');
        this.level = level;
        this.onGameOverCallback = onGameOver;
        this.onVictoryCallback = onVictory;
        this.onScoreCallback = onScore;
    }

    onEnter(runtime) {
        this.columns = this.level.grid.columns;
        this.rows = this.level.grid.rows;
        this.direction = this.level.direction || 'right';
        this.nextDirection = this.direction;
        this.elapsed = 0;
        this.stepTime = this.level.stepMs / 1000;
        this.score = 0;
        this.foodsCollected = 0;
        this.dead = false;
        this.completed = false;
        this.foodQueue = [...(this.level.foods || [])];
        this.portalCells = new Map();
        const portalPositions = this.level.portals || [];
        if (portalPositions.length === 2) {
            this.portalCells.set(this.key(portalPositions[0]), portalPositions[1]);
            this.portalCells.set(this.key(portalPositions[1]), portalPositions[0]);
        }
        this.resetGrid(runtime);
        this.snake = this.makeStartingSnake();
        this.segmentEntities = this.snake.map((_cell, index) => this.makeSegment(index));
        this.obstacleEntities = (this.level.obstacles || []).map(cell => this.makeObstacle(cell));
        this.portalEntities = portalPositions.map(cell => this.makePortal(cell));
        this.food = this.makeFoodEntity();
        this.spawnFood(runtime);
        this.placeSegments();
        this.onScoreCallback(0, this.level, 0);
    }

    makeStartingSnake() {
        const start = this.level.start;
        const vector = DIRECTIONS[this.direction];
        return Array.from({ length: this.level.initialLength || 3 }, (_, index) => ({
            x: start.x - vector.x * index,
            y: start.y - vector.y * index
        }));
    }

    onUpdate(dt, runtime) {
        if (this.dead || this.completed) return;
        const input = runtime.input;
        const requested = ['up', 'down', 'left', 'right'].find(name => input.wasPressed(`snake${name[0].toUpperCase()}${name.slice(1)}`));
        if (requested && requested !== this.opposite(this.direction)) this.nextDirection = requested;
        this.elapsed += dt;
        while (this.elapsed >= this.stepTime && !this.dead && !this.completed) {
            this.elapsed -= this.stepTime;
            this.stepSnake(runtime);
        }
    }

    stepSnake(runtime) {
        this.direction = this.nextDirection;
        const vector = DIRECTIONS[this.direction];
        let head = { x: this.snake[0].x + vector.x, y: this.snake[0].y + vector.y };
        const portalExit = this.portalCells.get(this.key(head));
        if (portalExit) head = { x: portalExit.x, y: portalExit.y };

        const ate = head.x === this.foodCell.x && head.y === this.foodCell.y;
        const bodyToCheck = ate ? this.snake : this.snake.slice(0, -1);
        const hitWall = head.x < 0 || head.x >= this.columns || head.y < 0 || head.y >= this.rows;
        const hitBody = bodyToCheck.some(cell => cell.x === head.x && cell.y === head.y);
        const hitObstacle = (this.level.obstacles || []).some(cell => cell.x === head.x && cell.y === head.y);
        if (hitWall || hitBody || hitObstacle) {
            this.dead = true;
            this.onGameOverCallback(hitWall ? 'Wall collision' : hitObstacle ? 'Blocked path' : 'Snake collision', this.score);
            return;
        }

        this.snake.unshift(head);
        if (ate) {
            this.foodsCollected++;
            this.score += this.foodCell.points;
            this.segmentEntities.push(this.makeSegment(this.segmentEntities.length));
            this.onScoreCallback(this.score, this.level, this.foodsCollected);
            if (this.foodsCollected >= this.level.targetFoods) {
                this.completed = true;
                this.onVictoryCallback({ score: this.score, foodsCollected: this.foodsCollected, level: this.level });
            } else {
                this.spawnFood(runtime);
            }
        } else {
            this.snake.pop();
        }
        this.placeSegments();
    }

    makeSegment(index) {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 3, data: { index },
            render: (ctx, _alpha, _runtime, entity) => {
                const inset = this.tile * 0.09;
                ctx.fillStyle = entity.data.index === 0 ? '#c5f36a' : '#75be73';
                ctx.beginPath();
                ctx.roundRect(entity.position.x + inset, entity.position.y + inset, this.tile - inset * 2, this.tile - inset * 2, Math.max(3, this.tile * 0.22));
                ctx.fill();
                if (entity.data.index === 0) this.drawSnakeEyes(ctx, entity.position.x, entity.position.y);
            }
        }));
    }

    makeObstacle(cell) {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 1, data: { cell },
            render: (ctx, _alpha, _runtime, entity) => {
                ctx.fillStyle = '#7d8b89';
                ctx.beginPath();
                ctx.roundRect(entity.position.x + 2, entity.position.y + 2, this.tile - 4, this.tile - 4, Math.max(3, this.tile * 0.2));
                ctx.fill();
                ctx.fillStyle = '#aab8ad';
                ctx.fillRect(entity.position.x + this.tile * 0.25, entity.position.y + this.tile * 0.25, this.tile * 0.18, this.tile * 0.18);
            }
        }));
    }

    makePortal(cell) {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 1, data: { cell },
            render: (ctx, _alpha, _runtime, entity) => {
                ctx.strokeStyle = '#70d8e4';
                ctx.lineWidth = Math.max(2, this.tile * 0.1);
                ctx.beginPath();
                ctx.arc(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2, this.tile * 0.34, 0, Math.PI * 2);
                ctx.stroke();
            }
        }));
    }

    makeFoodEntity() {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 2,
            render: (ctx, _alpha, _runtime, entity) => {
                ctx.fillStyle = entity.data.color;
                ctx.shadowColor = entity.data.color;
                ctx.shadowBlur = this.tile * 0.45;
                ctx.beginPath();
                ctx.arc(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2, this.tile * 0.31, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }));
    }

    drawSnakeEyes(ctx, x, y) {
        const centerX = x + this.tile / 2;
        const centerY = y + this.tile / 2;
        const forward = DIRECTIONS[this.direction];
        const side = { x: -forward.y, y: forward.x };
        ctx.fillStyle = '#172019';
        for (const sign of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(centerX + forward.x * this.tile * 0.19 + side.x * this.tile * 0.18 * sign,
                centerY + forward.y * this.tile * 0.19 + side.y * this.tile * 0.18 * sign,
                Math.max(1.5, this.tile * 0.07), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    placeSegments() {
        for (let index = 0; index < this.segmentEntities.length; index++) {
            const cell = this.snake[index];
            const entity = this.segmentEntities[index];
            if (!cell) { entity.active = false; continue; }
            entity.data.index = index;
            entity.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
        }
    }

    spawnFood(runtime) {
        const occupied = new Set([
            ...this.snake.map(cell => this.key(cell)),
            ...(this.level.obstacles || []).map(cell => this.key(cell)),
            ...(this.level.portals || []).map(cell => this.key(cell))
        ]);
        let cell = this.foodQueue.shift();
        if (!cell || occupied.has(this.key(cell))) {
            const open = [];
            for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
                const candidate = { x, y };
                if (!occupied.has(this.key(candidate))) open.push(candidate);
            }
            cell = runtime.random.pick(open);
        }
        if (!cell) throw new Error(`Level ${this.level.id} has no free cells for food`);
        const type = this.level.foodTypes.find(item => item.type === cell.type) || runtime.random.pick(this.level.foodTypes);
        this.foodCell = {
            x: cell.x,
            y: cell.y,
            type: type.type,
            points: cell.points ?? type.points,
            color: cell.color ?? type.color
        };
        this.food.data = this.foodCell;
        this.food.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
    }

    resetGrid(runtime) {
        const grid = this.level.grid;
        this.tile = Math.max(grid.minimumTile || 12, Math.floor(Math.min(runtime.width / this.columns, runtime.height / this.rows)));
        this.offsetX = Math.floor((runtime.width - this.columns * this.tile) / 2);
        this.offsetY = Math.floor((runtime.height - this.rows * this.tile) / 2);
    }

    resize(_width, _height, runtime) {
        if (!this.snake) return;
        this.resetGrid(runtime);
        this.placeSegments();
        for (const entity of [...this.obstacleEntities, ...this.portalEntities]) {
            const { x, y } = entity.data.cell;
            entity.setPosition(this.offsetX + x * this.tile, this.offsetY + y * this.tile);
        }
        if (this.foodCell) this.food.setPosition(this.offsetX + this.foodCell.x * this.tile, this.offsetY + this.foodCell.y * this.tile);
    }

    onRender(ctx, _alpha, runtime) {
        ctx.fillStyle = '#ffffff07';
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
            if ((x + y) % 2 === 0) ctx.fillRect(this.offsetX + x * this.tile, this.offsetY + y * this.tile, this.tile, this.tile);
        }
        ctx.strokeStyle = '#dce7dc25';
        ctx.strokeRect(this.offsetX, this.offsetY, this.columns * this.tile, this.rows * this.tile);
        ctx.fillStyle = '#a9b7b3';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`${this.foodsCollected} / ${this.level.targetFoods} FOOD`, 15, 20);
        ctx.fillStyle = '#637671';
        ctx.fillText(this.level.name.toUpperCase(), runtime.width - 165, 20);
    }

    key(cell) { return `${cell.x},${cell.y}`; }
    opposite(direction) { return { up: 'down', down: 'up', left: 'right', right: 'left' }[direction]; }
}
