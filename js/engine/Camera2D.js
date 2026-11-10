import { Vector2 } from './Vector2.js';

/** Camera offset and zoom shared by scrolling and follow-camera scenes. */
export class Camera2D {
    constructor({ x = 0, y = 0, zoom = 1, smoothing = 0 } = {}) {
        this.position = new Vector2(x, y);
        this.zoom = zoom;
        this.smoothing = smoothing;
    }

    follow(target, dt, viewportWidth, viewportHeight, offsetX = 0, offsetY = 0) {
        const x = target.x - viewportWidth / (2 * this.zoom) + offsetX;
        const y = target.y - viewportHeight / (2 * this.zoom) + offsetY;
        const amount = this.smoothing > 0 ? 1 - Math.exp(-this.smoothing * dt) : 1;
        this.position.x += (x - this.position.x) * amount;
        this.position.y += (y - this.position.y) * amount;
        return this;
    }

    apply(ctx) {
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.position.x, -this.position.y);
    }

    screenToWorld(x, y) {
        return new Vector2(x / this.zoom + this.position.x, y / this.zoom + this.position.y);
    }
}
