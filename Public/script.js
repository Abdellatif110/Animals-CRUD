class AnimalApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentTab = 'all';
        this.currentFilter = '';
        this.editingAnimal = null;
        this.animals = [];
        this.itemsPerPage = 9;
        this.currentPage = 1;
        this.selectedTagsFromSelect = []; // Tags sélectionnés dans le select
        this.availableTags = []; // Tags disponibles
        this.animalTagsCount = {}; // Compteur d'animaux par tag
        this.isLoggedIn = false;

        this.init();
    }

    async init() {
        this.initEvents();
        this.setActiveNavLink();
        await this.checkLoginStatus();
        await this.checkServerStatus();
        await this.loadAnimals();
        await this.updateStats();
        await this.loadTagsForSelect(); // Charger les tags dans le select
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

        // Adoption modal events removed as per requirements

        document.getElementById('btn-first-demo').addEventListener('click', async () => {
            await this.loadDemoData();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Animal modal events removed as per requirements

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

        // Tags Selector Events
        const tagsSelect = document.getElementById('tags-select');
        if (tagsSelect) {
            tagsSelect.addEventListener('change', (e) => {
                this.handleTagSelection(e);
            });
        }

        const clearSelectorBtn = document.getElementById('clear-tags-selector');
        if (clearSelectorBtn) {
            clearSelectorBtn.addEventListener('click', () => {
                this.clearTagSelector();
            });
        }

        // Auth events
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Modal events
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('save-btn').addEventListener('click', () => this.saveAnimal());
        document.getElementById('animal-image').addEventListener('input', (e) => this.updateImagePreview(e.target.value));

        // Close modal on outside click
        document.getElementById('animal-modal').addEventListener('click', (e) => {
            if (e.target.id === 'animal-modal') {
                this.closeModal();
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
                this.calculateTagCounts(); // Calculer les compteurs de tags
                this.displayAnimals();
                await this.loadTagsForSelect(); // Recharger les tags dans le select
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

    calculateTagCounts() {
        // Réinitialiser les compteurs
        this.animalTagsCount = {};

        this.animals.forEach(animal => {
            if (animal.tag) {
                const tags = animal.tag.split(',').map(t => t.trim()).filter(t => t);
                tags.forEach(tag => {
                    this.animalTagsCount[tag] = (this.animalTagsCount[tag] || 0) + 1;
                });
            }
        });
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

        // Filter by selected tags (from select)
        if (this.selectedTagsFromSelect.length > 0) {
            filtered = filtered.filter(animal => {
                if (!animal.tag) return false;
                
                const animalTags = animal.tag.split(',').map(t => t.trim()).filter(t => t);
                // Vérifier si l'animal a au moins un des tags sélectionnés
                return this.selectedTagsFromSelect.some(selectedTag => 
                    animalTags.some(animalTag => animalTag.toLowerCase() === selectedTag.toLowerCase())
                );
            });
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
        // Handle edit button clicks
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const id = parseInt(button.dataset.id);
                const type = button.dataset.type;
                const animal = this.findAnimalById(id, type);
                if (animal) {
                    this.openModal(animal);
                }
            });
        });

        // Handle delete button clicks
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const id = parseInt(button.dataset.id);
                const type = button.dataset.type;

                if (confirm('Êtes-vous sûr de vouloir supprimer cet animal ?')) {
                    await this.deleteAnimal(type, id);
                }
            });
        });

        // Handle adopt button clicks
        document.querySelectorAll('.btn-adopt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const id = parseInt(button.dataset.id);
                const type = button.dataset.type;
                const animal = this.findAnimalById(id, type);
                if (animal) {
                    this.openAdoptModal(animal);
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

        // Determine which action buttons to show
        let actionButtons = `
            <button class="action-btn btn-adopt" title="Adopter" data-id="${animal.id}" data-type="${animal.type}" data-name="${animal.name}">
                <i class="fas fa-heart"></i>
                Adopter
            </button>
            <button class="action-btn btn-edit" title="Modifier" data-id="${animal.id}" data-type="${animal.type}">
                <i class="fas fa-edit"></i>
                Modifier
            </button>
            <button class="action-btn btn-delete" title="Supprimer" data-id="${animal.id}" data-type="${animal.type}">
                <i class="fas fa-trash"></i>
                Supprimer
            </button>
        `;

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
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== TAGS SELECT SYSTEM ====================

    async loadTagsForSelect() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/tags`);
            if (!response.ok) throw new Error('Erreur de connexion');

            const data = await response.json();
            if (data.success) {
                this.availableTags = data.data || [];
                this.populateTagSelect();
            }
        } catch (error) {
            console.warn('Impossible de charger les tags:', error);
            this.showTagsError();
        }
    }

    populateTagSelect() {
        const select = document.getElementById('tags-select');
        const display = document.getElementById('selected-tags-display');
        
        if (!select) return;
        
        // Vider le select
        select.innerHTML = '';
        
        if (!this.availableTags || this.availableTags.length === 0) {
            select.innerHTML = '<option value="" disabled>Aucun tag disponible</option>';
            if (display) {
                display.innerHTML = '<div class="no-tags-message">Ajoutez des tags à vos animaux</div>';
            }
            return;
        }
        
        // Option par défaut
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Sélectionnez des tags...";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        
        // Trier les tags par nombre d'animaux (descendant)
        const sortedTags = [...this.availableTags].sort((a, b) => {
            const countA = this.animalTagsCount[a] || 0;
            const countB = this.animalTagsCount[b] || 0;
            return countB - countA;
        });
        
        // Ajouter chaque tag
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = `${tag} (${this.animalTagsCount[tag] || 0})`;
            option.dataset.count = this.animalTagsCount[tag] || 0;
            select.appendChild(option);
        });
        
        // Mettre à jour l'affichage des tags sélectionnés
        this.updateSelectedTagsDisplay();
    }

    handleTagSelection(event) {
        const select = event.target;
        const selectedOptions = Array.from(select.selectedOptions)
            .filter(opt => opt.value) // Exclure l'option par défaut
            .map(opt => opt.value);
        
        this.selectedTagsFromSelect = selectedOptions;
        this.updateSelectedTagsDisplay();
        this.currentPage = 1;
        this.displayAnimals();
    }

    updateSelectedTagsDisplay() {
        const display = document.getElementById('selected-tags-display');
        const countSpan = document.getElementById('selected-count');
        
        if (!display || !countSpan) return;
        
        // Mettre à jour le compteur
        countSpan.textContent = `${this.selectedTagsFromSelect.length} tag(s) sélectionné(s)`;
        
        // Afficher les tags sélectionnés
        display.innerHTML = '';
        
        if (this.selectedTagsFromSelect.length === 0) {
            display.innerHTML = '<div class="no-tags-message">Aucun tag sélectionné</div>';
            return;
        }
        
        this.selectedTagsFromSelect.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'selected-tag-item';
            tagElement.innerHTML = `
                ${tag}
                <button class="remove-tag-btn" data-tag="${tag}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            display.appendChild(tagElement);
            
            // Ajouter l'événement pour supprimer le tag
            tagElement.querySelector('.remove-tag-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSelectedTag(tag);
            });
        });
    }

    removeSelectedTag(tag) {
        const index = this.selectedTagsFromSelect.indexOf(tag);
        if (index > -1) {
            this.selectedTagsFromSelect.splice(index, 1);
            this.updateSelectedTagsDisplay();
            
            // Désélectionner dans le select
            const select = document.getElementById('tags-select');
            if (select) {
                const option = Array.from(select.options).find(opt => opt.value === tag);
                if (option) option.selected = false;
            }
            
            this.currentPage = 1;
            this.displayAnimals();
        }
    }

    clearTagSelector() {
        this.selectedTagsFromSelect = [];
        
        // Désélectionner toutes les options
        const select = document.getElementById('tags-select');
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = false;
            });
            
            // Réactiver l'option par défaut
            const defaultOption = select.options[0];
            if (defaultOption) {
                defaultOption.selected = true;
            }
        }
        
        this.updateSelectedTagsDisplay();
        this.currentPage = 1;
        this.displayAnimals();
    }

    showTagsError() {
        const select = document.getElementById('tags-select');
        if (select) {
            select.innerHTML = '<option value="" disabled>Erreur de chargement des tags</option>';
        }
    }

    // ==================== MODAL ====================

    openModal(animal = null) {
        this.editingAnimal = animal;
        const modal = document.getElementById('animal-modal');
        const form = document.getElementById('animal-form');
        const title = document.getElementById('modal-title');

        if (animal) {
            title.textContent = 'Modifier l\'Animal';
            document.getElementById('animal-name').value = animal.name || '';
            document.getElementById('animal-type').value = animal.type || 'cats'; // Default to cats if type is missing
            document.getElementById('animal-type').disabled = true; // Disable type change when editing
            document.getElementById('animal-tags').value = animal.tag || '';
            document.getElementById('animal-description').value = animal.description || '';
            document.getElementById('animal-image').value = animal.img || '';
        } else {
            title.textContent = 'Ajouter un Animal';
            document.getElementById('animal-type').disabled = false;
            form.reset();
        }

        this.updateImagePreview(document.getElementById('animal-image').value);
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    openAdoptModal(animal) {
        // Submit adoption request directly
        this.submitAdoptionRequest(animal);
    }

    async submitAdoptionRequest(animal) {
        if (!this.isLoggedIn) {
            this.showNotification('Veuillez vous connecter pour adopter un animal.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        const confirmation = confirm(`Voulez-vous vraiment envoyer une demande d'adoption pour ${animal.name} ?`);
        if (!confirmation) return;

        try {
            const formData = {
                animalId: animal.id,
                animalType: animal.type,
                adopterName: this.userName || 'Adopter',
                adopterEmail: this.userEmail,
                adopterPhone: '',
                message: `Demande d'adoption pour ${animal.name} (${animal.type} #${animal.id})`
            };

            const response = await fetch('/api/adopt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                this.showNotification('Demande d\'adoption envoyée avec succès !', 'success');
                // Optionally redirect to adopt page to see the request
                setTimeout(() => {
                    window.location.href = 'adopt.html';
                }, 1500);
            } else {
                throw new Error(data.error || 'Erreur lors de l\'envoi.');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    updateImagePreview(url) {
        const preview = document.getElementById('image-preview');
        if (url && url.trim()) {
            preview.innerHTML = `<img src="${url}" alt="Aperçu" onerror="this.parentElement.innerHTML='<div class=\\'preview-placeholder\\'><i class=\\'fas fa-image\\'></i><p>Erreur de chargement</p></div>'">`;
        } else {
            preview.innerHTML = `<div class="preview-placeholder"><i class="fas fa-image"></i><p>Aperçu de l'image</p></div>`;
        }
    }

    closeModal() {
        const modal = document.getElementById('animal-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.editingAnimal = null;
    }

    async saveAnimal() {
        const form = document.getElementById('animal-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // For editing, ensure type is set from the editing animal
        if (this.editingAnimal) {
            data.type = this.editingAnimal.type;
        }

        // Validate required fields
        if (!data.name || !data.type) {
            this.showNotification('Nom et type sont requis', 'error');
            return;
        }

        this.showLoading();
        try {
            const url = this.editingAnimal 
                ? `${this.apiBaseUrl}/${this.editingAnimal.type}/${this.editingAnimal.id}`
                : `${this.apiBaseUrl}/${data.type}`;
            const method = this.editingAnimal ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    this.editingAnimal ? 'Animal modifié avec succès' : 'Animal ajouté avec succès',
                    'success'
                );
                this.closeModal();
                await this.loadAnimals();
                await this.updateStats();
                await this.loadTagsForSelect();
            } else {
                throw new Error(result.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Save animal error:', error);
            this.showNotification(error.message || 'Erreur lors de la sauvegarde', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Helper function to find animal by ID and type
    findAnimalById(id, type) {
        return this.animals.find(animal => animal.id == id && animal.type === type);
    }

    async deleteAnimal(type, id) {
        // Validate inputs
        if (!type || !['cats', 'dogs', 'mouses'].includes(type)) {
            this.showNotification('Type d\'animal invalide', 'error');
            return;
        }
        
        if (!id || isNaN(id) || id <= 0) {
            this.showNotification('ID d\'animal invalide', 'error');
            return;
        }

        // Show confirmation dialog
        const animal = this.findAnimalById(id, type);
        const animalName = animal ? animal.name : `ID ${id}`;
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${animalName}" ? Cette action est irréversible.`)) {
            return;
        }

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
                await this.loadTagsForSelect();
            } else {
                throw new Error(data.error || 'Erreur inconnue lors de la suppression');
            }
        } catch (error) {
            console.error('Delete animal error:', error);
            this.showNotification(error.message || 'Erreur lors de la suppression. Veuillez vérifier votre connexion.', 'error');
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

    // ==================== AUTH METHODS ====================

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/me');
            if (!response.ok) {
                console.warn('Auth check failed: HTTP', response.status);
                this.isLoggedIn = false;
                this.updateAuthUI();
                return;
            }
            const data = await response.json();
            this.isLoggedIn = data.loggedIn;
            if (data.loggedIn) {
                this.userEmail = data.email;
                this.userName = data.name;
            }
            this.updateAuthUI();
        } catch (error) {
            console.error('Error checking login status:', error);
            this.isLoggedIn = false;
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        const logoutBtn = document.getElementById('logout-btn');
        if (this.isLoggedIn) {
            logoutBtn.classList.remove('hidden');
        } else {
            logoutBtn.classList.add('hidden');
        }
        // Re-render cards to show/hide buttons
        this.displayAnimals();
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        if (currentPath === '/' || currentPath.includes('index.html')) {
            document.querySelector('a[href="index.html"]').classList.add('active');
        } else if (currentPath.includes('about.html')) {
            document.querySelector('a[href="about.html"]').classList.add('active');
        } else if (currentPath.includes('contact.html')) {
            document.querySelector('a[href="contact.html"]').classList.add('active');
        }
    }

    // Login and signup modals removed as authentication is handled by login.html

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.isLoggedIn = false;
            this.updateAuthUI();
            this.showNotification('Déconnexion réussie', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.animalApp = new AnimalApp();
});
