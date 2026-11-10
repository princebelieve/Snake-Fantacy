import { GameEntity } from '../engine/Entity.js';
import { GameScene } from '../engine/Scene.js';
import { PhysicsBody } from '../engine/PhysicsWorld.js';

export class CarRaceScene extends GameScene {
    constructor({ onScore = () => {} } = {}) {
        super({ background: '#17231e' });
        this.onScoreCallback = onScore;
        this.barriers = [];
    }

    onEnter(runtime) {
        const { width, height } = runtime;
        this.speed = 0;
        this.angle = 0;
        this.elapsed = 0;
        this.lap = 0;
        this.barriers = [];
        const outer = 26;
        const innerX = Math.max(120, width * 0.22);
        const innerY = Math.max(105, height * 0.27);
        this.inner = { x: innerX, y: innerY, width: width - innerX * 2, height: height - innerY * 2 };
        this.checkpointX = width - 72;
        this.addBarrier(runtime, 0, 0, width, outer);
        this.addBarrier(runtime, 0, height - outer, width, outer);
        this.addBarrier(runtime, 0, 0, outer, height);
        this.addBarrier(runtime, width - outer, 0, outer, height);
        this.addBarrier(runtime, innerX, innerY, this.inner.width, 12);
        this.addBarrier(runtime, innerX, height - innerY - 12, this.inner.width, 12);
        this.addBarrier(runtime, innerX, innerY, 12, this.inner.height);
        this.addBarrier(runtime, width - innerX - 12, innerY, 12, this.inner.height);

        const body = runtime.world.add(new PhysicsBody({
            x: 76, y: height - innerY + 20, width: 26, height: 42,
            gravityScale: 0, friction: 0, tag: 'player-car'
        }));
        this.car = this.add(new GameEntity({ body, layer: 3,
            render: (ctx, _alpha, _runtime, entity) => this.drawCar(ctx, entity)
        }));
        runtime.world.onCollision = (first, second) => {
            if (first === body && second.tag === 'track-wall') this.speed *= 0.65;
        };
    }

    onUpdate(dt, runtime) {
        this.elapsed += dt;
        const input = runtime.input;
        const throttle = input.isDown('accelerate') ? 1 : 0;
        const brake = input.isDown('brake') ? 1 : 0;
        const steer = (input.isDown('turnRight') ? 1 : 0) - (input.isDown('turnLeft') ? 1 : 0);

        if (throttle) this.speed = Math.min(420, this.speed + 300 * dt);
        else if (brake) this.speed = this.speed > 0
            ? Math.max(0, this.speed - 620 * dt)
            : Math.max(-130, this.speed - 180 * dt);
        else this.speed = this.approach(this.speed, 0, 70 * dt);

        this.angle += steer * Math.sign(this.speed) * Math.min(1, Math.abs(this.speed) / 130) * 2.2 * dt;
        this.car.body.velocity.set(Math.cos(this.angle) * this.speed, Math.sin(this.angle) * this.speed);
        const previousCenterX = this.car.body.previousPosition.x + this.car.width / 2;
        const centerX = this.car.body.position.x + this.car.width / 2;
        const centerY = this.car.body.position.y + this.car.height / 2;
        if (previousCenterX < this.checkpointX && centerX >= this.checkpointX && Math.abs(centerY - runtime.height / 2) < 38 && this.speed > 70) {
            this.lap++;
            this.onScoreCallback(this.lap);
        }
    }

    onRender(ctx, _alpha, runtime) {
        const { width, height } = runtime;
        ctx.fillStyle = '#202d26';
        ctx.fillRect(outerInset, outerInset, width - outerInset * 2, height - outerInset * 2);
        ctx.fillStyle = '#59615b';
        ctx.fillRect(26, 26, width - 52, height - 52);
        ctx.fillStyle = '#24392e';
        ctx.fillRect(this.inner.x + 12, this.inner.y + 12, this.inner.width - 24, this.inner.height - 24);
        ctx.strokeStyle = '#f3f0d066';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 13]);
        ctx.strokeRect(62, 62, width - 124, height - 124);
        ctx.setLineDash([]);
        ctx.fillStyle = '#e7e2c3';
        ctx.fillRect(width - 74, height / 2 - 36, 5, 72);
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 ? '#18201d' : '#f4f0df';
            ctx.fillRect(width - 79 + (i % 2) * 6, height / 2 - 36 + i * 12, 6, 12);
        }
        ctx.fillStyle = '#f4f0df';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`LAP ${String(this.lap).padStart(2, '0')}   ${this.elapsed.toFixed(1)} s`, 15, 22);
        ctx.fillText(`SPEED ${Math.round(Math.abs(this.speed) / 4.2)} km/h`, width - 160, 22);
    }

    addBarrier(runtime, x, y, width, height) {
        const body = runtime.world.add(new PhysicsBody({ x, y, width, height, type: 'static', tag: 'track-wall' }));
        this.barriers.push(body);
        return body;
    }

    drawCar(ctx, entity) {
        const body = entity.body;
        ctx.save();
        ctx.translate(body.position.x + body.width / 2, body.position.y + body.height / 2);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillStyle = '#ffb56b';
        ctx.beginPath();
        ctx.roundRect(-body.width / 2, -body.height / 2, body.width, body.height, 7);
        ctx.fill();
        ctx.fillStyle = '#24313a';
        ctx.fillRect(-body.width * 0.34, -body.height * 0.2, body.width * 0.68, body.height * 0.32);
        ctx.fillStyle = '#fff0ad';
        ctx.fillRect(-body.width * 0.38, -body.height * 0.48, 5, 4);
        ctx.fillRect(body.width * 0.19, -body.height * 0.48, 5, 4);
        ctx.restore();
    }

    approach(value, target, amount) {
        return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
    }
}

const outerInset = 0;
