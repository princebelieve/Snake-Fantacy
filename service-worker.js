// service-worker.js
const CACHE_NAME = 'snake-fantasy-engine-v2';
const APP_FILES = [
    './', './index.html', './manifest.json', './README.md', './GAME_PLAN.md',
    './docs/ENGINE_API.md', './docs/SNAKE_LEVEL_SCHEMA.md', './css/style.css',
    './data/snake/levels.json', './js/app.js',
    './js/engine/Camera2D.js', './js/engine/Entity.js', './js/engine/GameRuntime.js',
    './js/engine/Input.js', './js/engine/JsonConfigLoader.js', './js/engine/PhysicsWorld.js',
    './js/engine/RandomGenerator.js', './js/engine/SaveStore.js', './js/engine/Scene.js',
    './js/engine/SignalBus.js', './js/engine/Vector2.js', './js/games/SnakeScene.js',
    './js/games/snake/GameManager.js', './js/games/snake/LevelManager.js',
    './js/games/snake/ProgressManager.js', './js/ui/GameUI.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES.map(file => new URL(file, self.registration.scope))))
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
    event.respondWith(
        caches.match(event.request).then(cached => {
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
                cacheNames.filter(name => (name.startsWith('snake-fantasy-') || name.startsWith('movement-lab-')) && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
