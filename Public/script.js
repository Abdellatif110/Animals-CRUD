class AnimalApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentTab = 'all';
        this.currentFilter = '';
        this.editingAnimal = null;
        this.animals = [];
        this.itemsPerPage = 9;
        this.currentPage = 1;

        this.init();
    }

    async init() {
        this.initEvents();
        await this.checkServerStatus();
        await this.loadAnimals();
        await this.updateStats();
        this.hideLoading();
    }

    initEvents() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.currentPage = 1;
                this.filterAnimals();
            });
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.currentFilter = e.target.value.toLowerCase();
            this.currentPage = 1;
            this.filterAnimals();
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.currentFilter = '';
            this.filterAnimals();
        });

        // Buttons
        document.getElementById('add-animal-btn').addEventListener('click', () => this.openModal());
        document.getElementById('btn-first-add').addEventListener('click', () => this.openModal());

        document.getElementById('btn-refresh').addEventListener('click', async () => {
            await this.loadAnimals();
            await this.updateStats();
            this.showNotification('Données rafraîchies', 'success');
        });

        document.getElementById('btn-setup').addEventListener('click', async () => {
            await this.setupDatabase();
        });

        document.getElementById('btn-demo').addEventListener('click', async () => {
            await this.loadDemoData();
        });

        document.getElementById('btn-first-demo').addEventListener('click', async () => {
            await this.loadDemoData();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Modal
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('save-animal').addEventListener('click', () => this.saveAnimal());

        document.getElementById('animal-image').addEventListener('input', (e) => {
            this.updateImagePreview(e.target.value);
        });

        document.getElementById('animal-modal').addEventListener('click', (e) => {
            if (e.target.id === 'animal-modal') this.closeModal();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayAnimals();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.getFilteredAnimals().length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayAnimals();
            }
        });
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (response.ok) {
                document.getElementById('server-status').innerHTML = `
                    <i class="fas fa-circle status-online"></i>
                    Serveur connecté
                `;
            }
        } catch (error) {
            console.warn('Serveur non disponible:', error);
        }
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showNotification(message, type = 'info', title = '') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
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

    async setupDatabase() {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/setup`);
            const data = await response.json();

            if (data.success) {
                this.showNotification('Base de données initialisée avec succès', 'success');
            } else {
                this.showNotification(data.error || 'Erreur lors de l\'initialisation', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion au serveur', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadDemoData() {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/demo`);
            const data = await response.json();

            if (data.success) {
                await this.loadAnimals();
                await this.updateStats();
                this.showNotification(`${data.counts.total} animaux de démo chargés`, 'success');
            } else {
                this.showNotification(data.error || 'Erreur lors du chargement des données', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion au serveur', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadAnimals() {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/animals/all`);
            if (!response.ok) throw new Error('Erreur de connexion');

            const data = await response.json();
            if (data.success) {
                this.animals = data.data || [];
                this.updateTabCounts();
                this.displayAnimals();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showNotification('Impossible de charger les animaux', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateTabCounts() {
        const allCount = this.animals.length;
        const catsCount = this.animals.filter(a => a.type === 'cats').length;
        const dogsCount = this.animals.filter(a => a.type === 'dogs').length;
        const mousesCount = this.animals.filter(a => a.type === 'mouses').length;

        document.getElementById('tab-all-count').textContent = allCount;
        document.getElementById('tab-cats-count').textContent = catsCount;
        document.getElementById('tab-dogs-count').textContent = dogsCount;
        document.getElementById('tab-mouses-count').textContent = mousesCount;
    }

    getFilteredAnimals() {
        let filtered = this.animals;

        // Filter by tab
        if (this.currentTab !== 'all') {
            filtered = filtered.filter(animal => animal.type === this.currentTab);
        }

        // Filter by search
        if (this.currentFilter) {
            filtered = filtered.filter(animal =>
                animal.name.toLowerCase().includes(this.currentFilter) ||
                (animal.tag && animal.tag.toLowerCase().includes(this.currentFilter)) ||
                (animal.description && animal.description.toLowerCase().includes(this.currentFilter))
            );
        }

        return filtered;
    }

    displayAnimals() {
        const container = document.getElementById('cards-container');
        const noDataMessage = document.getElementById('no-data-message');
        const paginationElement = document.getElementById('pagination');
        const filteredAnimals = this.getFilteredAnimals();

        // Update pagination
        const totalPages = Math.ceil(filteredAnimals.length / this.itemsPerPage) || 1;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, filteredAnimals.length);
        const paginatedAnimals = filteredAnimals.slice(startIndex, endIndex);

        // Update pagination controls
        const currentPageEl = document.getElementById('current-page');
        const totalPagesEl = document.getElementById('total-pages');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (currentPageEl) currentPageEl.textContent = this.currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage === totalPages;

        if (paginatedAnimals.length === 0) {
            if (noDataMessage) noDataMessage.style.display = 'block';
            if (container) container.innerHTML = '';
            if (paginationElement) paginationElement.style.display = 'none';
            return;
        }

        if (noDataMessage) noDataMessage.style.display = 'none';
        if (paginationElement) paginationElement.style.display = 'flex';

        if (container) {
            container.innerHTML = paginatedAnimals.map(animal => this.createAnimalCard(animal)).join('');
        }

        // Add event listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.card').dataset.id);
                const type = e.target.closest('.card').dataset.type;
                const animal = this.animals.find(a => a.id === id && a.type === type);
                if (animal) this.openModal(animal);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.closest('.card').dataset.id);
                const type = e.target.closest('.card').dataset.type;

                if (confirm('Êtes-vous sûr de vouloir supprimer cet animal ?')) {
                    await this.deleteAnimal(type, id);
                }
            });
        });
    }

    filterAnimals() {
        this.displayAnimals();
    }

    createAnimalCard(animal) {
        const defaultImages = {
            cats: 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba4f?w=600',
            dogs: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w-600',
            mouses: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600'
        };

        const typeNames = {
            cats: { name: 'Chat', badge: 'badge-cat', icon: 'fa-cat' },
            dogs: { name: 'Chien', badge: 'badge-dog', icon: 'fa-dog' },
            mouses: { name: 'Souris', badge: 'badge-mouse', icon: 'fa-mouse' }
        };

        const type = typeNames[animal.type];
        const date = animal.created_at ? new Date(animal.created_at).toLocaleDateString('fr-FR') : '';
        const tags = animal.tag ? animal.tag.split(',').map(t => `<span class="card-tag">${t.trim()}</span>`).join('') : '';

        return `
            <div class="card" data-id="${animal.id}" data-type="${animal.type}">
                <div class="card-header">
                    <div class="card-title">
                        <i class="fas ${type.icon}"></i>
                        ${animal.name}
                    </div>
                    <span class="card-badge ${type.badge}">${type.name}</span>
                </div>
                <div class="card-img-container">
                    <img src="${animal.img || defaultImages[animal.type]}" 
                         alt="${animal.name}" 
                         class="card-img"
                         onerror="this.src='${defaultImages[animal.type]}'">
                </div>
                <div class="card-body">
                    <p class="card-description">${animal.description || 'Aucune description disponible.'}</p>
                    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
                </div>
                <div class="card-footer">
                    <div class="card-date">
                        <i class="far fa-calendar"></i>
                        ${date || `ID: ${animal.id}`}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn btn-edit" title="Modifier">
                            <i class="fas fa-edit"></i>
                            Modifier
                        </button>
                        <button class="action-btn btn-delete" title="Supprimer">
                            <i class="fas fa-trash"></i>
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    openModal(animal = null) {
        const modal = document.getElementById('animal-modal');
        const title = document.getElementById('modal-title');
        const saveBtn = document.getElementById('save-button-text');

        if (animal) {
            title.innerHTML = `<i class="fas fa-edit"></i><span>Modifier ${animal.name}</span>`;
            saveBtn.textContent = 'Mettre à jour';

            document.getElementById('animal-id').value = animal.id;
            document.getElementById('animal-name').value = animal.name;
            document.getElementById('animal-type').value = animal.type;
            document.getElementById('animal-tags').value = animal.tag || '';
            document.getElementById('animal-description').value = animal.description || '';
            document.getElementById('animal-image').value = animal.img || '';

            this.editingAnimal = animal;
        } else {
            title.innerHTML = `<i class="fas fa-plus-circle"></i><span>Ajouter un nouvel animal</span>`;
            saveBtn.textContent = 'Enregistrer';

            document.getElementById('animal-form').reset();
            document.getElementById('animal-id').value = '';
            this.editingAnimal = null;
        }

        this.updateImagePreview(document.getElementById('animal-image').value);
        modal.style.display = 'flex';
    }

    updateImagePreview(url) {
        const preview = document.getElementById('image-preview');

        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            preview.innerHTML = `
                <img src="${url}" 
                     alt="Aperçu" 
                     style="max-width: 100%; max-height: 200px; border-radius: 8px;"
                     onerror="this.parentElement.innerHTML='<div class=\\'preview-placeholder\\'><i class=\\'fas fa-exclamation-triangle\\'></i><span>Image non disponible</span></div>'">
            `;
        } else {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Aperçu de l'image</span>
                </div>
            `;
        }
    }

    closeModal() {
        document.getElementById('animal-modal').style.display = 'none';
        this.editingAnimal = null;
    }

    async saveAnimal() {
        const form = document.getElementById('animal-form');
        const formData = new FormData(form);

        const animalData = {
            name: formData.get('name').trim(),
            tag: formData.get('tags').trim(),
            description: formData.get('description').trim(),
            img: formData.get('image').trim()
        };

        // Validation
        if (!animalData.name) {
            this.showNotification('Le nom est obligatoire', 'error');
            return;
        }

        const type = formData.get('type');
        if (!type) {
            this.showNotification('Le type est obligatoire', 'error');
            return;
        }

        const id = formData.get('id');
        const saveBtn = document.getElementById('save-animal');
        const loadingSpinner = document.getElementById('save-loading');

        saveBtn.disabled = true;
        loadingSpinner.style.display = 'block';

        try {
            const url = id ? `${this.apiBaseUrl}/${type}/${id}` : `${this.apiBaseUrl}/${type}`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(animalData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(
                    id ? 'Animal mis à jour avec succès' : 'Animal ajouté avec succès',
                    'success'
                );
                await this.loadAnimals();
                await this.updateStats();
                this.closeModal();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showNotification(error.message || 'Erreur lors de la sauvegarde', 'error');
        } finally {
            saveBtn.disabled = false;
            loadingSpinner.style.display = 'none';
        }
    }

    async deleteAnimal(type, id) {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/${type}/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Animal supprimé avec succès', 'success');
                await this.loadAnimals();
                await this.updateStats();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showNotification(error.message || 'Erreur lors de la suppression', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async updateStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/stats`);
            if (!response.ok) throw new Error();

            const data = await response.json();

            if (data.success) {
                document.getElementById('cat-count').textContent = data.data.cats || 0;
                document.getElementById('dog-count').textContent = data.data.dogs || 0;
                document.getElementById('mouse-count').textContent = data.data.mouses || 0;
                document.getElementById('total-count').textContent = data.data.total || 0;
            }
        } catch (error) {
            // Fallback to local counts
            const cats = this.animals.filter(a => a.type === 'cats').length;
            const dogs = this.animals.filter(a => a.type === 'dogs').length;
            const mouses = this.animals.filter(a => a.type === 'mouses').length;

            document.getElementById('cat-count').textContent = cats;
            document.getElementById('dog-count').textContent = dogs;
            document.getElementById('mouse-count').textContent = mouses;
            document.getElementById('total-count').textContent = cats + dogs + mouses;
        }
    }

    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            animals: this.animals
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animals-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Données exportées avec succès', 'success');
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.animalApp = new AnimalApp();
});
