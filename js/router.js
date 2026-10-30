import HomePage from './pages/home.js';
import TasksPage from './pages/tasks.js';
import TeamPage from './pages/team.js';
import CommissionPage from './pages/commission.js';
import ProfilePage from './pages/profile.js';

const routes = {
    '/home': { title: 'መግቢያ', component: HomePage, showBack: false },
    '/tasks': { title: 'ስራዎች', component: TasksPage, showBack: false },
    '/team': { title: 'ቡድን', component: TeamPage, showBack: false },
    '/commission': { title: 'ኮሚሽን', component: CommissionPage, showBack: false },
    '/profile': { title: 'እኔ', component: ProfilePage, showBack: false },
};

export const router = async () => {
    const appView = document.getElementById('app-view');
    const headerTitle = document.getElementById('header-title');
    const backBtn = document.getElementById('back-btn');
    const navItems = document.querySelectorAll('.nav-item');

    // Get current hash, default to /home
    let path = window.location.hash.slice(1) || '/home';
    let route = routes[path];

    // Fallback for sub-pages (e.g., #/home/movie/1)
    if (!route && path.split('/').length > 2) {
        const basePath = '/' + path.split('/')[1];
        route = routes[basePath];
    }

    if (route) {
        // Update UI Header
        headerTitle.innerText = route.title;
        backBtn.classList.toggle('hidden', !route.showBack);

        // Update Active Nav
        navItems.forEach(item => {
            if (item.dataset.route === path.slice(1)) {
                item.classList.add('active', 'text-primary');
                item.classList.remove('text-gray-400');
            } else {
                item.classList.remove('active', 'text-primary');
                item.classList.add('text-gray-400');
            }
        });

        // Show Skeleton Loader (Fast loader requirement)
        appView.innerHTML = `
            <div class="p-4 space-y-4 page-enter">
                <div class="skeleton h-40 w-full"></div>
                <div class="flex gap-4">
                    <div class="skeleton h-24 w-1/2"></div>
                    <div class="skeleton h-24 w-1/2"></div>
                </div>
                <div class="skeleton h-64 w-full"></div>
            </div>
        `;

        // Simulate network delay for smooth transition (150ms)
        setTimeout(() => {
            appView.innerHTML = route.component.render();
            route.component.init(); // Run any JS needed for the specific page
        }, 150);
    } else {
        appView.innerHTML = `<div class="p-10 text-center text-gray-500">Page not found</div>`;
    }
};

// Listen for hash changes
window.addEventListener('hashchange', router);