import { GameEntity } from '../engine/Entity.js';
import { GameScene } from '../engine/Scene.js';

const DIRECTIONS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** Data-driven classic Snake rules and asset-backed Canvas rendering. */
export class SnakeScene extends GameScene {
    constructor(level, { assets = {}, onGameOver = () => {}, onVictory = () => {}, onScore = () => {}, onBonus = () => {} } = {}) {
        super({ background: '#10271f' });
        if (!level) throw new TypeError('SnakeScene needs validated level data');
        this.level = level;
        this.specialFruit = level.specialFruit || { afterRegularFoods: 5, multiplier: 5, durationSeconds: 8 };
        this.assets = assets;
        this.onGameOverCallback = onGameOver;
        this.onVictoryCallback = onVictory;
        this.onScoreCallback = onScore;
        this.onBonusCallback = onBonus;
    }

    onEnter(runtime) {
        if (runtime.height > runtime.width && this.level.grid.columns > this.level.grid.rows) {
            const transpose = cell => ({ ...cell, x: cell.y, y: cell.x });
            this.level = { ...this.level,
                grid: { ...this.level.grid, columns: this.level.grid.rows, rows: this.level.grid.columns },
                start: transpose(this.level.start),
                direction: { right: 'down', down: 'right', left: 'up', up: 'left' }[this.level.direction || 'right'],
                foods: (this.level.foods || []).map(transpose),
                obstacles: (this.level.obstacles || []).map(transpose),
                portals: (this.level.portals || []).map(transpose)
            };
        }
        this.columns = this.level.grid.columns;
        this.rows = this.level.grid.rows;
        this.direction = this.level.direction || 'right';
        this.nextDirection = this.direction;
        this.turnQueue = [];
        this.elapsed = 0;
        this.growthGlow = 0;
        this.stepTime = this.level.stepMs / 1000;
        this.score = 0;
        this.regularScore = 0;
        this.lastRegularPoints = this.level.foodTypes[0].points;
        this.foodsCollected = 0;
        this.foodsSinceBonus = 0;
        this.bonusPending = 0;
        this.bonusRemaining = 0;
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
        this.bonus = this.makeBonusEntity();
        this.bonus.visible = false;
        this.spawnFood(runtime);
        this.placeSegments();
        this.onScoreCallback(0, this.level, 0, 0);
    }

    makeStartingSnake() {
        const start = this.level.start;
        const vector = DIRECTIONS[this.direction];
        return Array.from({ length: this.level.initialLength || 3 }, (_, index) => ({ x: start.x - vector.x * index, y: start.y - vector.y * index }));
    }

    onUpdate(dt, runtime) {
        if (this.dead || this.completed) return;
        this.growthGlow = Math.max(0, this.growthGlow - dt * 2.5);
        this.updateBonusClock(dt, runtime);
        const input = runtime.input;
        const requested = ['up', 'down', 'left', 'right'].find(name => input.wasPressed(`snake${name[0].toUpperCase()}${name.slice(1)}`));
        if (requested) this.requestTurn(requested);
        this.elapsed += dt;
        while (this.elapsed >= this.stepTime && !this.dead && !this.completed) {
            this.elapsed -= this.stepTime;
            this.stepSnake(runtime);
        }
    }

    updateBonusClock(dt, runtime) {
        if (!this.bonus) return;
        if (!this.bonus.visible) return;
        this.bonusRemaining = Math.max(0, this.bonusRemaining - dt);
        this.onBonusCallback('tick', this.bonusRemaining, this.bonusDuration);
        if (this.bonusRemaining > 0) return;
        this.bonus.visible = false;
        this.onBonusCallback('expire', this.specialFruit.afterRegularFoods - this.foodsSinceBonus, this.specialFruit.afterRegularFoods);
        this.spawnQueuedBonus(runtime);
    }

