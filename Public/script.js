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

        // Check if we're on the database page
        if (window.location.pathname.includes('database.html')) {
            await this.loadDatabaseInfo();
        } else {
            await this.loadAnimals();
            await this.updateStats();
            await this.loadTagsForSelect(); // Charger les tags dans le select
        }

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
        document.getElementById('auth-btn').addEventListener('click', () => this.openAuthModal());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('close-auth-modal').addEventListener('click', () => this.closeAuthModal());
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
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

    async loadDatabaseInfo() {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/database`);
            const data = await response.json();

            if (data.success) {
                this.displayDatabaseInfo(data.database);
            } else {
                this.showNotification(data.error || 'Erreur lors du chargement des informations', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion au serveur', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayDatabaseInfo(database) {
        // Update database stats
        document.getElementById('db-name').textContent = database.name;
        document.getElementById('db-tables').textContent = database.stats.total_tables;
        document.getElementById('db-rows').textContent = database.stats.total_rows || 0;
        document.getElementById('db-size').textContent = this.formatBytes(database.stats.total_size || 0);

        // Display tables
        const tablesContainer = document.getElementById('tables-container');
        tablesContainer.innerHTML = '';

        database.tables.forEach(table => {
            const tableCard = document.createElement('div');
            tableCard.className = 'table-card';
            tableCard.innerHTML = `
                <div class="table-header">
                    <h3><i class="fas fa-table"></i> ${table.table_name}</h3>
                    <span class="table-rows">${table.table_rows || 0} rows</span>
                </div>
                <div class="table-info">
                    <div class="info-item">
                        <span class="label">Size:</span>
                        <span class="value">${this.formatBytes((table.data_length || 0) + (table.index_length || 0))}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Created:</span>
                        <span class="value">${table.create_time ? new Date(table.create_time).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Updated:</span>
                        <span class="value">${table.update_time ? new Date(table.update_time).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                <button class="btn btn-primary view-table-btn" data-table="${table.table_name}">
                    <i class="fas fa-eye"></i> View Data
                </button>
            `;
            tablesContainer.appendChild(tableCard);
        });

        // Add event listeners for view buttons
        document.querySelectorAll('.view-table-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tableName = e.target.closest('.view-table-btn').dataset.table;
                this.showTableData(tableName, database.data[tableName]);
            });
        });
    }

    showTableData(tableName, data) {
        const detailsContainer = document.getElementById('table-details');
        const detailsTitle = document.getElementById('table-details-title');

        detailsTitle.textContent = `Table: ${tableName}`;
        detailsContainer.innerHTML = '';

        if (!data || data.length === 0) {
            detailsContainer.innerHTML = '<p class="no-data">No data available</p>';
            return;
        }

        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        Object.keys(data[0]).forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        detailsContainer.appendChild(table);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                        ${this.isLoggedIn ? `
                        <button class="action-btn btn-edit" title="Modifier">
                            <i class="fas fa-edit"></i>
                            Modifier
                        </button>
                        <button class="action-btn btn-delete" title="Supprimer">
                            <i class="fas fa-trash"></i>
                            Supprimer
                        </button>
                        ` : ''}
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

    // ==================== AUTH METHODS ====================

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/me');
            const data = await response.json();
            this.isLoggedIn = data.loggedIn;
            this.userEmail = data.email || '';
            this.updateAuthUI();
        } catch (error) {
            console.error('Error checking login status:', error);
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        const userInfo = document.getElementById('user-info');
        const userEmailDisplay = document.getElementById('user-email-display');

        if (this.isLoggedIn) {
            authBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            if (userEmailDisplay && this.userEmail) {
                userEmailDisplay.textContent = this.userEmail;
            }
        } else {
            authBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
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

    openAuthModal() {
        document.getElementById('auth-modal').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('auth-email').focus();
        }, 100);
    }

    closeAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('auth-form').reset();
    }

    async handleAuth(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();

        if (!email) {
            this.showNotification('Please enter an email', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                this.isLoggedIn = true;
                this.userEmail = email;
                this.updateAuthUI();
                this.closeAuthModal();
                this.showNotification(`Welcome, ${email}! 🎉`, 'success');
            } else {
                this.showNotification(data.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.isLoggedIn = false;
            this.userEmail = '';
            this.updateAuthUI();
            this.showNotification('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.animalApp = new AnimalApp();
});
