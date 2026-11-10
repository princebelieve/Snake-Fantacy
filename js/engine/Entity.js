import { Vector2 } from './Vector2.js';

/** A scene object with optional physics and user supplied update/draw behavior. */
export class GameEntity {
    constructor({ x = 0, y = 0, width = 0, height = 0, body = null, tag = null,
        layer = 0, update = null, render = null, data = {} } = {}) {
        this.body = body;
        this.position = body?.position || new Vector2(x, y);
        this.previousPosition = body?.previousPosition || this.position.clone();
        this.width = body?.width ?? width;
        this.height = body?.height ?? height;
        this.tag = tag ?? body?.tag ?? null;
        this.layer = layer;
        this.updateCallback = update;
        this.renderCallback = render;
        this.data = data;
        this.scene = null;
        this.active = true;
        this.visible = true;
    }

    update(dt, runtime) { this.updateCallback?.(dt, runtime, this); }
    render(ctx, alpha, runtime) { if (this.visible) this.renderCallback?.(ctx, alpha, runtime, this); }
    destroy() { this.scene?.remove(this); }
    setPosition(x, y) {
        this.position.set(x, y);
        if (this.body) this.previousPosition.set(x, y);
        return this;
    }
}
