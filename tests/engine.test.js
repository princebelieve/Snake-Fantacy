import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameEntity } from '../js/engine/Entity.js';
import { GameScene } from '../js/engine/Scene.js';
import { Input } from '../js/engine/Input.js';
import { PhysicsBody, PhysicsWorld } from '../js/engine/PhysicsWorld.js';
import { MovementController } from '../js/engine/MovementController.js';
import { GameRuntime } from '../js/engine/GameRuntime.js';
import { JsonConfigLoader } from '../js/engine/JsonConfigLoader.js';
import { SaveStore } from '../js/engine/SaveStore.js';
import { RandomGenerator } from '../js/engine/RandomGenerator.js';
import { SnakeScene } from '../js/games/SnakeScene.js';
import { CarRaceScene } from '../js/games/CarRaceScene.js';
import { SkyShooterScene } from '../js/games/SkyShooterScene.js';
import { LevelManager } from '../js/games/snake/LevelManager.js';
import { ProgressManager } from '../js/games/snake/ProgressManager.js';
import { GameManager } from '../js/games/snake/GameManager.js';

const snakeLevel = {
    id: 1, name: 'Test Trail', difficulty: 'Easy', stepMs: 100, targetFoods: 2,
    start: { x: 5, y: 5 }, direction: 'right',
    grid: { columns: 12, rows: 10, minimumTile: 12 },
    foodTypes: [{ type: 'apple', points: 10, color: '#ff806b' }],
    foods: [{ x: 7, y: 5, type: 'apple' }], obstacles: [], portals: []
};

function makeRuntime({ width = 800, height = 440, pressed = new Set() } = {}) {
    return {
        width,
        height,
        world: new PhysicsWorld(),
        random: new RandomGenerator(1),
        input: {
            isDown: action => pressed.has(action),
            wasPressed: action => pressed.has(action),
            getAxis: name => name === 'move' ? Number(pressed.has('right')) - Number(pressed.has('left')) : 0
        }
    };
}

test('dynamic body lands on static floor and reports ground contact', () => {
    const world = new PhysicsWorld({ gravityY: 900 });
    const player = world.add(new PhysicsBody({ x: 5, y: 0, width: 10, height: 10 }));
    world.add(new PhysicsBody({ x: 0, y: 40, width: 60, height: 10, type: 'static' }));

    for (let i = 0; i < 120; i++) world.step(1 / 120);

    assert.ok(Math.abs(player.position.y - 30) < 0.001);
    assert.equal(player.contacts.bottom, true);
    assert.equal(player.velocity.y, 0);
});

test('fast body cannot tunnel through a thin static wall', () => {
    const world = new PhysicsWorld({ gravityY: 0 });
    const body = world.add(new PhysicsBody({ x: 0, y: 0, width: 5, height: 8 }));
    body.velocity.x = 2000;
    world.add(new PhysicsBody({ x: 10, y: -10, width: 2, height: 30, type: 'static' }));
    world.step(1 / 120);
    assert.equal(body.position.x, 5);
    assert.equal(body.velocity.x, 0);
    assert.equal(body.contacts.right, true);
});

test('GameScene attaches and removes entity physics bodies through its lifecycle', () => {
    const runtime = makeRuntime();
    class SampleScene extends GameScene {
        onEnter() {
            this.actor = this.add(new GameEntity({ body: new PhysicsBody({ x: 12, y: 8 }) }));
        }
    }
    const scene = new SampleScene();
    scene.enter(runtime);
    assert.equal(runtime.world.bodies.has(scene.actor.body), true);
    assert.equal(scene.entities.has(scene.actor), true);

    scene.exit(runtime);
    assert.equal(runtime.world.bodies.has(scene.actor.body), false);
    assert.equal(scene.entities.size, 0);
});

test('top down diagonal movement is normalized', () => {
    const body = new PhysicsBody({ gravityScale: 0 });
    const motor = new MovementController(body, { mode: 'topDown', maxSpeed: 300 });
    const input = { getAxis: name => name === 'move' || name === 'moveY' ? 1 : 0, wasPressed: () => false };
    motor.update(1, input);
    assert.ok(Math.abs(Math.hypot(body.velocity.x, body.velocity.y) - 300) < 0.001);
});

