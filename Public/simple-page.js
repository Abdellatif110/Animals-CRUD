// Simple script for About and Contact pages (authentication optional)

class SimplePage {
    constructor() {
        this.init();
    }

    async init() {
        this.initContactForm();

        // Check Login status (optional for these pages)
        const isLoggedIn = await window.utils.checkLoginStatus();
        this.isLoggedIn = isLoggedIn;
        this.userEmail = window.utils.userEmail;
    }

    initContactForm() {
        const contactForm = document.querySelector('.contact-form form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                window.utils.showNotification('Thank you for your message! We will get back to you soon.', 'success');
                contactForm.reset();
            });
        }
    }

}

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.simplePage = new SimplePage();
});
