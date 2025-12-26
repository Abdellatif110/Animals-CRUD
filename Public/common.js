window.utils = {
    isLoggedIn: false,
    showNotification(message, type = 'info', title = '') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        const titles = {
            success: 'Succès',
            error: 'Erreur',
            info: 'Information',
            warning: 'Attention'
        };

        notification.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size: 1.2rem; color: ${type === 'success' ? 'var(--success)' : (type === 'error' ? 'var(--danger)' : 'var(--primary)')}"></i>
            <div class="notification-content">
                <div class="notification-title">${title || titles[type]}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.style.animation = 'notification-out 0.3s forwards';
            setTimeout(() => notification.remove(), 300);
        });

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'notification-out 0.3s forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    },

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (currentPath === '/' && href === 'index.html') {
                link.classList.add('active');
            } else if (currentPath.includes(href)) {
                link.classList.add('active');
            }
        });
    },

    initMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/me?_=' + Date.now());
            if (!response.ok) {
                console.warn('Auth check failed: HTTP', response.status);
                return false;
            }
            const data = await response.json();

            if (data.loggedIn) {
                this.isLoggedIn = true;
                this.userEmail = data.email || '';

                const uiElements = {
                    desktop: {
                        info: document.getElementById('user-info'),
                        email: document.getElementById('user-email-display')
                    },
                    mobile: {
                        info: document.getElementById('mobile-user-info'),
                        email: document.getElementById('mobile-user-email-display')
                    }
                };

                Object.values(uiElements).forEach(view => {
                    if (view.info) {
                        view.info.style.display = 'flex';
                        view.info.classList.remove('hidden');
                    }
                    if (view.email) view.email.textContent = data.email;
                });

                ['auth-btn', 'mobile-auth-btn'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.style.display = 'none';
                });

                return true;
            } else {
                this.isLoggedIn = false;
                // Hide user info when not logged in
                const uiElements = {
                    desktop: {
                        info: document.getElementById('user-info'),
                        email: document.getElementById('user-email-display')
                    },
                    mobile: {
                        info: document.getElementById('mobile-user-info'),
                        email: document.getElementById('mobile-user-email-display')
                    }
                };

                Object.values(uiElements).forEach(view => {
                    if (view.info) {
                        view.info.style.display = 'none';
                        view.info.classList.add('hidden');
                    }
                });

                // Redirect to login if not on login page
                if (window.location.pathname !== '/login.html') {
                    window.location.href = 'login.html';
                }

                return false;
            }
        } catch (error) {
            console.warn('Auth check failed', error);
            this.isLoggedIn = false;

            // Redirect to login if not on login page
            if (window.location.pathname !== '/login.html') {
                window.location.href = 'login.html';
            }

            return false;
        }
    },

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                this.showNotification('Déconnexion réussie', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        } catch (error) {
            this.showNotification('Erreur lors de la déconnexion', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    window.utils.setActiveNavLink();
    window.utils.initMobileMenu();
    await window.utils.checkLoginStatus();

    ['logout-btn', 'mobile-logout-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => window.utils.logout());
    });
});