test('SnakeScene advances a grid step through scene input and entity updates', () => {
    const runtime = makeRuntime({ width: 600, height: 400 });
    runtime.input.wasPressed = () => false;
    const scene = new SnakeScene(snakeLevel);
    scene.enter(runtime);
    const initialX = scene.snake[0].x;
    scene.update(0.12, runtime);
    assert.equal(scene.snake[0].x, initialX + 1);
    assert.equal(scene.segmentEntities.length, 3);
    assert.ok(scene.entities.size >= 4);
});

test('portrait play transposes the board, food, hazards and portals without changing source data', () => {
    const runtime = makeRuntime({ width: 360, height: 540 });
    const level = { ...snakeLevel, obstacles: [{ x: 8, y: 5 }], portals: [{ x: 10, y: 1 }, { x: 11, y: 1 }] };
    const scene = new SnakeScene(level);
    scene.enter(runtime);
    assert.equal(scene.columns, 10);
    assert.equal(scene.rows, 12);
    assert.equal(scene.direction, 'down');
    assert.deepEqual(scene.level.obstacles, [{ x: 5, y: 8 }]);
    assert.deepEqual(scene.level.portals, [{ x: 1, y: 10 }, { x: 1, y: 11 }]);
    assert.equal(scene.foodCell.x, 5);
    assert.equal(scene.foodCell.y, 7);
    scene.update(.21, runtime);
    assert.equal(scene.foodsCollected, 1);
    assert.equal(scene.snake.length, 4);
    assert.equal(level.grid.columns, 12);
    assert.equal(level.direction, 'right');
});

test('food at every board edge remains on canvas in small viewports and after resizing', () => {
    for (const [width, height] of [[266, 165], [290, 190], [220, 310], [600, 90]]) {
        const runtime = makeRuntime({ width, height });
        const scene = new SnakeScene({ ...snakeLevel,
            grid: { columns: 24, rows: 16, minimumTile: 12 }, foods: []
        });
        scene.enter(runtime);
        const checkEdges = () => {
            assert.ok(scene.tile > 0);
            for (const x of [0, scene.columns - 1]) for (const y of [0, scene.rows - 1]) {
                scene.foodQueue = [{ x, y, type: 'apple' }];
                scene.spawnFood(runtime);
                assert.ok(scene.food.position.x >= 0);
                assert.ok(scene.food.position.y >= 0);
                assert.ok(scene.food.position.x + scene.tile <= runtime.width);
                assert.ok(scene.food.position.y + scene.tile <= runtime.height);
                assert.equal(scene.food.visible, true);
            }
        };
        checkEdges();
        runtime.width = height; runtime.height = width;
        scene.resize(runtime.width, runtime.height, runtime);
        checkEdges();
        const food = { ...scene.foodCell };
        scene.updateBonusClock(60, runtime);
        assert.deepEqual(scene.foodCell, food, 'regular food must not expire');
    }
});

test('SnakeScene completes its configured food objective and reports victory', () => {
    const runtime = makeRuntime({ width: 600, height: 400 });
    let result = null;
    const scene = new SnakeScene({ ...snakeLevel, targetFoods: 1 }, { onVictory: value => { result = value; } });
    scene.enter(runtime);
    scene.update(0.21, runtime);
    assert.equal(scene.score, 10);
    assert.equal(scene.completed, true);
    assert.equal(result.foodsCollected, 1);
    assert.equal(scene.snake.length, 4);
});

