import { router } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Router
    if (!window.location.hash) {
        window.location.hash = '#/home';
    }
    router();

    // Back Button Logic
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
});