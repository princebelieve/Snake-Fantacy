import { GameEntity } from '../engine/Entity.js';
import { GameScene } from '../engine/Scene.js';
import { PhysicsBody } from '../engine/PhysicsWorld.js';

export class SkyShooterScene extends GameScene {
    constructor({ onGameOver = () => {}, onScore = () => {} } = {}) {
        super({ background: '#111827' });
        this.onGameOverCallback = onGameOver;
        this.onScoreCallback = onScore;
        this.stars = Array.from({ length: 70 }, (_, index) => ({
            x: (index * 83 + 17) % 1000,
            y: (index * 47 + 29) % 700,
            size: index % 6 === 0 ? 2 : 1,
            speed: 15 + (index % 4) * 10
        }));
    }

    onEnter(runtime) {
        this.score = 0;
        this.lives = 3;
        this.fireCooldown = 0;
        this.dead = false;
        const playerBody = runtime.world.add(new PhysicsBody({
            x: runtime.width / 2 - 15, y: runtime.height - 64,
            width: 30, height: 34, gravityScale: 0, tag: 'ship'
        }));
        this.player = this.add(new GameEntity({ body: playerBody, layer: 3,
            render: (ctx, _alpha, _runtime, entity) => this.drawShip(ctx, entity)
        }));
        this.bullets = new Set();
        this.enemies = new Set();
        for (let i = 0; i < 5; i++) this.spawnEnemy(runtime, i);
        this.onScoreCallback(0);
    }

    onUpdate(dt, runtime) {
        if (this.dead) return;
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);
        const horizontal = runtime.input.getAxis('move');
        this.player.body.velocity.x = horizontal * 300;
        this.player.body.velocity.y = 0;
        this.player.body.position.x = Math.max(4, Math.min(runtime.width - this.player.width - 4, this.player.body.position.x));

        if ((runtime.input.isDown('fire') || runtime.input.wasPressed('fire')) && this.fireCooldown <= 0) this.fire(runtime);
        for (const bullet of [...this.bullets]) {
            if (bullet.position.y + bullet.height < 0) {
                bullet.destroy();
                this.bullets.delete(bullet);
            }
        }
        for (const enemy of this.enemies) {
            if (enemy.body.position.y > runtime.height - 45) {
                this.lives--;
                this.resetEnemy(enemy, runtime);
                this.checkGameOver();
            }
        }
        this.checkHits(runtime);
        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > runtime.height) star.y = 0;
        }
    }

    fire(runtime) {
        this.fireCooldown = 0.22;
        const body = runtime.world.add(new PhysicsBody({
            x: this.player.body.position.x + this.player.width / 2 - 2,
            y: this.player.body.position.y - 12,
            width: 4, height: 13, gravityScale: 0, tag: 'player-bullet'
        }));
        body.velocity.y = -520;
        const bullet = this.add(new GameEntity({ body, layer: 2,
            render: (ctx, _alpha, _runtime, entity) => {
                ctx.fillStyle = '#c5f36a';
                ctx.shadowColor = '#c5f36a';
                ctx.shadowBlur = 10;
                ctx.fillRect(entity.position.x, entity.position.y, entity.width, entity.height);
                ctx.shadowBlur = 0;
            }
        }));
        this.bullets.add(bullet);
    }

    spawnEnemy(runtime, index) {
        const body = runtime.world.add(new PhysicsBody({
            x: 55 + index * Math.max(48, (runtime.width - 120) / 5),
            y: 55 + (index % 2) * 55,
            width: 28, height: 24, gravityScale: 0, tag: 'enemy'
        }));
        body.velocity.x = index % 2 ? -54 : 54;
        const enemy = this.add(new GameEntity({ body, layer: 2,
            render: (ctx, _alpha, _runtime, entity) => this.drawEnemy(ctx, entity)
        }));
        this.enemies.add(enemy);
        return enemy;
    }

    resetEnemy(enemy, runtime) {
        enemy.body.position.set(25 + runtime.random.next() * Math.max(1, runtime.width - 75), 35 + runtime.random.next() * 85);
        enemy.body.previousPosition.copy(enemy.body.position);
        enemy.body.velocity.x = runtime.random.next() < 0.5 ? -62 : 62;
    }

    checkHits(runtime) {
        for (const bullet of [...this.bullets]) {
            if (!bullet.active) continue;
            const target = [...this.enemies].find(enemy => enemy.active && runtime.world.overlaps(bullet.body, enemy.body));
            if (!target) continue;
            bullet.destroy();
            this.bullets.delete(bullet);
            this.score += 100;
            this.onScoreCallback(this.score);
            this.resetEnemy(target, runtime);
        }
        if ([...this.enemies].some(enemy => enemy.active && runtime.world.overlaps(this.player.body, enemy.body))) {
            this.lives--;
            for (const enemy of this.enemies) this.resetEnemy(enemy, runtime);
            this.checkGameOver();
        }
    }

    checkGameOver() {
        if (this.lives > 0 || this.dead) return;
        this.dead = true;
        this.onGameOverCallback('Ship down');
    }

    onRender(ctx, _alpha, runtime) {
        for (const star of this.stars) {
            const x = star.x / 1000 * runtime.width;
            ctx.fillStyle = '#d9e7ffb0';
            ctx.fillRect(x, star.y, star.size, star.size);
        }
        ctx.fillStyle = '#e7eff6';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`SCORE ${String(this.score).padStart(5, '0')}`, 15, 22);
        ctx.fillStyle = '#ffb56b';
        ctx.fillText(`LIVES ${'◆'.repeat(this.lives)}`, runtime.width - 105, 22);
    }

    drawShip(ctx, entity) {
        const { x, y, width, height } = entity.body;
        ctx.fillStyle = '#72dce3';
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width / 2, y + height - 7);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d6fbff';
        ctx.fillRect(x + width / 2 - 3, y + 11, 6, 9);
    }

    drawEnemy(ctx, entity) {
        const { x, y, width, height } = entity.body;
        ctx.fillStyle = '#ff927c';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 8);
        ctx.fill();
        ctx.fillStyle = '#2c1c24';
        ctx.fillRect(x + 6, y + 9, 4, 4);
        ctx.fillRect(x + width - 10, y + 9, 4, 4);
    }
}
