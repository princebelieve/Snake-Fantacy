import { Input } from './Input.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { SignalBus } from './SignalBus.js';
import { RandomGenerator } from './RandomGenerator.js';

/** Fixed-step canvas runtime. A game supplies a scene with update/render hooks. */
export class GameRuntime {
    constructor(canvas, { fixedDelta = 1 / 120, maxFrameDelta = 0.1, inputTarget = window } = {}) {
        if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('GameRuntime needs a canvas');
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        if (!this.context) throw new Error('Canvas 2D is unavailable');
        this.fixedDelta = fixedDelta;
        this.maxFrameDelta = maxFrameDelta;
        this.input = new Input(inputTarget);
        this.world = new PhysicsWorld();
        this.events = new SignalBus();
        this.random = new RandomGenerator();
        this.scene = null;
        this.running = false;
        this.paused = false;
        this.accumulator = 0;
        this.lastTime = 0;
        this.frame = this.frame.bind(this);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.resize();
    }

    async setScene(scene) {
        const previous = this.scene;
        if (previous) this.events.emit('scene:exiting', previous);
        if (previous?.exit) await previous.exit(this);
        this.world.clear();
        this.world.onCollision = null;
        this.input.clear();
        this.input.clearVirtualState();
        this.input.endFrame();
        this.scene = scene;
        if (scene?.enter) await scene.enter(this);
        this.events.emit('scene:entered', scene);
        return scene;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this.frame);
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        this.accumulator = 0;
        this.input.clear();
        this.input.clearVirtualState();
        this.input.endFrame();
        this.events.emit('runtime:paused');
    }
    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.lastTime = performance.now();
        this.events.emit('runtime:resumed');
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
        this.accumulator = 0;
    }

    destroy() {
        this.stop();
        this.scene?.exit?.(this);
        this.resizeObserver.disconnect();
        this.input.destroy();
        this.world.clear();
        this.scene = null;
        this.events.emit('runtime:destroyed');
        this.events.clear();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.scene?.resize?.(this.width, this.height, this);
        // Resizing a canvas clears its bitmap. Repaint paused/static scenes immediately;
        // otherwise the first frame can remain blank until the game loop starts.
        if (!this.running || this.paused) this.render(0);
    }

    frame(now) {
        if (!this.running) return;
        const elapsed = Math.min((now - this.lastTime) / 1000, this.maxFrameDelta);
        this.lastTime = now;
        if (!this.paused) {
            this.accumulator += elapsed;
            while (this.accumulator >= this.fixedDelta) {
                this.scene?.update?.(this.fixedDelta, this);
                this.world.step(this.fixedDelta);
                this.input.endFrame();
                this.accumulator -= this.fixedDelta;
            }
            this.render(this.accumulator / this.fixedDelta);
        }
        this.frameId = requestAnimationFrame(this.frame);
    }

    render(alpha) {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.width, this.height);
        this.scene?.render?.(ctx, alpha, this);
    }
}
