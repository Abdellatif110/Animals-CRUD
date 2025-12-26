document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('adopt-cards-container');

    let animals = [];
    let userInfo = {};

    const loadAndRender = async () => {
        await Promise.all([
            loadAnimals(),
            checkUser()
        ]);
        renderAnimals();
        handleUrlParams();
    };

    const checkUser = async () => {
        try {
            const response = await fetch('/api/me');
            if (!response.ok) {
                console.warn('Auth check failed: HTTP', response.status);
                window.location.href = 'login.html';
                return;
            }
            const data = await response.json();
            if (data.loggedIn) {
                userInfo = data;
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error checking user status:', error);
            window.location.href = 'login.html';
        }
    };

    const loadAnimals = async () => {
        try {
            const response = await fetch('/api/animals/all');
            const data = await response.json();
            if (data.success) {
                animals = data.data;
            } else {
                throw new Error(data.error || 'Could not load animals');
            }
        } catch (error) {
            console.error('Failed to load animals:', error);
            showErrorState();
        }
    };

    const createAdoptAnimalCard = (animal) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.dataset.id = animal.id;
        div.dataset.type = animal.type;

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

        const typeInfo = typeNames[animal.type];
        const tags = animal.tag ? animal.tag.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('') : '';

        div.innerHTML = `
            <div class="card-header">
                <div class="card-title-group">
                    <div class="card-title">
                        <i class="fas ${typeInfo.icon}"></i>
                        ${animal.name}
                    </div>
                    <span class="card-id">#${animal.id}</span>
                </div>
                <span class="card-badge ${typeInfo.badge}">${typeInfo.name}</span>
            </div>
            <div class="card-img-container">
                <img src="${animal.img || defaultImages[animal.type]}" class="card-img" onerror="this.src='${defaultImages[animal.type]}'">
            </div>
            <div class="card-body">
                <p class="card-description">${animal.description || 'Aucune description disponible.'}</p>
                ${tags ? `<div class="card-tags">${tags}</div>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary btn-adopt" data-id="${animal.id}" data-type="${animal.type}" data-name="${animal.name}">
                    <i class="fas fa-heart"></i> Adopter
                </button>
            </div>
        `;

        div.querySelector('.btn-adopt').addEventListener('click', handleAdoption);

        return div;
    };

    const renderAnimals = () => {
        cardsContainer.innerHTML = '';
        if (animals.length === 0) {
            showEmptyState();
            return;
        }
        animals.forEach(animal => {
            const card = createAdoptAnimalCard(animal);
            cardsContainer.appendChild(card);
        });
    };

    const handleAdoption = async (event) => {
        const button = event.currentTarget;
        const { id, type, name } = button.dataset;

        const confirmation = confirm(`Voulez-vous vraiment envoyer une demande d'adoption pour ${name} ?`);
        if (!confirmation) return;

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

        const formData = {
            animalId: id,
            animalType: type,
            adopterName: userInfo.name || 'Anonymous Adopter',
            adopterEmail: userInfo.email,
            adopterPhone: userInfo.phone || '',
            message: `Demande d'adoption pour ${name} (${type} #${id})`
        };

        try {
            const response = await fetch('/api/adopt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                alert('Demande envoyée avec succès !');
                button.innerHTML = '<i class="fas fa-check"></i> Envoyée';
                button.classList.add('btn-success');
            } else {
                throw new Error(data.error || 'Erreur lors de l\'envoi.');
            }
        } catch (error) {
            alert('Erreur: ' + error.message);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-heart"></i> Adopter';
        }
    };

    const showEmptyState = () => {
        cardsContainer.innerHTML = `
            <div class="no-requests" style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(255,255,255,0.5); border-radius: 24px; backdrop-filter: blur(10px);">
                <i class="fas fa-paw" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px; display: block;"></i>
                <h2 style="color: #475569;">Aucun animal disponible</h2>
                <p style="color: #64748b;">Il n'y a actuellement aucun animal disponible à l'adoption.</p>
            </div>
        `;
    };

    const showErrorState = () => {
        cardsContainer.innerHTML = `
            <div class="no-requests error" style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(255,229,229,0.6); border-radius: 24px; backdrop-filter: blur(10px);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #b91c1c; margin-bottom: 20px; display: block;"></i>
                <h2 style="color: #991b1b;">Erreur de chargement</h2>
                <p style="color: #b91c1c;">Impossible de charger les animaux. Veuillez réessayer plus tard.</p>
            </div>
        `;
    };

    const handleUrlParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const animalId = urlParams.get('id');
        const animalType = urlParams.get('type');
        const animalName = urlParams.get('name');

        if (animalId && animalType) {
            // Find and highlight the specific animal card
            const animalCard = document.querySelector(`.card[data-id="${animalId}"][data-type="${animalType}"]`);
            if (animalCard) {
                animalCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                animalCard.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                animalCard.style.border = '2px solid #3b82f6';
                // Remove highlight after 5 seconds
                setTimeout(() => {
                    animalCard.style.boxShadow = '';
                    animalCard.style.border = '';
                }, 5000);
            }
        }
    };

    loadAndRender();
});