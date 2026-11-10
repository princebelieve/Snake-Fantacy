/** Reusable character movement presets layered over PhysicsBody + Input. */
export class MovementController {
    constructor(body, {
        mode = 'platformer',
        moveAction = 'move',
        jumpAction = 'jump',
        maxSpeed = 320,
        acceleration = 2200,
        airAcceleration = 1200,
        deceleration = 2600,
        jumpSpeed = 650,
        coyoteTime = 0.1,
        jumpBuffer = 0.12,
        runSpeed = 360,
        gravityScale = 1,
        topDownYAction = 'moveY'
    } = {}) {
        if (!body) throw new TypeError('MovementController needs a PhysicsBody');
        if (!['platformer', 'topDown', 'runner'].includes(mode)) {
            throw new TypeError(`Unknown movement mode: ${mode}`);
        }
        this.body = body;
        this.mode = mode;
        this.moveAction = moveAction;
        this.jumpAction = jumpAction;
        this.topDownYAction = topDownYAction;
        this.maxSpeed = maxSpeed;
        this.acceleration = acceleration;
        this.airAcceleration = airAcceleration;
        this.deceleration = deceleration;
        this.jumpSpeed = jumpSpeed;
        this.coyoteTime = coyoteTime;
        this.jumpBuffer = jumpBuffer;
        this.runSpeed = runSpeed;
        this.body.gravityScale = mode === 'topDown' ? 0 : gravityScale;
        this.groundedTime = 0;
        this.jumpBufferTime = 0;
    }

    update(dt, input) {
        if (this.body.contacts.bottom) this.groundedTime = this.coyoteTime;
        else this.groundedTime = Math.max(0, this.groundedTime - dt);

        const horizontal = input.getAxis(this.moveAction);
        if (this.mode === 'topDown') {
            let vertical = input.getAxis(this.topDownYAction);
            let targetHorizontal = horizontal;
            const magnitude = Math.hypot(targetHorizontal, vertical);
            if (magnitude > 1) {
                targetHorizontal /= magnitude;
                vertical /= magnitude;
            }
            this.body.velocity.y = this.approach(
                this.body.velocity.y,
                vertical * this.maxSpeed,
                (vertical === 0 ? this.deceleration : this.acceleration) * dt
            );
            this.body.velocity.x = this.approach(
                this.body.velocity.x,
                targetHorizontal * this.maxSpeed,
                (targetHorizontal === 0 ? this.deceleration : this.acceleration) * dt
            );
            return;
        }

        this.body.velocity.x = this.approach(
            this.body.velocity.x,
            this.mode === 'runner' ? this.runSpeed : horizontal * this.maxSpeed,
            (horizontal === 0 && this.mode !== 'runner' ? this.deceleration : this.acceleration) * dt
        );

        if (this.mode === 'platformer' && !this.body.contacts.bottom) {
            // Air steering is independently tunable while retaining the target speed.
            this.body.velocity.x = this.approach(
                this.body.velocity.x,
                horizontal * this.maxSpeed,
                (horizontal === 0 ? this.deceleration : this.airAcceleration) * dt
            );
        }

        if (input.wasPressed(this.jumpAction)) this.jumpBufferTime = this.jumpBuffer;
        else this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);

        if (this.jumpBufferTime > 0 && this.groundedTime > 0) {
            this.body.velocity.y = -this.jumpSpeed;
            this.jumpBufferTime = 0;
            this.groundedTime = 0;
        }
    }

    approach(current, target, amount) {
        return current < target ? Math.min(current + amount, target) : Math.max(current - amount, target);
    }
}
