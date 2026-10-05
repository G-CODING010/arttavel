/**/**
 * Project Art Travel - Main Application Logic
 */

const INITIAL_SPOTS = [
    {
        id: "1",
        name: "MOCA Bangkok (Museum of Contemporary Art)",
        type: "Museum",
        lat: 13.8525,
        lng: 100.5627,
        hours: "10:00 - 18:00 (Closed Mon)",
        img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
        desc: "A stunning multi-story museum showcasing modern art and sculptures from master Thai artists."
    },
    {
        id: "2",
        name: "Warehouse 30",
        type: "Art Space",
        lat: 13.7275,
        lng: 100.5135,
        hours: "11:00 - 20:00 Daily",
        img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=600&q=80",
        desc: "Renovated WW2 warehouses in Charoenkrung converted into contemporary art galleries."
    },
    {
        id: "3",
        name: "BACC (Bangkok Art & Culture Centre)",
        type: "Art Space",
        lat: 13.7466,
        lng: 100.5303,
        hours: "10:00 - 20:00 (Closed Mon)",
        img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
        desc: "The central hub for Bangkok's visual arts, featuring rotating contemporary exhibits."
    },
    {
        id: "4",
        name: "ATT 19",
        type: "Gallery",
        lat: 13.7258,
        lng: 100.5152,
        hours: "11:00 - 18:00 (Closed Mon)",
        img: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=600&q=80",
        desc: "A multidisciplinary art gallery housed in a 120-year-old former Chinese school."
    }
];

const CATEGORY_COLORS = {
    'Gallery': '#D4AF37',
    'Art Space': '#FF4A57',
    'Museum': '#7C3AED',
    'Studio': '#10B981'
};

const CATEGORY_ICONS = {
    'Gallery': 'fa-palette',
    'Art Space': 'fa-building-columns',
    'Museum': 'fa-landmark',
    'Studio': 'fa-wand-magic-sparkles'
};

// Global App State
let artSpots = [];
let favorites = [];
let activeCategory = 'all';
let searchQuery = '';
let showFavsOnly = false;
let map = null;
let markersGroup = null;
let spotToDeleteId = null;

// Initializer
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initMap();
    renderPlacesList();
    setupEventListeners();
});

function loadData() {
    const savedSpots = localStorage.getItem('art_travel_spots');
    if (savedSpots) {
        try { 
            artSpots = JSON.parse(savedSpots); 
        } catch (e) { 
            artSpots = [...INITIAL_SPOTS]; 
        }
    } else {
        artSpots = [...INITIAL_SPOTS];
        saveArtSpots();
    }

    const savedFavs = localStorage.getItem('art_favorites');
    if (savedFavs) {
        try { favorites = JSON.parse(savedFavs); } catch(e) { favorites = []; }
    }
}

function saveArtSpots() {
    localStorage.setItem('art_travel_spots', JSON.stringify(artSpots));
}

function initMap() {
    if (typeof L === 'undefined') {
        console.error("Leaflet library failed to load.");
        return;
    }

    map = L.map('map', { zoomControl: false }).setView([13.7350, 100.5250], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersGroup = L.layerGroup().addTo(map);

    renderMarkers();
}

function renderMarkers() {
    if (!map || !markersGroup) return;
    markersGroup.clearLayers();

    const filtered = getFilteredSpots();

    filtered.forEach(spot => {
        const color = CATEGORY_COLORS[spot.type] || '#D4AF37';
        const iconClass = CATEGORY_ICONS[spot.type] || 'fa-location-dot';

        const customIcon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `
                <div class="custom-marker w-9 h-9 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-xl border-2 border-white/20" 
                     style="background: ${color}; color: #0F172A;">
                    <i class="fa-solid ${iconClass} text-xs"></i>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });
        const isFav = favorites.includes(spot.id);

        const popupHTML = `
            <div class="p-0 text-slate-100">
                <div class="relative h-28 w-full overflow-hidden">
                    <img src="${spot.img}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80'">
                    <span class="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-slate-950" style="background: ${color}">
                        ${spot.type}
                    </span>
                    <div class="absolute top-2 right-2 flex gap-1">
                        <button onclick="window.openEditModal('${spot.id}')" title="Edit" class="w-7 h-7 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center text-xs border border-white/10">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="window.promptDeleteSpot('${spot.id}')" title="Delete" class="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs border border-white/10">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                <div class="p-3 space-y-2">
                    <h4 class="font-serif text-sm font-bold text-white leading-snug">${spot.name}</h4>
                    <p class="text-[11px] text-amber-400"><i class="fa-regular fa-clock mr-1"></i> ${spot.hours}</p>
                    <p class="text-xs text-slate-300 line-clamp-2">${spot.desc}</p>
                    <div class="pt-2 flex items-center justify-between border-t border-white/10">
                        <button onclick="window.toggleFavorite('${spot.id}')" class="text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-slate-800 flex items-center gap-1 ${isFav ? 'text-amber-400 border-amber-400/40' : 'text-slate-300'}">
                            <i class="fa-${isFav ? 'solid' : 'regular'} fa-bookmark"></i>
                            <span>${isFav ? 'Saved' : 'Save'}</span>
                        </button>
                        <a href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}" target="_blank" class="text-xs text-art-gold hover:underline flex items-center gap-1">
                            <span>Google Maps</span> <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;

        marker.bindPopup(popupHTML);
        marker.on('click', () => highlightCardInList(spot.id));
        markersGroup.addLayer(marker);
    });
}

