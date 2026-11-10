import { GameManager } from './games/snake/GameManager.js';

const app = new GameManager({
    canvas: document.querySelector('#gameCanvas'),
    root: document
});

window.amarasFantacy = app;
app.initialize().catch(error => {
    console.error("Amara's Fantacy could not start:", error);
    const message = document.querySelector('#loadError');
    if (message) { message.hidden = false; message.textContent = `The game could not load: ${error.message}`; }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname))) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=17', { updateViaCache: 'none' }));
}

window.addEventListener('pagehide', () => app.destroy(), { once: true });
