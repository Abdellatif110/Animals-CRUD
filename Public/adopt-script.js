document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('adopt-cards-container');

    let adoptionRequests = [];
    let userInfo = {};

    const loadAndRender = async () => {
        await Promise.all([
            loadAdoptionRequests(),
            checkUser()
        ]);
        renderAdoptionRequests();
    };

    const checkUser = async () => {
        try {
            const response = await fetch('/api/me');
            if (!response.ok) {
                console.warn('Auth check failed: HTTP', response.status);
                userInfo = {};
                return;
            }
            const data = await response.json();
            if (data.loggedIn) {
                userInfo = data;
            } else {
                // Do not redirect, allow viewing the page
                userInfo = {};
            }
        } catch (error) {
            console.error('Error checking user status:', error);
            // Do not redirect on error
            userInfo = {};
        }
    };

    const loadAdoptionRequests = async () => {
        try {
            const response = await fetch('/api/adopt/all-requests');
            if (!response.ok) {
                console.warn('Failed to load adoption requests: HTTP', response.status);
                showErrorState();
                return;
            }
            const data = await response.json();
            if (data.success) {
                adoptionRequests = data.data;
            } else {
                throw new Error(data.error || 'Could not load adoption requests');
            }
        } catch (error) {
            console.error('Failed to load adoption requests:', error);
            showErrorState();
        }
    };

    const renderAdoptionRequests = () => {
        cardsContainer.innerHTML = '';
        if (adoptionRequests.length === 0) {
            showEmptyState();
            updateAdoptionRequestCount();
            return;
        }
        adoptionRequests.forEach(request => {
            const card = createAdoptionRequestCard(request);
            cardsContainer.appendChild(card);
        });
        updateAdoptionRequestCount();
    };
    const updateAdoptionRequestCount = () => {
        const countElement = document.getElementById('animal-count');
        if (countElement) {
            countElement.textContent = adoptionRequests.length;
        }
    };
    const createAdoptionRequestCard = (request) => {
        const div = document.createElement('div');
        div.className = 'card';

        const defaultImages = {
            cats: 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba4f?w=600',
            dogs: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
            mouses: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600'
        };

        const typeNames = {
            cats: { name: 'Chat', badge: 'badge-cat', icon: 'fa-cat' },
            dogs: { name: 'Chien', badge: 'badge-dog', icon: 'fa-dog' },
            mouses: { name: 'Souris', badge: 'badge-mouse', icon: 'fa-mouse' }
        };

        const typeInfo = typeNames[request.animal_type];
        const tags = request.tag ? request.tag.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('') : '';
        const createdDate = new Date(request.created_at).toLocaleDateString('fr-FR');

        div.innerHTML = `
            <div class="card-header">
                <div class="card-title-group">
                    <div class="card-title">
                        <i class="fas ${typeInfo.icon}"></i>
                        ${request.name}
                    </div>
                    <span class="card-id">#${request.animal_id}</span>
                </div>
                <span class="card-badge ${typeInfo.badge}">${typeInfo.name}</span>
            </div>
            <div class="card-img-container">
                <img src="${request.img || defaultImages[request.animal_type]}" class="card-img" onerror="this.src='${defaultImages[request.animal_type]}'">
            </div>
            <div class="card-body">
                <p class="card-description">${request.description || 'Aucune description disponible.'}</p>
                ${tags ? `<div class="card-tags">${tags}</div>` : ''}
                <div class="adoption-info" style="margin-top: 10px; padding: 10px; background: rgba(67, 97, 238, 0.1); border-radius: 8px;">
                    <div style="font-weight: bold; color: var(--primary); margin-bottom: 5px;">
                        <i class="fas fa-user"></i> ${request.adopter_name}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        <i class="fas fa-envelope"></i> ${request.user_email}
                    </div>
                    ${request.adopter_phone ? `<div style="font-size: 0.9rem; color: var(--text-secondary);"><i class="fas fa-phone"></i> ${request.adopter_phone}</div>` : ''}
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">
                        <i class="fas fa-calendar"></i> ${createdDate}
                    </div>
                </div>
                ${request.message ? `<div class="adoption-message" style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px; font-style: italic;">"${request.message}"</div>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-danger btn-remove" data-id="${request.id}" title="Supprimer cette demande">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        `;

        // Add event listener for remove button
        const removeBtn = div.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => removeAdoptionRequest(request.id));

        return div;
    };

    const showEmptyState = () => {
        cardsContainer.innerHTML = `
            <div class="no-requests" style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(255,255,255,0.5); border-radius: 24px; backdrop-filter: blur(10px);">
                <i class="fas fa-heart" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px; display: block;"></i>
                <h2 style="color: #475569;">Aucune demande d'adoption</h2>
                <p style="color: #64748b;">Il n'y a actuellement aucune demande d'adoption.</p>
            </div>
        `;
    };

    const showErrorState = () => {
        cardsContainer.innerHTML = `
            <div class="no-requests error" style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(255,229,229,0.6); border-radius: 24px; backdrop-filter: blur(10px);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #b91c1c; margin-bottom: 20px; display: block;"></i>
                <h2 style="color: #991b1b;">Erreur de chargement</h2>
                <p style="color: #b91c1c;">Impossible de charger les demandes d'adoption. Veuillez réessayer plus tard.</p>
            </div>
        `;
    };

    const removeAdoptionRequest = async (requestId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'adoption ?')) {
            return;
        }

        try {
            const response = await fetch(`/api/adopt/${requestId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                console.warn('Failed to delete adoption request: HTTP', response.status);
                showNotification('Erreur lors de la suppression', 'error');
                return;
            }

            const data = await response.json();
            if (data.success) {
                // Remove the request from the array
                adoptionRequests = adoptionRequests.filter(req => req.id !== requestId);
                // Re-render the cards
                renderAdoptionRequests();
                updateAdoptionRequestCount();
                showNotification('Demande d\'adoption supprimée avec succès', 'success');
            } else {
                showNotification(data.error || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Error deleting adoption request:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    };

    loadAndRender();
});
