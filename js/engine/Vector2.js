/** A small mutable 2D vector used by simulation and rendering code. */
export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) { this.x = x; this.y = y; return this; }
    copy(value) { this.x = value.x; this.y = value.y; return this; }
    clone() { return new Vector2(this.x, this.y); }
    add(value) { this.x += value.x; this.y += value.y; return this; }
    subtract(value) { this.x -= value.x; this.y -= value.y; return this; }
    scale(value) { this.x *= value; this.y *= value; return this; }
    get length() { return Math.hypot(this.x, this.y); }
    normalize() {
        const length = this.length;
        if (length > 0) this.scale(1 / length);
        return this;
    }
    static add(a, b) { return new Vector2(a.x + b.x, a.y + b.y); }
    static subtract(a, b) { return new Vector2(a.x - b.x, a.y - b.y); }
}
