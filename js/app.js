import { GameManager } from './games/snake/GameManager.js';

const app = new GameManager({
    canvas: document.querySelector('#gameCanvas'),
    root: document
});

window.amarasFantacy = app;
// Unlock audio synchronously inside a real gesture, before any loading awaits.
const unlockAudio = () => app.soundManager.unlock();
document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('keydown', unlockAudio, { capture: true });
document.addEventListener('visibilitychange', () => app.soundManager.setVisible(!document.hidden));
app.initialize().catch(error => {
    console.error("Amara's Fantacy could not start:", error);
    const message = document.querySelector('#loadError');
    if (message) { message.hidden = false; message.textContent = `The game could not load: ${error.message}`; }
});

window.addEventListener('pagehide', () => app.destroy(), { once: true });