    spawnBonus(runtime) {
        const occupied = new Set([
            ...this.snake.map(cell => this.key(cell)), this.key(this.foodCell),
            ...(this.level.obstacles || []).map(cell => this.key(cell)),
            ...(this.level.portals || []).map(cell => this.key(cell))
        ]);
        const open = [];
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
            const cell = { x, y };
            if (!occupied.has(this.key(cell))) open.push(cell);
        }
        this.bonusCell = runtime.random.pick(open);
        if (!this.bonusCell) return;
        this.bonusDuration = this.level.specialDurationSeconds || this.specialFruit.durationSeconds;
        this.bonusRemaining = this.bonusDuration;
        this.bonus.data = { points: this.lastRegularPoints * this.specialFruit.multiplier };
        this.bonus.setPosition(this.offsetX + this.bonusCell.x * this.tile, this.offsetY + this.bonusCell.y * this.tile);
        this.bonus.visible = true;
        this.onBonusCallback('spawn', this.bonusRemaining, this.bonusDuration);
    }

    spawnQueuedBonus(runtime) {
        if (this.bonusPending <= 0 || this.bonus.visible) return;
        this.bonusPending--;
        this.spawnBonus(runtime);
    }

    requestTurn(direction) {
        if (!DIRECTIONS[direction] || this.dead || this.completed) return;
        const last = this.turnQueue.at(-1) || this.nextDirection;
        if (direction === last || direction === this.opposite(last) || this.turnQueue.length >= 2) return;
        this.turnQueue.push(direction);
    }

    stepSnake(runtime) {
        if (this.turnQueue.length) this.nextDirection = this.turnQueue.shift();
        this.direction = this.nextDirection;
        const vector = DIRECTIONS[this.direction];
        let head = { x: this.snake[0].x + vector.x, y: this.snake[0].y + vector.y };
        const portalExit = this.portalCells.get(this.key(head));
        if (portalExit) head = { x: portalExit.x, y: portalExit.y };
        const ate = head.x === this.foodCell.x && head.y === this.foodCell.y;
        const ateBonus = this.bonus.visible && head.x === this.bonusCell.x && head.y === this.bonusCell.y;
        const bodyToCheck = ate ? this.snake : this.snake.slice(0, -1);
        const hitWall = head.x < 0 || head.x >= this.columns || head.y < 0 || head.y >= this.rows;
        const hitBody = bodyToCheck.some(cell => cell.x === head.x && cell.y === head.y);
        const hitObstacle = (this.level.obstacles || []).some(cell => cell.x === head.x && cell.y === head.y);
        if (hitWall || hitBody || hitObstacle) {
            this.dead = true;
            this.onGameOverCallback(hitWall ? 'Garden edge' : hitObstacle ? 'Rock collision' : 'Snake collision', this.score);
            return;
        }

        this.snake.unshift(head);
        if (ate) {
            this.growthGlow = 1;
            this.foodsCollected++;
            this.score += this.foodCell.points;
            this.regularScore += this.foodCell.points;
            this.lastRegularPoints = this.foodCell.points;
            this.onBonusCallback('eat', this.foodCell.type, this.foodCell.points);
            this.foodsSinceBonus++;
            this.onBonusCallback('regular-count', this.specialFruit.afterRegularFoods - this.foodsSinceBonus, this.specialFruit.afterRegularFoods);
        }
        if (ateBonus) {
            this.score += this.bonus.data.points;
            this.bonus.visible = false;
            this.onBonusCallback('collect', this.bonus.data.points, this.bonusDuration);
        }
        if (ate) this.segmentEntities.push(this.makeSegment(this.segmentEntities.length));
        else this.snake.pop();

        this.onScoreCallback(this.score, this.level, this.foodsCollected, this.regularScore);
        if (ateBonus) this.spawnQueuedBonus(runtime);
        if (ate && this.foodsCollected >= this.level.targetFoods) {
            this.completed = true;
            this.onVictoryCallback({ score: this.score, regularScore: this.regularScore, foodsCollected: this.foodsCollected, level: this.level });
        } else if (ate) {
            this.spawnFood(runtime);
            const interval = this.specialFruit.afterRegularFoods;
            if (this.foodsSinceBonus >= interval) {
                this.foodsSinceBonus -= interval;
                if (this.bonus.visible) this.bonusPending++;
                else this.spawnBonus(runtime);
            }
        }
        this.placeSegments();
    }

    makeSegment(index) {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: index === 0 ? 4 : 3, data: { index }, render: (ctx, _alpha, _runtime, entity) => {
            if (entity.data.index === 0 && this.assets.head) {
                ctx.save(); ctx.translate(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2);
                // Amara's face stays upright as she steers; the human identity
                // remains readable rather than turning upside down on the grid.
                if (this.direction === 'left') ctx.scale(-1, 1);
                const size = this.tile * 1.55;
                ctx.drawImage(this.assets.head, -size / 2, -size / 2, size, size); ctx.restore(); return;
            }
            if (this.assets.segment) {
                const i = entity.data.index, cell = this.snake[i], ahead = this.snake[i - 1], behind = this.snake[i + 1];
                const side = other => other.x < cell.x ? 'left' : other.x > cell.x ? 'right' : other.y < cell.y ? 'up' : 'down';
                const a = side(ahead), b = behind ? side(behind) : null;
                let sprite = this.assets.segment;
                let angle = (a === 'up' || a === 'down') ? Math.PI / 2 : 0;
                if (!behind && this.assets.tail) {
                    sprite = this.assets.tail;
                    angle = { left: 0, up: Math.PI / 2, right: Math.PI, down: -Math.PI / 2 }[a];
                } else if (b && a !== this.opposite(b) && this.assets.bend) {
                    sprite = this.assets.bend;
                    const pair = [a, b].sort().join(',');
                    angle = { 'down,left': 0, 'down,right': -Math.PI / 2, 'right,up': Math.PI, 'left,up': Math.PI / 2 }[pair];
                }
                ctx.save();
                ctx.translate(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2);
                if (this.growthGlow > 0) { ctx.shadowColor = '#ffe193'; ctx.shadowBlur = this.tile * this.growthGlow; }
                // Join neighboring cells beneath the detailed scale artwork.
                ctx.lineCap = 'round'; ctx.lineWidth = this.tile * .56; ctx.strokeStyle = '#478c3a';
                const point = direction => ({ left: [-.5, 0], right: [.5, 0], up: [0, -.5], down: [0, .5] }[direction]);
                ctx.beginPath(); const p = point(a); ctx.moveTo(p[0] * this.tile, p[1] * this.tile); ctx.lineTo(0, 0);
                if (b) { const q = point(b); ctx.lineTo(q[0] * this.tile, q[1] * this.tile); } ctx.stroke();
                ctx.rotate(angle); ctx.drawImage(sprite, -this.tile / 2, -this.tile / 2, this.tile, this.tile);
                ctx.restore(); return;
            }
            const inset = this.tile * .09;
            ctx.fillStyle = entity.data.index === 0 ? '#c5f36a' : '#75be73';
            ctx.beginPath(); ctx.roundRect(entity.position.x + inset, entity.position.y + inset, this.tile - inset * 2, this.tile - inset * 2, Math.max(3, this.tile * .22)); ctx.fill();
            if (entity.data.index === 0) this.drawSnakeEyes(ctx, entity.position.x, entity.position.y);
        }}));
    }

    makeObstacle(cell) {
        const obstacle = this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 1, data: { cell }, render: (ctx, _alpha, _runtime, entity) => {
            const cx = entity.position.x + this.tile / 2, cy = entity.position.y + this.tile / 2;
            ctx.fillStyle = '#10271f'; ctx.beginPath(); ctx.arc(cx, cy, this.tile * .49, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#d8df9c'; ctx.lineWidth = Math.max(1.5, this.tile * .075); ctx.beginPath(); ctx.arc(cx, cy, this.tile * .43, 0, Math.PI * 2); ctx.stroke();
            if (this.assets.rock) { ctx.drawImage(this.assets.rock, entity.position.x, entity.position.y, this.tile, this.tile); return; }
            ctx.fillStyle = '#7d8b89'; ctx.beginPath(); ctx.roundRect(entity.position.x + 2, entity.position.y + 2, this.tile - 4, this.tile - 4, Math.max(3, this.tile * .2)); ctx.fill();
        }}));
        return obstacle.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
    }

    makePortal(cell) {
        const portal = this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 1, data: { cell }, render: (ctx, _alpha, _runtime, entity) => {
            if (this.assets.portal) { ctx.drawImage(this.assets.portal, entity.position.x, entity.position.y, this.tile, this.tile); return; }
            ctx.strokeStyle = '#70d8e4'; ctx.lineWidth = Math.max(2, this.tile * .1); ctx.beginPath();
            ctx.arc(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2, this.tile * .34, 0, Math.PI * 2); ctx.stroke();
        }}));
        return portal.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
    }

    makeFoodEntity() {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 2, render: (ctx, _alpha, _runtime, entity) => {
            const sprite = this.assets[entity.data.asset];
            if (sprite) { ctx.drawImage(sprite, entity.position.x + this.tile * .06, entity.position.y + this.tile * .06, this.tile * .88, this.tile * .88); return; }
            ctx.fillStyle = entity.data.color; ctx.shadowColor = entity.data.color; ctx.shadowBlur = this.tile * .45;
            ctx.beginPath(); ctx.arc(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2, this.tile * .31, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }}));
    }

    makeBonusEntity() {
        return this.add(new GameEntity({ width: this.tile, height: this.tile, layer: 2, render: (ctx, _alpha, _runtime, entity) => {
            if (this.assets.bonus) ctx.drawImage(this.assets.bonus, entity.position.x, entity.position.y, this.tile, this.tile);
            else { ctx.fillStyle = '#78eaff'; ctx.font = `bold ${this.tile}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✦', entity.position.x + this.tile / 2, entity.position.y + this.tile * .82); }
            ctx.beginPath(); ctx.arc(entity.position.x + this.tile / 2, entity.position.y + this.tile / 2, this.tile * .47, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.bonusRemaining / this.bonusDuration));
            ctx.strokeStyle = '#ddfbff'; ctx.lineWidth = Math.max(2, this.tile * .06); ctx.stroke();
        }}));
    }

    drawSnakeEyes(ctx, x, y) {
        const centerX = x + this.tile / 2, centerY = y + this.tile / 2;
        const forward = DIRECTIONS[this.direction], side = { x: -forward.y, y: forward.x };
        ctx.fillStyle = '#172019';
        for (const sign of [-1, 1]) { ctx.beginPath(); ctx.arc(centerX + forward.x * this.tile * .19 + side.x * this.tile * .18 * sign,
            centerY + forward.y * this.tile * .19 + side.y * this.tile * .18 * sign, Math.max(1.5, this.tile * .07), 0, Math.PI * 2); ctx.fill(); }
    }

    placeSegments() {
        for (let index = 0; index < this.segmentEntities.length; index++) {
            const cell = this.snake[index], entity = this.segmentEntities[index];
            if (!cell) { entity.active = false; continue; }
            entity.data.index = index; entity.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
        }
    }

    spawnFood(runtime) {
        const occupied = new Set([
            ...this.snake.map(cell => this.key(cell)), ...(this.level.obstacles || []).map(cell => this.key(cell)),
            ...(this.level.portals || []).map(cell => this.key(cell)), ...(this.bonus?.visible ? [this.key(this.bonusCell)] : [])
        ]);
        let cell = this.foodQueue.shift();
        if (!cell || occupied.has(this.key(cell))) {
            const open = [];
            for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
                const candidate = { x, y }; if (!occupied.has(this.key(candidate))) open.push(candidate);
            }
            cell = runtime.random.pick(open);
        }
        if (!cell) throw new Error(`Level ${this.level.id} has no free cells for food`);
        const type = this.level.foodTypes.find(item => item.type === cell.type) || runtime.random.pick(this.level.foodTypes);
        this.foodCell = { x: cell.x, y: cell.y, type: type.type, points: cell.points ?? type.points, color: cell.color ?? type.color, asset: type.asset || type.type };
        this.food.data = this.foodCell;
        this.food.setPosition(this.offsetX + cell.x * this.tile, this.offsetY + cell.y * this.tile);
    }

    resetGrid(runtime) {
        const grid = this.level.grid;
        // The full logical board must fit, even on short phone viewports.
        // A minimum tile size used to push edge cells (and their food) off canvas.
        const fit = Math.max(0, Math.min(runtime.width / this.columns, runtime.height / this.rows));
        this.tile = fit >= 1 ? Math.floor(fit) : fit;
        this.offsetX = Math.floor((runtime.width - this.columns * this.tile) / 2);
        this.offsetY = Math.floor((runtime.height - this.rows * this.tile) / 2);
    }

    resize(_width, _height, runtime) {
        if (!this.snake) return;
        this.resetGrid(runtime); this.placeSegments();
        for (const entity of [...this.obstacleEntities, ...this.portalEntities]) {
            const { x, y } = entity.data.cell; entity.setPosition(this.offsetX + x * this.tile, this.offsetY + y * this.tile);
        }
        if (this.foodCell) this.food.setPosition(this.offsetX + this.foodCell.x * this.tile, this.offsetY + this.foodCell.y * this.tile);
        if (this.bonusCell) this.bonus.setPosition(this.offsetX + this.bonusCell.x * this.tile, this.offsetY + this.bonusCell.y * this.tile);
    }

    onRender(ctx) {
        ctx.fillStyle = '#245744'; ctx.fillRect(this.offsetX, this.offsetY, this.columns * this.tile, this.rows * this.tile);
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
            const px = this.offsetX + x * this.tile, py = this.offsetY + y * this.tile;
            // Sample one empty stone tile, then repeat at the actual game grid
            // size. The reference illustration's grid must not mislead steering.
            if (this.assets.arena) {
                const art = this.assets.arena;
                ctx.drawImage(art, art.width * .113, art.height * .235, art.width * .034, art.height * .051,
                    px, py, this.tile, this.tile);
            }
            ctx.fillStyle = '#052c2a55'; ctx.fillRect(px, py, this.tile, this.tile);
            ctx.strokeStyle = '#061f1833'; ctx.lineWidth = 1; ctx.strokeRect(px, py, this.tile, this.tile);
            if ((x * 7 + y * 13) % 19 === 0) { ctx.strokeStyle = '#c6eed51b'; ctx.lineWidth = Math.max(1, this.tile * .025); ctx.beginPath(); ctx.arc(px + this.tile * .5, py + this.tile * .5, this.tile * .22, .18, Math.PI * 1.45); ctx.stroke(); }
        }
        ctx.strokeStyle = '#baa76b88'; ctx.lineWidth = 2; ctx.strokeRect(this.offsetX, this.offsetY, this.columns * this.tile, this.rows * this.tile);
    }

    key(cell) { return `${cell.x},${cell.y}`; }
    opposite(direction) { return { up: 'down', down: 'up', left: 'right', right: 'left' }[direction]; }
}
