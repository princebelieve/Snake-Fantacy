// service-worker.js
const CACHE_NAME = 'amara-fantacy-game-v24';
const APP_FILES = [
    './', './index.html', './manifest.json', './README.md', './GAME_PLAN.md',
    './docs/ENGINE_API.md', './docs/SNAKE_LEVEL_SCHEMA.md', './css/style.css', './css/game-stage.css',
    './data/snake/levels.json', './js/app.js',
    './assets/amara_snake_transparent.png', './assets/sprites/amara-serpent-atlas.png',
    './assets/sprites/lightning.png', './assets/references/forest-arena.jpg',
    './assets/art/amara-title.png', './assets/art/stone-arena.jpg',
    './assets/sprites/apple.png', './assets/sprites/river-fish.png',
    './assets/sprites/water-orb.png', './assets/sprites/bonus-star.png',
    './assets/audio/fruit-pickup.wav', './assets/audio/bonus-sparkle.wav', './assets/audio/snake-crash.wav',
    './assets/audio/level-clear.wav', './assets/audio/bonus-expire.wav',
    './js/engine/Camera2D.js', './js/engine/Entity.js', './js/engine/GameRuntime.js',
    './js/engine/Input.js', './js/engine/JsonConfigLoader.js', './js/engine/PhysicsWorld.js',
    './js/engine/RandomGenerator.js', './js/engine/SaveStore.js', './js/engine/Scene.js',
    './js/engine/SignalBus.js', './js/engine/Vector2.js', './js/games/SnakeScene.js',
    './js/games/snake/GameManager.js', './js/games/snake/LevelManager.js',
    './js/games/snake/ProgressManager.js', './js/games/snake/SnakeAssets.js',
    './js/games/snake/SoundManager.js', './js/ui/GameUI.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES.map(file => new URL(file, self.registration.scope))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
    // Fetch code together with the current HTML; never mix fresh markup with old modules.
    if (/\.(?:js|css)$/.test(new URL(event.request.url).pathname)) {
        event.respondWith(fetch(new Request(event.request, { cache: 'no-cache' }))
            .then(async response => {
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, response.clone());
                }
                return response;
            })
            .catch(async () => (await (await caches.open(CACHE_NAME)).match(event.request)) || Response.error()));
        return;
    }
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(new Request(event.request, { cache: 'reload' }))
                .then(response => {
                    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                    return response;
                })
                .catch(async () => (await caches.match(event.request)) || caches.match(new URL('./index.html', self.registration.scope)))
        );
        return;
    }
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok && new URL(event.request.url).origin === self.location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            }).catch(() => event.request.mode === 'navigate' ? caches.match(new URL('./index.html', self.registration.scope)) : Response.error());
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => (name.startsWith('snake-fantasy-') || name.startsWith('amara-fantacy-') || name.startsWith('movement-lab-')) && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ).then(() => self.clients.claim());
        })
    );
});
