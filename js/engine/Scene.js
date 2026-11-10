/** Base scene lifecycle and entity collection shared by all game genres. */
export class GameScene {
    constructor({ gravityX = 0, gravityY = 0, background = '#10151e' } = {}) {
        this.gravityX = gravityX;
        this.gravityY = gravityY;
        this.background = background;
        this.entities = new Set();
        this.runtime = null;
    }

    enter(runtime) {
        this.runtime = runtime;
        runtime.world.gravity.set(this.gravityX, this.gravityY);
        for (const entity of this.entities) if (entity.body) runtime.world.add(entity.body);
        this.onEnter(runtime);
    }

    exit(runtime) {
        this.onExit(runtime);
        for (const entity of [...this.entities]) this.remove(entity);
        this.runtime = null;
    }

    add(entity) {
        if (!entity || typeof entity.update !== 'function' || typeof entity.render !== 'function') {
            throw new TypeError('GameScene.add expects a GameEntity-like object');
        }
        entity.scene?.remove(entity);
        entity.scene = this;
        this.entities.add(entity);
        if (entity.body) this.runtime?.world.add(entity.body);
        return entity;
    }

    remove(entity) {
        if (!this.entities.delete(entity)) return;
        if (entity.body) this.runtime?.world.remove(entity.body);
        entity.scene = null;
    }

    update(dt, runtime) {
        this.onUpdate(dt, runtime);
        for (const entity of [...this.entities]) {
            if (!this.entities.has(entity)) continue;
            if (entity.active) entity.update(dt, runtime);
            else this.remove(entity);
        }
    }

    render(ctx, alpha, runtime) {
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, runtime.width, runtime.height);
        this.onRender(ctx, alpha, runtime);
        const sorted = [...this.entities].sort((a, b) => a.layer - b.layer);
        for (const entity of sorted) entity.render(ctx, alpha, runtime);
        this.afterRender(ctx, alpha, runtime);
    }

    onEnter() {}
    onExit() {}
    onUpdate() {}
    onRender() {}
    afterRender() {}
    resize() {}
}
