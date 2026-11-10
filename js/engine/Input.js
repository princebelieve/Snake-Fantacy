/** Maps browser input to named actions without coupling games to key codes. */
export class Input {
    constructor(target = window) {
        this.target = target;
        this.bindings = new Map();
        this.axisBindings = new Map();
        this.down = new Set();
        this.pressed = new Set();
        this.released = new Set();
        this.virtualPressed = new Set();
        this.virtualDown = new Set();
        this.axes = new Map();
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onKeyUp = this.handleKeyUp.bind(this);
        this.onBlur = () => { this.clear(); this.clearVirtualState(); };
        target.addEventListener('keydown', this.onKeyDown);
        target.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    bind(action, keys) {
        this.bindings.set(action, new Set(Array.isArray(keys) ? keys : [keys]));
        return this;
    }

    bindAxis(name, negativeKeys, positiveKeys) {
        const normalize = keys => new Set(Array.isArray(keys) ? keys : [keys]);
        this.axisBindings.set(name, { negative: normalize(negativeKeys), positive: normalize(positiveKeys) });
        return this;
    }

    isDown(action) { return this.virtualDown.has(action) || this.actionState(action, this.down); }
    wasPressed(action) { return this.virtualPressed.has(action) || this.actionState(action, this.pressed); }
    wasReleased(action) { return this.actionState(action, this.released); }
    getAxis(name) {
        if (this.axes.has(name)) return this.axes.get(name);
        const binding = this.axisBindings.get(name);
        if (!binding) return 0;
        const negative = [...binding.negative].some(key => this.down.has(key)) ? 1 : 0;
        const positive = [...binding.positive].some(key => this.down.has(key)) ? 1 : 0;
        return positive - negative;
    }

    setAxis(name, value) {
        this.axes.set(name, Math.max(-1, Math.min(1, value)));
        return this;
    }

    clearAxis(name) { this.axes.delete(name); return this; }

    trigger(action) {
        this.virtualPressed.add(action);
        return this;
    }

    setVirtualDown(action, value) {
        if (value) this.virtualDown.add(action);
        else this.virtualDown.delete(action);
        return this;
    }

    clearVirtualState() {
        this.virtualDown.clear();
        this.virtualPressed.clear();
        this.axes.clear();
        return this;
    }

    endFrame() {
        this.pressed.clear();
        this.released.clear();
        this.virtualPressed.clear();
    }

    destroy() {
        this.target.removeEventListener('keydown', this.onKeyDown);
        this.target.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        this.clear();
        this.clearVirtualState();
    }

    actionState(action, state) {
        const keys = this.bindings.get(action);
        return Boolean(keys && [...keys].some(key => state.has(key)));
    }

    handleKeyDown(event) {
        if (this.down.has(event.code)) return;
        this.down.add(event.code);
        this.pressed.add(event.code);
    }

    handleKeyUp(event) {
        this.down.delete(event.code);
        this.released.add(event.code);
    }

    clear() {
        for (const key of this.down) this.released.add(key);
        this.down.clear();
        this.pressed.clear();
    }
}