test('rock and portal sprites are placed on their game cells before collisions can happen', () => {
    const runtime = makeRuntime({ width: 600, height: 400 });
    let collision = null;
    const scene = new SnakeScene({ ...snakeLevel,
        obstacles: [{ x: 8, y: 5 }],
        portals: [{ id: 'a', x: 10, y: 1 }, { id: 'b', x: 11, y: 1 }]
    }, { onGameOver: reason => { collision = reason; } });
    scene.enter(runtime);

    const rock = scene.obstacleEntities[0];
    assert.equal(rock.position.x, scene.offsetX + rock.data.cell.x * scene.tile);
    assert.equal(rock.position.y, scene.offsetY + rock.data.cell.y * scene.tile);
    assert.notEqual(rock.position.x, 0);
    const portal = scene.portalEntities[0];
    assert.equal(portal.position.x, scene.offsetX + portal.data.cell.x * scene.tile);
    assert.equal(portal.position.y, scene.offsetY + portal.data.cell.y * scene.tile);

    scene.snake = [{ x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }];
    scene.direction = scene.nextDirection = 'right';
    scene.stepSnake(runtime);
    assert.equal(collision, 'Rock collision');
});

test('CarRaceScene responds to throttle and creates track collision bodies', () => {
    const runtime = makeRuntime({ pressed: new Set(['accelerate']) });
    const scene = new CarRaceScene();
    scene.enter(runtime);
    scene.update(0.1, runtime);
    assert.ok(scene.speed > 0);
    assert.ok(scene.barriers.length >= 8);
    assert.equal(runtime.world.bodies.has(scene.car.body), true);
});

test('SkyShooterScene fires and awards score for projectile overlap', () => {
    const runtime = makeRuntime({ pressed: new Set(['fire']) });
    const scene = new SkyShooterScene();
    scene.enter(runtime);
    scene.update(1 / 120, runtime);
    const bullet = [...scene.bullets][0];
    const enemy = [...scene.enemies][0];
    assert.ok(bullet);
    bullet.body.position.copy(enemy.body.position);
    scene.update(1 / 120, runtime);
    assert.equal(scene.score, 100);
    assert.equal(scene.bullets.size, 0);
});

test('data-driven Snake levels validate and load without code changes', async () => {
    const file = new URL('../data/snake/levels.json', import.meta.url);
    const data = JSON.parse(await readFile(file, 'utf8'));
    assert.deepEqual(LevelManager.validate(data), []);
    const invalid = structuredClone(data);
    invalid.levels[0].foods[0].x = 90;
    assert.ok(LevelManager.validate(invalid).some(error => error.includes('out-of-grid')));
    const loader = new JsonConfigLoader({ fetcher: async () => ({ ok: true, json: async () => data }) });
    const manager = await new LevelManager(loader, 'memory://levels').initialize();
    assert.equal(manager.getTotalLevels(), 50);
    assert.equal(manager.getLevel(50).portals.length, 2);
    const levels = manager.list();
    assert.ok(levels.every((level, index) => index === 0 || level.stepMs < levels[index - 1].stepMs));
    assert.ok(levels.every((level, index) => index === 0 || level.targetFoods > levels[index - 1].targetFoods));
    assert.ok(levels.every(level => level.targetFoods % 5 !== 0));
    assert.equal(manager.getLevel(1).specialFruit.afterRegularFoods, 5);
    assert.equal(manager.getLevel(1).specialFruit.multiplier, 5);
    assert.equal(manager.getLevel(1).storyArc.form, 'River Serpent');
    assert.equal(manager.getLevel(11).storyArc.form, 'Mist Weaver');
    assert.equal(manager.getLevel(50).storyArc.form, 'Sea Dragon');
    assert.match(manager.story.ending, /Victor/);
    assert.match(manager.story.ending, /child/);
    assert.throws(() => manager.getLevel(51), RangeError);
});

