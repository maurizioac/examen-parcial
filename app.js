let allEvents = [];
const EVENTS_DATA_PATH = './data/events.json';
const IMAGE_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="%23dddddd" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="20">Sin imagen</text></svg>';
const eventsGrid = document.getElementById('events-grid');
const noResultsMessage = document.getElementById('no-results-message');
const catalogView = document.getElementById('catalog-view');
const detailView = document.getElementById('detail-view');

const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

async function initApp() {
    try {
        const response = await fetch(EVENTS_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Error al cargar los datos: ${response.statusText}`);
        }
        allEvents = await response.json();
        
        window.addEventListener('hashchange', handleRouting);
        searchInput.addEventListener('input', updateStateAndRender);
        categorySelect.addEventListener('change', updateStateAndRender);
        sortSelect.addEventListener('change', updateStateAndRender);
        clearFiltersBtn.addEventListener('click', clearFilters);
        handleRouting(); 
    } catch (error) {
        eventsGrid.innerHTML = '<p style="color: red;">Error al cargar los eventos. Revise la consola.</p>';
        console.error("Error al iniciar la aplicación:", error);
    }
}

// Mostrar precios tal como están en los datos pero con prefijo en soles peruanos (S/)
function formatPricePEN(amount) {
    if (amount == null) return 'S/ 0.00';
    return `S/ ${Number(amount).toFixed(2)}`;
}

function updateStateAndRender() {
    const params = getFiltersFromControls();
    updateUrlState(params);
}

function handleRouting() {
    const hash = window.location.hash.slice(1);
    
    if (hash.startsWith('/event/')) {
        const eventId = hash.replace('/event/', '');
        renderEventDetail(eventId);
    } else {
        const eventsToShow = applyFiltersAndSort();
        renderControls(getUniqueCategories());
        renderCatalog(eventsToShow);
    }
}

function applyFiltersAndSort() {
    const params = getFiltersFromUrl();
    let filteredEvents = allEvents;
    
    if (params.query) {
        const query = params.query.toLowerCase();
        filteredEvents = filteredEvents.filter(event => 
            event.title.toLowerCase().includes(query) ||
            event.city.toLowerCase().includes(query) ||
            event.artists.some(artist => artist.toLowerCase().includes(query))
        );
    }

    if (params.category) {
        filteredEvents = filteredEvents.filter(event => 
            event.category.toLowerCase() === params.category.toLowerCase()
        );
    }

    switch (params.sort) {
        case 'price_asc':
            filteredEvents.sort((a, b) => a.priceFrom - b.priceFrom);
            break;
        case 'date_desc':
            filteredEvents.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            break;
        case 'date_asc':
            filteredEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            break;
        case 'popularity_desc':
            filteredEvents.sort((a, b) => b.popularity - a.popularity);
            break;
    }
    
    return filteredEvents;
}

function getFiltersFromUrl() {
    const hash = window.location.hash.slice(1);
    const searchParams = new URLSearchParams(hash.split('?')[1]);
    const params = {};
    for (const [key, value] of searchParams) {
        params[key] = value;
    }
    return params;
}

function getFiltersFromControls() {
    const params = {};
    if (searchInput.value) {
        params.query = searchInput.value.trim();
    }
    if (categorySelect.value) {
        params.category = categorySelect.value;
    }
    if (sortSelect.value) {
        params.sort = sortSelect.value;
    }
    return params;
}

function updateUrlState(params) {
    const baseUrl = '#/catalog';
    const searchParams = new URLSearchParams();
    for (const key in params) {
        if (params[key]) {
            searchParams.set(key, params[key]);
        }
    }
    window.location.hash = baseUrl + (searchParams.toString() ? '?' + searchParams.toString() : '');
}

function getUniqueCategories() {
    const categories = new Set(allEvents.map(event => event.category));
    return [...categories];
}

function renderControls(categories) {
    const currentParams = getFiltersFromUrl();

    
    searchInput.value = currentParams.query || '';
    categorySelect.value = currentParams.category || '';
    sortSelect.value = currentParams.sort || 'date_asc'; // Valor por defecto

    if (categorySelect.options.length <= 1) { 
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categorySelect.appendChild(option);
        });
    }
}

function clearFilters() {
    searchInput.value = '';
    categorySelect.value = '';
    sortSelect.value = 'date_asc';
    updateUrlState({});
}

function renderCatalog(eventsToRender) {
    catalogView.style.display = 'block';
    detailView.style.display = 'none';

    if (eventsToRender.length === 0) {
        eventsGrid.innerHTML = '';
        noResultsMessage.style.display = 'block';
        return;
    }

    noResultsMessage.style.display = 'none';

    const cardsHtml = eventsToRender.map(event => {
        // Asegurar que exista una imagen, si no usar placeholder
        const firstImage = (event.images && event.images.length > 0) ? event.images[0] : IMAGE_PLACEHOLDER;
        const correctImagePath = (typeof firstImage === 'string' && firstImage.startsWith('/'))
                               ? firstImage.slice(1)
                               : firstImage;

        return `
            <article class="event-card" onclick="window.location.hash = '#/event/${event.id}'">
                <img src="${correctImagePath}" alt="Portada de ${event.title}" loading="lazy">
                <div class="card-content">
                    <p class="category">${event.category.toUpperCase()}</p>
                    <h3>${event.title}</h3>
                    <!--<p class="location">${event.venue} - ${event.city}</p>-->
                    <p class="date">${new Date(event.datetime).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p class="price">Desde ${formatPricePEN(event.priceFrom)}</p>
                    ${event.soldOut ? '<span class="sold-out-tag">AGOTADO</span>' : ''}
                    <a href="#/event/${event.id}" class="cta-button">Ver detalle</a>
                </div>
            </article>
        `;
    }).join('');
    
    eventsGrid.innerHTML = cardsHtml;
}

function renderEventDetail(id) {
    catalogView.style.display = 'none';
    detailView.style.display = 'block';
    detailView.innerHTML = '<p>Cargando detalles...</p>'; 

    const event = allEvents.find(e => e.id === id);

    if (!event) {
        detailView.innerHTML = `
            <h2>Evento no encontrado</h2>
            <p>El ID de evento ${id} no existe.</p>
            <a href="#/catalog" class="cta-button">Volver al Catálogo</a>
        `;
        return;
    }

    const imageGallery = (event.images && event.images.length > 0)
        ? event.images.map(img => {
            const correctImagePath = (typeof img === 'string' && img.startsWith('/')) ? img.slice(1) : img;
            return `<img src="${correctImagePath}" alt="${event.title}" class="gallery-image" loading="lazy">`;
        }).join('')
        : `<img src="${IMAGE_PLACEHOLDER}" alt="Sin imagen" class="gallery-image">`;

    detailView.innerHTML = `
        <section class="event-detail-container">
            <a href="#/catalog" class="back-link">← Volver al Catálogo</a>
            
            <div class="detail-header">
                <h1>${event.title}</h1>
                <p class="category-tag">${event.category.toUpperCase()}</p>
            </div>
            
            <div class="detail-gallery">${imageGallery}</div>
            
            <div class="detail-content">
                <div class="main-info">
                    <h2>Descripción</h2>
                    <p>${event.description}</p>
                    
                    <h3>Artistas / Line-up</h3>
                    <ul>${event.artists.map(a => `<li>${a}</li>`).join('')}</ul>
                    
                    <div class="venue-info">
                        <h3>Lugar</h3>
                        <p>Estadio Nacional, Lima, Perú</p>
                    </div>
                </div>

                <aside class="sidebar-info">
                    <div class="price-box">
                        <p class="price-label">Precio Desde:</p>
                        <p class="price-value">${formatPricePEN(event.priceFrom)}</p>
                    </div>

                    <div class="date-time">
                        <p><strong>Fecha y Hora:</strong> ${new Date(event.datetime).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                    </div>

                    <div class="policies">
                        <h3>Políticas</h3>
                        <p><strong>Edad:</strong> ${event.policies.age}</p>
                        <p><strong>Reembolso:</strong> ${event.policies.refund}</p>
                        <p><strong>Cupos disponibles:</strong> ${event.stock > 0 ? event.stock : 'AGOTADO'}</p>
                    </div>
                    
                    <div class="actions">
                        ${event.soldOut 
                            ? '<button class="action-btn sold-out" disabled>AGOTADO</button>'
                            : `
                                <div class="add-to-cart-control">
                                    <input type="number" id="quantity-input" value="1" min="1" max="${event.stock}">
                                    <button class="action-btn primary" data-event-id="${event.id}">Añadir al Carrito</button>
                                </div>
                            `
                        }
                        <button class="action-btn secondary">★ Favorito</button>
                        <button class="action-btn tertiary" onclick="navigator.clipboard.writeText(window.location.href); alert('URL copiada!');">Compartir</button>
                    </div>
                </aside>
            </div>
        </section>
    `;
}

initApp();