// Simple script for About and Contact pages (no authentication required)

class SimplePage {
    constructor() {
        this.init();
    }

    init() {
        this.setActiveNavLink();
        this.initContactForm();
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        if (currentPath === '/' || currentPath.includes('index.html')) {
            const homeLink = document.querySelector('a[href="index.html"]');
            if (homeLink) homeLink.classList.add('active');
        } else if (currentPath.includes('about.html')) {
            const aboutLink = document.querySelector('a[href="about.html"]');
            if (aboutLink) aboutLink.classList.add('active');
        } else if (currentPath.includes('contact.html')) {
            const contactLink = document.querySelector('a[href="contact.html"]');
            if (contactLink) contactLink.classList.add('active');
        }
    }

    initContactForm() {
        const contactForm = document.querySelector('.contact-form form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showNotification('Thank you for your message! We will get back to you soon.', 'success');
                contactForm.reset();
            });
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="close-notification" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'notificationSlideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.simplePage = new SimplePage();

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
});
