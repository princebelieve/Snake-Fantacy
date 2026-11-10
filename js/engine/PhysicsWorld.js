import { Vector2 } from './Vector2.js';

/**
 * A simple AABB physics world for arcade movement. Bodies use top-left
 * coordinates and pixel units. Static and kinematic bodies are not displaced
 * by collision resolution; dynamic bodies receive gravity and impulses.
 */
export class PhysicsBody {
    constructor({ x = 0, y = 0, width = 32, height = 32, type = 'dynamic',
        gravityScale = 1, friction = 0, restitution = 0, fixedRotation = true,
        tag = null, userData = null } = {}) {
        if (!['static', 'kinematic', 'dynamic'].includes(type)) {
            throw new TypeError(`Unknown body type: ${type}`);
        }
        this.position = new Vector2(x, y);
        this.previousPosition = this.position.clone();
        this.velocity = new Vector2();
        this.force = new Vector2();
        this.width = width;
        this.height = height;
        this.type = type;
        this.gravityScale = gravityScale;
        this.friction = friction;
        this.restitution = restitution;
        this.fixedRotation = fixedRotation;
        this.tag = tag;
        this.userData = userData;
        this.enabled = true;
        this.world = null;
        this.contacts = { left: false, right: false, top: false, bottom: false };
    }

    applyForce(x, y) { this.force.x += x; this.force.y += y; return this; }
    applyImpulse(x, y) { this.velocity.x += x; this.velocity.y += y; return this; }
    setPosition(x, y) { this.position.set(x, y); return this; }
    get center() { return new Vector2(this.position.x + this.width / 2, this.position.y + this.height / 2); }
}

export class PhysicsWorld {
    constructor({ gravityX = 0, gravityY = 1800, maxVelocity = 2400 } = {}) {
        this.gravity = new Vector2(gravityX, gravityY);
        this.maxVelocity = maxVelocity;
        this.bodies = new Set();
        this.onCollision = null;
    }

    add(body) {
        if (!(body instanceof PhysicsBody)) throw new TypeError('PhysicsWorld.add expects a PhysicsBody');
        if (body.world && body.world !== this) body.world.remove(body);
        body.world = this;
        this.bodies.add(body);
        return body;
    }

    remove(body) {
        this.bodies.delete(body);
        if (body.world === this) body.world = null;
    }

    clear() {
        for (const body of this.bodies) body.world = null;
        this.bodies.clear();
    }

    step(dt) {
        const bodies = [...this.bodies].filter(body => body.enabled);
        for (const body of bodies) {
            body.previousPosition.copy(body.position);
            body.contacts = { left: false, right: false, top: false, bottom: false };
            if (body.type === 'static') continue;
            if (body.type === 'dynamic') {
                body.velocity.x += (this.gravity.x * body.gravityScale + body.force.x) * dt;
                body.velocity.y += (this.gravity.y * body.gravityScale + body.force.y) * dt;
                body.velocity.x *= Math.max(0, 1 - body.friction * dt);
                body.velocity.y *= Math.max(0, 1 - body.friction * dt);
            }
            body.force.set(0, 0);
            body.velocity.x = this.clampVelocity(body.velocity.x);
            body.velocity.y = this.clampVelocity(body.velocity.y);
            body.position.x += body.velocity.x * dt;
        }

        // Resolve horizontal movement before vertical movement so landing on a
        // floor cannot accidentally push a moving body sideways.
        for (const body of bodies) {
            if (body.type !== 'dynamic') continue;
            for (const other of bodies) {
                if (body === other || !this.overlapsOnAxis(body, other, 'x')) continue;
                this.resolveAxis(body, other, 'x');
            }
        }
        for (const body of bodies) {
            if (body.type !== 'static') body.position.y += body.velocity.y * dt;
        }
        for (const body of bodies) {
            if (body.type !== 'dynamic') continue;
            for (const other of bodies) {
                if (body === other || !this.overlapsOnAxis(body, other, 'y')) continue;
                this.resolveAxis(body, other, 'y');
            }
        }
    }

    queryAABB(x, y, width, height, predicate = () => true) {
        const area = { position: { x, y }, width, height };
        return [...this.bodies].filter(body => body.enabled && predicate(body) && this.overlaps(area, body));
    }

    overlaps(a, b) {
        return a.position.x < b.position.x + b.width &&
            a.position.x + a.width > b.position.x &&
            a.position.y < b.position.y + b.height &&
            a.position.y + a.height > b.position.y;
    }

    overlapsOnAxis(a, b, axis) {
        if (axis === 'x') {
            const overlapsNow = a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x;
            const crossed = (a.previousPosition.x + a.width <= b.position.x && a.position.x + a.width >= b.position.x) ||
                (a.previousPosition.x >= b.position.x + b.width && a.position.x <= b.position.x + b.width);
            return a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y && (overlapsNow || crossed);
        }
        const overlapsNow = a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y;
        const crossed = (a.previousPosition.y + a.height <= b.position.y && a.position.y + a.height >= b.position.y) ||
            (a.previousPosition.y >= b.position.y + b.height && a.position.y <= b.position.y + b.height);
        return a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x && (overlapsNow || crossed);
    }

    resolveAxis(body, other, axis) {
        if (other.type === 'dynamic') return;
        const position = body.position;
        const obstacle = other.position;
        if (axis === 'x') {
            if (body.velocity.x > 0) {
                position.x = obstacle.x - body.width;
                body.contacts.right = true;
            } else if (body.velocity.x < 0) {
                position.x = obstacle.x + other.width;
                body.contacts.left = true;
            } else return;
            body.velocity.x = this.bounce(body.velocity.x, body, other);
        } else {
            if (body.velocity.y > 0) {
                position.y = obstacle.y - body.height;
                body.contacts.bottom = true;
            } else if (body.velocity.y < 0) {
                position.y = obstacle.y + other.height;
                body.contacts.top = true;
            } else return;
            body.velocity.y = this.bounce(body.velocity.y, body, other);
        }
        if (this.onCollision) this.onCollision(body, other, axis);
    }

    clampVelocity(value) { return Math.max(-this.maxVelocity, Math.min(this.maxVelocity, value)); }

    bounce(velocity, body, other) {
        const restitution = Math.max(body.restitution, other.restitution);
        return restitution === 0 ? 0 : -velocity * restitution;
    }
}