test('special fruit appears after each five regular fruits, is worth 5x, does not grow, and expires harmlessly', () => {
    const runtime = makeRuntime({ width: 600, height: 400 });
    runtime.input.wasPressed = () => false;
    runtime.random.pick = values => values.find(cell => cell.x === 2 && cell.y === 2) || values[0];
    const events = [];
    const scene = new SnakeScene({ ...snakeLevel, stepMs: 1000, targetFoods: 12, specialDurationSeconds: .15,
        specialFruit: { type: 'special-fruit', asset: 'bonus', afterRegularFoods: 5, multiplier: 5, durationSeconds: .15 } }, {
        onBonus: (...event) => events.push(event)
    });
    scene.enter(runtime);
    scene.update(.001, runtime);
    assert.ok(scene.entities.has(scene.bonus), 'the hidden bonus sprite must remain in the scene until it spawns');
    const regularFood = { ...scene.foodCell };
    scene.updateBonusClock(120, runtime);
    assert.deepEqual(scene.foodCell, regularFood);
    assert.equal(scene.bonus.visible, false);
    const feedRegularFruit = () => {
        scene.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
        scene.direction = scene.nextDirection = 'right';
        scene.foodCell = { x: 6, y: 5, type: 'apple', points: 10, color: '#ff806b', asset: 'apple' };
        scene.food.setPosition(scene.offsetX + 6 * scene.tile, scene.offsetY + 5 * scene.tile);
        scene.stepSnake(runtime);
    };

    for (let i = 0; i < 4; i++) { feedRegularFruit(); assert.equal(scene.bonus.visible, false); }
    feedRegularFruit();
    assert.equal(scene.foodsCollected, 5);
    assert.equal(scene.regularScore, 50);
    assert.equal(scene.bonus.visible, true);
    assert.equal(scene.bonus.data.points, 50);

    scene.snake = [{ x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }];
    scene.direction = scene.nextDirection = 'right';
    scene.bonusCell = { x: 8, y: 5 };
    scene.bonus.setPosition(scene.offsetX + 8 * scene.tile, scene.offsetY + 5 * scene.tile);
    scene.foodCell = { x: 10, y: 5, type: 'apple', points: 10, color: '#ff806b', asset: 'apple' };
    scene.food.setPosition(scene.offsetX + 10 * scene.tile, scene.offsetY + 5 * scene.tile);
    const lengthBeforeBonus = scene.snake.length;
    scene.stepSnake(runtime);
    assert.equal(scene.score, 100);
    assert.equal(scene.regularScore, 50);
    assert.equal(scene.snake.length, lengthBeforeBonus);
    assert.equal(scene.foodsCollected, 5);
    assert.ok(events.some(([event]) => event === 'collect'));

    for (let i = 0; i < 5; i++) feedRegularFruit();
    assert.equal(scene.foodsCollected, 10);
    assert.equal(scene.regularScore, 100);
    assert.equal(scene.bonus.visible, true);
    const scoreBeforeExpiry = scene.score;
    scene.bonusRemaining = .01;
    scene.update(.02, runtime);
    assert.equal(scene.bonus.visible, false);
    assert.equal(scene.score, scoreBeforeExpiry);
    assert.equal(scene.foodsCollected, 10);
    assert.ok(events.some(([event]) => event === 'expire'));
});

test('versioned SaveStore persists progress and ProgressManager unlocks levels', () => {
    const values = new Map();
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
    const store = new SaveStore('test-progress', { storage });
    const progress = new ProgressManager(store, 5).initialize();
    progress.recordScore(1, 50);
    progress.completeLevel(1, 80, 3);
    const restored = new ProgressManager(new SaveStore('test-progress', { storage }), 5).initialize();
    assert.equal(restored.getBestScore(), 80);
    assert.equal(restored.getUnlockedLevel(), 2);
    assert.equal(restored.data.levelStars[1], 3);
    assert.equal(restored.isUnlocked(2), true);
});

