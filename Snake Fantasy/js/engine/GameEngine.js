// js/engine/GameEngine.js
export class GameEngine {
    constructor(canvas, levelData, onScore, onGameOver, onVictory) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.levelData = levelData;
        this.onScore = onScore;
        this.onGameOver = onGameOver;
        this.onVictory = onVictory;
        
        this.tileSize = 0;
        this.gridSize = 20;
        this.snake = [];
        this.foods = [];
        this.obstacles = [];
        this.portals = [];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.moveInterval = null;
        this.animFrame = null;
        this.lastTime = 0;
        this.moveTimer = 0;
        this.targetFoods = 5;
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.setupLevel();
        this.setupEventListeners();
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = size / this.gridSize;
    }

    setupLevel() {
        const { snake, foods, obstacles, portals, speed, targetFoods } = this.levelData;
        this.snake = snake.map(pos => ({...pos}));
        this.foods = foods.map(f => ({...f, collected: false}));
        this.obstacles = obstacles.map(o => ({...o}));
        this.portals = portals.map(p => ({...p}));
        this.moveSpeed = speed || 150;
        this.targetFoods = targetFoods || 5;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.moveTimer = 0;
        this.foodsCollected = 0;
        this.gameRunning = true;
        this.gamePaused = false;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    start() {
        this.gameRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    pause() {
        this.gamePaused = true;
    }

    resume() {
        this.gamePaused = false;
        this.lastTime = performance.now();
    }

    destroy() {
        this.gameRunning = false;
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
        }
    }

    setDirection(dir) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        if (dir !== opposites[this.direction]) {
            this.nextDirection = dir;
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;
        
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        if (!this.gamePaused) {
            this.moveTimer += delta;
            
            if (this.moveTimer >= this.moveSpeed) {
                this.moveTimer = 0;
                this.update();
            }
            
            this.render();
        }
        
        this.animFrame = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.direction = this.nextDirection;
        
        // Move snake
        const head = {...this.snake[0]};
        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }
        
        // Check portals
        for (const portal of this.portals) {
            if (head.x === portal.x && head.y === portal.y) {
                const other = this.portals.find(p => p.id !== portal.id);
                if (other) {
                    head.x = other.x;
                    head.y = other.y;
                }
                break;
            }
        }
        
        // Check collisions
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }
        
        // Check food
        let ate = false;
        for (const food of this.foods) {
            if (!food.collected && head.x === food.x && head.y === food.y) {
                food.collected = true;
                this.score += food.points || 10;
                this.foodsCollected++;
                this.onScore(this.score);
                ate = true;
                break;
            }
        }
        
        if (ate) {
            this.snake.unshift(head);
            if (this.foodsCollected >= this.targetFoods) {
                this.victory();
                return;
            }
            this.spawnFood();
        } else {
            this.snake.pop();
            this.snake.unshift(head);
        }
    }

    checkCollision(head) {
        // Wall collision
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            return true;
        }
        
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }
        
        // Obstacle collision
        for (const obstacle of this.obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                return true;
            }
        }
        
        return false;
    }

    spawnFood() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            // Check snake
            let onSnake = false;
            for (const seg of this.snake) {
                if (seg.x === x && seg.y === y) {
                    onSnake = true;
                    break;
                }
            }
            if (onSnake) continue;
            
            // Check obstacles
            let onObstacle = false;
            for (const obs of this.obstacles) {
                if (obs.x === x && obs.y === y) {
                    onObstacle = true;
                    break;
                }
            }
            if (onObstacle) continue;
            
            // Check portals
            let onPortal = false;
            for (const portal of this.portals) {
                if (portal.x === x && portal.y === y) {
                    onPortal = true;
                    break;
                }
            }
            if (onPortal) continue;
            
            // Check existing food
            let onFood = false;
            for (const food of this.foods) {
                if (!food.collected && food.x === x && food.y === y) {
                    onFood = true;
                    break;
                }
            }
            if (onFood) continue;
            
            const foodTypes = [
                { type: 'apple', points: 10, color: '#ff6b6b' },
                { type: 'strawberry', points: 15, color: '#ff4757' },
                { type: 'banana', points: 20, color: '#ffd93d' },
                { type: 'golden', points: 50, color: '#f9ca24' },
                { type: 'diamond', points: 100, color: '#7fdbff' }
            ];
            
            const type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
            this.foods.push({ x, y, ...type, collected: false });
            break;
        }
    }

    render() {
        const ctx = this.ctx;
        const size = this.canvas.width;
        const tile = size / this.gridSize;
        
        ctx.clearRect(0, 0, size, size);
        
        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tile, 0);
            ctx.lineTo(i * tile, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * tile);
            ctx.lineTo(size, i * tile);
            ctx.stroke();
        }
        
        // Portals
        for (const portal of this.portals) {
            ctx.fillStyle = 'rgba(123, 219, 255, 0.3)';
            ctx.shadowColor = '#7fdbff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(portal.x * tile + tile/2, portal.y * tile + tile/2, tile/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#7fdbff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Obstacles
        for (const obstacle of this.obstacles) {
            ctx.fillStyle = '#ff6b6b';
            ctx.shadowColor = '#ff6b6b';
            ctx.shadowBlur = 10;
            ctx.fillRect(obstacle.x * tile + 2, obstacle.y * tile + 2, tile - 4, tile - 4);
            ctx.shadowBlur = 0;
        }
        
        // Foods
        for (const food of this.foods) {
            if (food.collected) continue;
            ctx.shadowColor = food.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = food.color;
            ctx.beginPath();
            ctx.arc(food.x * tile + tile/2, food.y * tile + tile/2, tile/2 - 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Glow
            if (food.type === 'golden' || food.type === 'diamond') {
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.arc(food.x * tile + tile/2, food.y * tile + tile/2, tile/2 + 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Snake
        if (this.snake.length > 0) {
            for (let i = 0; i < this.snake.length; i++) {
                const seg = this.snake[i];
                const x = seg.x * tile;
                const y = seg.y * tile;
                const padding = i === 0 ? 2 : 3;
                const radius = 6;
                
                let color;
                if (i === 0) {
                    color = '#4ecdc4';
                } else if (i === this.snake.length - 1) {
                    color = '#45b7aa';
                } else {
                    const t = i / this.snake.length;
                    color = `rgb(${78 + t * 30}, ${205 - t * 40}, ${196 - t * 30})`;
                }
                
                ctx.shadowColor = 'rgba(78, 205, 196, 0.3)';
                ctx.shadowBlur = 10;
                
                // Rounded rect
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x + padding, y + padding, tile - padding * 2, tile - padding * 2, radius);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Eyes on head
                if (i === 0) {
                    ctx.fillStyle = '#1a1a2e';
                    const eyeSize = 3;
                    let ex1, ey1, ex2, ey2;
                    switch(this.direction) {
                        case 'up':
                            ex1 = x + tile/2 - 6; ey1 = y + 6;
                            ex2 = x + tile/2 + 4; ey2 = y + 6;
                            break;
                        case 'down':
                            ex1 = x + tile/2 - 6; ey1 = y + tile - 6;
                            ex2 = x + tile/2 + 4; ey2 = y + tile - 6;
                            break;
                        case 'left':
                            ex1 = x + 6; ey1 = y + tile/2 - 6;
                            ex2 = x + 6; ey2 = y + tile/2 + 4;
                            break;
                        case 'right':
                            ex1 = x + tile - 6; ey1 = y + tile/2 - 6;
                            ex2 = x + tile - 6; ey2 = y + tile/2 + 4;
                            break;
                    }
                    ctx.beginPath();
                    ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // White shine
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.beginPath();
                    ctx.arc(ex1 - 1, ey1 - 1, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(ex2 - 1, ey2 - 1, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.onGameOver();
    }

    victory() {
        this.gameRunning = false;
        this.onVictory();
    }
}

// Polyfill roundRect if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (radii || 0);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        return this;
    };
}