function getFilteredSpots() {
    return artSpots.filter(spot => {
        const matchesCategory = activeCategory === 'all' || spot.type === activeCategory;
        const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              spot.desc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFav = !showFavsOnly || favorites.includes(spot.id);
        return matchesCategory && matchesSearch && matchesFav;
    });
}

function renderPlacesList() {
    const listContainer = document.getElementById('placesList');
    if (!listContainer) return;

    const spots = getFilteredSpots();
    
    document.getElementById('spotCount').textContent = `Showing ${spots.length} place${spots.length !== 1 ? 's' : ''}`;
    document.getElementById('favCount').textContent = favorites.length;

    if (spots.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10 px-4 text-slate-500">
                <i class="fa-solid fa-compass text-3xl mb-2 opacity-50"></i>
                <p class="text-sm">No art spots found.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = spots.map(spot => {
        const isFav = favorites.includes(spot.id);
        const color = CATEGORY_COLORS[spot.type] || '#D4AF37';

        return `
            <div id="card-${spot.id}" onclick="window.selectSpot('${spot.id}')" class="glass-card hover:border-art-gold/50 transition-all duration-200 rounded-xl p-3 cursor-pointer group relative">
                <div class="flex gap-3">
                    <img src="${spot.img}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80'">
                    <div class="flex-1 min-w-0 pr-10">
                        <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded text-slate-950 uppercase" style="background: ${color}">${spot.type}</span>
                        <h4 class="text-xs font-semibold text-white group-hover:text-art-gold transition-colors truncate mt-1">${spot.name}</h4>
                        <p class="text-[11px] text-slate-400 truncate mt-0.5">${spot.desc}</p>
                    </div>

                    <div class="absolute top-2 right-2 flex flex-col gap-1">
                        <button onclick="event.stopPropagation(); window.toggleFavorite('${spot.id}')" title="Bookmark" class="text-slate-400 hover:text-amber-400 p-1">
                            <i class="fa-${isFav ? 'solid text-amber-400' : 'regular'} fa-bookmark text-xs"></i>
                        </button>
                        <button onclick="event.stopPropagation(); window.openEditModal('${spot.id}')" title="Edit" class="text-slate-400 hover:text-art-gold p-1">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button onclick="event.stopPropagation(); window.promptDeleteSpot('${spot.id}')" title="Delete" class="text-slate-400 hover:text-red-400 p-1">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function parseCoordinates(inputStr) {
    if (!inputStr) return null;
    const str = inputStr.trim();

    const atMatch = str.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    const directMatch = str.match(/^(-?\d+(?:\.\d+)?)\s*[\s,]\s*(-?\d+(?:\.\d+)?)$/);
    if (directMatch) return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };

    const genericMatches = str.match(/-?\d+\.\d+/g);
    if (genericMatches && genericMatches.length >= 2) {
        return { lat: parseFloat(genericMatches[0]), lng: parseFloat(genericMatches[1]) };
    }

    return null;
}

// Global Window Functions (เพื่อให้ onclick ใน HTML เรียกใช้งานได้ 100%)
window.selectSpot = function(id) {
    const spot = artSpots.find(s => s.id === id);
    if (!spot || !map) return;

    map.flyTo([spot.lat, spot.lng], 15, { duration: 1 });
    highlightCardInList(id);
    
    markersGroup.eachLayer(layer => {
        if (layer.getLatLng().lat === spot.lat && layer.getLatLng().lng === spot.lng) {
            layer.openPopup();
        }
    });
};

window.toggleFavorite = function(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(fId => fId !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('art_favorites', JSON.stringify(favorites));
    renderPlacesList();
    renderMarkers();
};

window.openEditModal = function(id) {
    const spot = artSpots.find(s => s.id === id);
    if (!spot) return;

    document.getElementById('modalTitle').textContent = 'Edit Art Spot';
    document.getElementById('modalSubtitle').textContent = 'Update details for ' + spot.name;
    document.getElementById('spotId').value = spot.id;
    document.getElementById('spotName').value = spot.name;
    document.getElementById('spotType').value = spot.type;
    document.getElementById('spotHours').value = spot.hours;
    document.getElementById('spotLocationInput').value = `${spot.lat}, ${spot.lng}`;
    document.getElementById('locationError').classList.add('hidden');
    document.getElementById('spotImg').value = spot.img;
    document.getElementById('spotDesc').value = spot.desc;
    document.getElementById('spotModal').classList.remove('hidden');
};

window.promptDeleteSpot = function(id) {
    const spot = artSpots.find(s => s.id === id);
    if (!spot) return;
    
    spotToDeleteId = id;
    document.getElementById('deleteSpotName').textContent = `Are you sure you want to remove "${spot.name}"?`;
    document.getElementById('deleteModal').classList.remove('hidden');
};

function highlightCardInList(id) {
    document.querySelectorAll('#placesList > div').forEach(card => {
        card.classList.remove('border-art-gold', 'bg-slate-800/90');
    });
    const activeCard = document.getElementById(`card-${id}`);
    if (activeCard) {
        activeCard.classList.add('border-art-gold', 'bg-slate-800/90');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function setupEventListeners() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => {
                t.classList.remove('active', 'bg-art-gold', 'text-slate-950');
                t.classList.add('bg-slate-800/80', 'text-slate-300');
            });
            tab.classList.add('active', 'bg-art-gold', 'text-slate-950');
            tab.classList.remove('bg-slate-800/80', 'text-slate-300');
            
            activeCategory = tab.dataset.category;
            renderPlacesList();
            renderMarkers();
        });
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderPlacesList();
        renderMarkers();
    });

    const showFavsBtn = document.getElementById('showFavoritesBtn');
    showFavsBtn?.addEventListener('click', () => {
        showFavsOnly = !showFavsOnly;
        showFavsBtn.classList.toggle('font-bold', showFavsOnly);
        renderPlacesList();
        renderMarkers();
    });

    document.getElementById('resetDataBtn')?.addEventListener('click', () => {
        if (confirm("Restore original places dataset?")) {
            artSpots = [...INITIAL_SPOTS];
            favorites = [];
            saveArtSpots();
            localStorage.setItem('art_favorites', JSON.stringify([]));
            renderPlacesList();
            renderMarkers();
            if(map) map.flyTo([13.7350, 100.5250], 13);
        }
    });

    document.getElementById('recenterBtn')?.addEventListener('click', () => {
        if(map) map.flyTo([13.7350, 100.5250], 13);
    });

    document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('-translate-x-full');
    });

    document.getElementById('addSpotBtn')?.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add New Art Spot';
        document.getElementById('modalSubtitle').textContent = 'Contribute a new creative space.';
        document.getElementById('spotForm').reset();
        document.getElementById('spotId').value = '';
        document.getElementById('locationError').classList.add('hidden');
        document.getElementById('spotModal').classList.remove('hidden');
    });

    const closeSpotModal = () => document.getElementById('spotModal').classList.add('hidden');
    document.getElementById('closeModalBtn')?.addEventListener('click', closeSpotModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeSpotModal);

    const closeDeleteModal = () => {
        document.getElementById('deleteModal').classList.add('hidden');
        spotToDeleteId = null;
    };
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
        if (!spotToDeleteId) return;
        artSpots = artSpots.filter(s => s.id !== spotToDeleteId);
        favorites = favorites.filter(fId => fId !== spotToDeleteId);
        localStorage.setItem('art_favorites', JSON.stringify(favorites));
        saveArtSpots();
        renderPlacesList();
        renderMarkers();
        closeDeleteModal();
    });

    document.getElementById('spotForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const locationStr = document.getElementById('spotLocationInput').value;
        const coords = parseCoordinates(locationStr);

        if (!coords) {
            document.getElementById('locationError').classList.remove('hidden');
            return;
        }

        const spotId = document.getElementById('spotId').value;
        const spotData = {
            id: spotId || Date.now().toString(),
            name: document.getElementById('spotName').value,
            type: document.getElementById('spotType').value,
            hours: document.getElementById('spotHours').value || '10:00 - 18:00',
            lat: coords.lat,
            lng: coords.lng,
            img: document.getElementById('spotImg').value || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
            desc: document.getElementById('spotDesc').value || 'New art space entry.'
        };

        if (spotId) {
            const index = artSpots.findIndex(s => s.id === spotId);
            if (index !== -1) artSpots[index] = spotData;
        } else {
            artSpots.unshift(spotData);
        }

        saveArtSpots();
        renderPlacesList();
        renderMarkers();
        closeSpotModal();
        if(map) map.flyTo([spotData.lat, spotData.lng], 15);
    });
}