test('GameManager coordinates menu, play, pause, failure, retry, and level completion', async () => {
    const previousWindow = globalThis.window;
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const pressed = new Set();
    const runtime = {
        canvas: { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} },
        world: new PhysicsWorld(), random: new RandomGenerator(2),
        input: {
            bind() { return this; }, trigger() {}, clearVirtualState() {},
            wasPressed: () => false, isDown: () => false, getAxis: () => 0, endFrame() {}
        },
        events: { on() {}, emit() {} }, running: false, paused: false, scene: null,
        async setScene(scene) {
            await this.scene?.exit?.(this);
            this.world.clear();
            this.scene = scene;
            await scene.enter(this);
        },
        start() { this.running = true; this.paused = false; },
        pause() { this.paused = true; },
        resume() { this.paused = false; },
        destroy() { this.scene?.exit?.(this); }
    };
    const screens = new Map([['game', { hidden: true }]]);
    const ui = {
        screens,
        updateMenu() {}, renderLevels() {}, updateGame() {}, hideOverlays() {}, showOverlay() {},
        showStory() {}, hideTutorial() {}, showTutorial() { this.tutorialStepCount = 3; },
        showScreen(name) { screens.get('game').hidden = name !== 'game'; },
        showGameOver() {}, showVictory() {}
    };
    const levelManager = {
        async initialize() {}, story: { prologue: 'Amara becomes a river serpent.' }, getTotalLevels: () => 2,
        getLevel: id => ({ ...snakeLevel, id, name: `River ${id}`, storyArc: { name: 'River call' } }), list: () => [snakeLevel, { ...snakeLevel, id: 2 }]
    };
    const storageValues = new Map();
    const storage = { getItem: key => storageValues.get(key) ?? null, setItem: (key, value) => storageValues.set(key, value), removeItem: key => storageValues.delete(key) };
    const progress = new ProgressManager(new SaveStore('manager-test', { storage }), 2);
    const manager = new GameManager({ runtime, levelManager, progressManager: progress, ui });

    await manager.initialize();
    await manager.handleAction('start');
    assert.equal(manager.state, 'story');
    await manager.handleAction('begin-story');
    assert.equal(manager.state, 'tutorial');
    await manager.handleAction('tutorial-next');
    await manager.handleAction('tutorial-next');
    await manager.handleAction('tutorial-next');
    assert.equal(manager.state, 'ready');
    assert.equal(runtime.paused, true);
    assert.equal(runtime.running, false, 'tutorial completion must not start the game loop');
    const waitingHead = { ...runtime.scene.snake[0] };
    await manager.handleAction('turn', 'down');
    assert.deepEqual(runtime.scene.snake[0], waitingHead);
    await manager.handleAction('start-chapter');
    assert.equal(manager.state, 'playing');
    manager.handleAction('pause');
    assert.equal(manager.state, 'paused');
    assert.equal(runtime.paused, true);
    manager.handleAction('resume');
    assert.equal(manager.state, 'playing');
    assert.equal(runtime.paused, false);
    runtime.scene.onScoreCallback(50, snakeLevel, 1);
    runtime.scene.onGameOverCallback('Wall collision', 50);
    assert.equal(manager.state, 'failed');
    assert.equal(progress.getBestScore(), 50);
    await manager.handleAction('restart');
    assert.equal(manager.state, 'ready');
    assert.equal(runtime.paused, true, 'retry must wait for another start click');
    await manager.handleAction('start-chapter');
    runtime.scene.onVictoryCallback({ score: 80, level: snakeLevel });
    assert.equal(manager.state, 'won');
    assert.equal(progress.getUnlockedLevel(), 2);
    await manager.handleAction('next-level');
    assert.equal(manager.currentLevel, 2);
    assert.equal(manager.state, 'story');
    await manager.handleAction('begin-story');
    assert.equal(manager.state, 'ready');
    assert.equal(runtime.paused, true, 'later chapters must also wait');
    await manager.handleAction('start-chapter');
    assert.equal(manager.state, 'playing');
    manager.destroy();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
});

