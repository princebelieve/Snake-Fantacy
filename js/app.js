import { GameManager } from './games/snake/GameManager.js';

const app = new GameManager({
    canvas: document.querySelector('#gameCanvas'),
    root: document
});

window.snakeFantasy = app;
app.initialize().catch(error => {
    console.error('Snake Fantasy could not start:', error);
    const message = document.querySelector('.intro-copy');
    if (message) message.textContent = `The game data could not load. ${error.message}`;
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

window.addEventListener('pagehide', () => app.destroy(), { once: true });