test('mouse strokes steer without clicking, ignore jitter, and reset outside gameplay', () => {
    const previousWindow = globalThis.window;
    const windowListeners = new Map();
    globalThis.window = { addEventListener(type, handler) { windowListeners.set(type, handler); }, removeEventListener() {} };
    try {
        const listeners = new Map(), turns = [];
        const manager = Object.create(GameManager.prototype);
        manager.state = 'playing';
        manager.ui = { screens: new Map([['game', { hidden: false }]]) };
        manager.runtime = {
            canvas: { addEventListener(type, handler) { listeners.set(type, handler); }, setPointerCapture() {} },
            input: { bind() { return this; }, trigger(action) { turns.push(action); } }
        };
        manager.bindInput();
        const move = (x, y, pointerType = 'mouse') => windowListeners.get('pointermove')({ clientX: x, clientY: y, pointerType, buttons: 0 });
        move(100, 100); move(103, 104);
        assert.deepEqual(turns, []);
        move(120, 100); move(120, 80); move(100, 80); move(100, 100);
        assert.deepEqual(turns, ['snakeRight', 'snakeUp', 'snakeLeft', 'snakeDown']);
        windowListeners.get('mouseout')({ relatedTarget: null });
        move(500, 500);
        assert.equal(turns.length, 4, 're-entering must not turn the snake');
        manager.state = 'paused'; move(520, 500);
        manager.state = 'playing'; move(700, 700);
        assert.equal(turns.length, 4, 'paused mouse movement must not carry over');
        move(700, 720, 'touch');
        assert.equal(turns.length, 4, 'touch movement still uses the swipe handler');
        listeners.get('pointerdown')({ clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 1 });
        listeners.get('pointerup')({ clientX: 50, clientY: 80, pointerType: 'touch' });
        assert.equal(turns.at(-1), 'snakeDown');
    } finally { globalThis.window = previousWindow; }
});

test('Input maps browser key codes to named actions and axes', () => {
    const listeners = new Map();
    const target = {
        addEventListener: (type, listener) => listeners.set(type, listener),
        removeEventListener: type => listeners.delete(type)
    };
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const input = new Input(target);
    input.bind('jump', 'Space').bindAxis('move', 'ArrowLeft', 'ArrowRight');
    listeners.get('keydown')({ code: 'Space' });
    listeners.get('keydown')({ code: 'ArrowRight' });
    assert.equal(input.wasPressed('jump'), true);
    assert.equal(input.getAxis('move'), 1);
    input.endFrame();
    assert.equal(input.wasPressed('jump'), false);
    input.setVirtualDown('raceAccelerate', true);
    assert.equal(input.isDown('raceAccelerate'), true);
    input.setVirtualDown('raceAccelerate', false);
    assert.equal(input.isDown('raceAccelerate'), false);
    listeners.get('keyup')({ code: 'ArrowRight' });
    assert.equal(input.getAxis('move'), 0);
    input.destroy();
    delete globalThis.window;
});

test('GameRuntime advances fixed updates, renders, and replaces scenes cleanly', async () => {
    const previous = {
        window: globalThis.window,
        ResizeObserver: globalThis.ResizeObserver,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        cancelAnimationFrame: globalThis.cancelAnimationFrame
    };
    let animation;
    const eventWindow = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
    const context = new Proxy({}, { get: (target, name) => target[name] || (() => {}), set: (target, name, value) => (target[name] = value, true) });
    globalThis.window = eventWindow;
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => (animation = callback, 1);
    globalThis.cancelAnimationFrame = () => {};

    const canvas = {
        getContext: () => context,
        getBoundingClientRect: () => ({ width: 800, height: 440 })
    };
    const runtime = new GameRuntime(canvas);
    let updates = 0;
    let renders = 0;
    await runtime.setScene({ update: () => updates++, render: () => renders++ });
    runtime.start();
    animation(runtime.lastTime + runtime.fixedDelta * 2000 + 0.01);
    assert.equal(updates, 2);
    assert.equal(renders, 1);
    runtime.stop();
    runtime.resize();
    assert.equal(renders, 2, 'a static scene is redrawn after canvas resize clears its pixels');

    const snake = await runtime.setScene(new SnakeScene(snakeLevel));
    assert.equal(runtime.scene, snake);
    assert.ok(snake.entities.size > 0);
    runtime.render(0.5);
    assert.equal(runtime.world.bodies.size, 0);

    const race = await runtime.setScene(new CarRaceScene());
    assert.ok(runtime.world.bodies.size > 0);
    runtime.render(0.5);
    assert.equal(runtime.scene, race);

    const shooter = await runtime.setScene(new SkyShooterScene());
    assert.ok(runtime.world.bodies.size >= 6);
    runtime.render(0.5);
    assert.equal(runtime.scene, shooter);

    runtime.destroy();

    for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[name];
        else globalThis[name] = value;
    }
});
