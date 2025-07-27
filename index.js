// Variáveis globais
let map;
let baseMaps = {};
let overlayMaps = {};
let currentBasemap = 'osm';
let layerControl;
let drawControl; // variável global para controle de desenho
let drawControlAdded = false; // flag para verificar se o controle está ativo
let miniMapControl = null;
let scaleControl = null;
let customRect = null;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeSidebar();
    initializeControls();
    initializeEventListeners();
    showToast('WebMap GIS carregado com sucesso!', 'success');
});

// Inicialização do mapa
function initializeMap() {
    // Criar o mapa
    map = L.map('map', {
        center: [-14.2921, -54.8219],
        zoom: 4,
        zoomControl: false,
        attributionControl: false
    });


// Criar uma feature group para armazenar as camadas desenhadas
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Criar o controle de desenho, mas NÃO adicioná-lo ainda ao mapa
    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });

    // Eventos de desenho
    map.on(L.Draw.Event.CREATED, function (e) {
        drawnItems.addLayer(e.layer);
    });


// Evento do botão "Medir Distância"
document.getElementById('measureTool').addEventListener('click', function () {
    const isActive = this.classList.contains('active');

    // Desmarca todos os botões
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

    if (isActive) {
        map.removeControl(drawControl);
        drawControlAdded = false;
        showToast('Ferramenta de medida desativada', 'info');
    } else {
        drawControl.addTo(map);
        drawControlAdded = true;
        this.classList.add('active');
        showToast('Ferramenta de medida ativada', 'success');
    }
});
    
// Iniciar minimapa e escala
toggleMiniMap(document.getElementById('minimapTool'));

document.getElementById('minimapTool').addEventListener('click', function () {
    toggleMiniMap(this);
});

toggleScaleLine(document.getElementById('scaleTool'));

document.getElementById('scaleTool').addEventListener('click', function () {
    toggleScaleLine(this);
});

// Camadas base
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });


    // Armazenar camadas base
    baseMaps = {
        'osm': osmLayer,
        'google-hybrid': googleHybrid,
        'google-streets': googleStreets,
        'google-satellite': googleSatellite,
        'google-terrain': googleTerrain,
    };

    // Adicionar camada base padrão
    osmLayer.addTo(map);

    // Camadas WMS
    const municipioLayer = L.tileLayer.wms("http://146.235.46.117:8080/geoserver/aula/wms", {
        layers: "aula:municipio",
        transparent: true,
        format: "image/png",
        opacity: 1
    });

    const baciaLayer = L.tileLayer.wms("http://146.235.46.117:8080/geoserver/aula/wms", {
        layers: "aula:bacia",
        transparent: true,
        format: "image/png",
        opacity: 1
    });

    const ufLayer = L.tileLayer.wms("http://146.235.46.117:8080/geoserver/aula/wms", {
        layers: "aula:uf",
        transparent: true,
        format: "image/png",
        opacity: 1
    });

    const biomasLayer = L.tileLayer.wms("http://146.235.46.117:8080/geoserver/aula/wms", {
        layers: "aula:biomas",
        transparent: true,
        format: "image/png",
        opacity: 1
    });

    // Armazenar overlays
    overlayMaps = {
        'municipios': municipioLayer,
        'bacias': baciaLayer,
        'uf': ufLayer,
        'biomas':biomasLayer

    };

    // Eventos do mapa
    map.on('click', onMapClick);
    map.on('mousemove', updateCoordinates);
    map.on('zoomend', updateZoomLevel);

    // Geocoder
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function(e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]);
        map.fitBounds(poly.getBounds());
        showToast(`Localização encontrada: ${e.geocode.name}`, 'success');
    });

    // Atualizar zoom inicial
    updateZoomLevel();
}

// Inicialização do sidebar
function initializeSidebar() {
    // Toggle de seções
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            content.classList.toggle('collapsed');
            icon.classList.toggle('rotated');
        });
    });

    // Headers de seção também podem expandir/colapsar
    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const toggle = this.querySelector('.section-toggle');
            if (toggle) {
                toggle.click();
            }
        });
    });

    // Controles de opacidade
    const opacityButtons = document.querySelectorAll('.opacity-btn');
    opacityButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const targetId = this.getAttribute('data-target');
            const control = document.getElementById(targetId);
            control.classList.toggle('active');
        });
    });

    // Sliders de opacidade
    const opacitySliders = document.querySelectorAll('.opacity-slider');
    opacitySliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const layerName = this.getAttribute('data-layer');
            const opacity = parseFloat(this.value);
            const valueSpan = this.parentElement.querySelector('.opacity-value');
            
            valueSpan.textContent = Math.round(opacity * 100) + '%';
            
            if (overlayMaps[layerName] && map.hasLayer(overlayMaps[layerName])) {
                overlayMaps[layerName].setOpacity(opacity);
            }
        });
    });
}

// Inicialização dos controles
function initializeControls() {
    // Controles de camadas base
    const basemapRadios = document.querySelectorAll('input[name="basemap"]');
    basemapRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                changeBasemap(this.value);
            }
        });
    });

    // Controles de overlays
    const overlayCheckboxes = document.querySelectorAll('#overlays input[type="checkbox"]');
    overlayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            toggleOverlay(this.value, this.checked);
        });
    });

    // Botões de download
    const downloadButtons = document.querySelectorAll('.download-btn');
    downloadButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const layerName = this.getAttribute('data-layer');
            downloadLayer(layerName);
        });
    });

    // Ferramentas
document.getElementById('searchTool').addEventListener('click', function () {
    toggleSearchTool(this);
});

document.getElementById('fullscreenTool').addEventListener('click', function () {
    const button = this;
    const isActive = button.classList.contains('active');

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            button.classList.add('active');
            showToast('Modo tela cheia ativado', 'success');
        });
    } else {
        document.exitFullscreen().then(() => {
            button.classList.remove('active');
            showToast('Modo tela cheia desativado', 'info');
        });
    }
});

}

// Inicialização dos event listeners
function initializeEventListeners() {
    // Botões de Zoom
    document.getElementById('zoomInBtn').addEventListener('click', function () {
        if (map) map.zoomIn();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', function () {
        if (map) map.zoomOut();
    });

    // Toggle do sidebar (mobile)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
    });

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Redimensionamento da janela
    window.addEventListener('resize', function() {
        if (map) {
            map.invalidateSize();
        }
        
        // Fechar sidebar em desktop
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
}

//Botão de ativar minimapa
function toggleMiniMap(button) {
    const isActive = button.classList.contains('active');

    if (isActive && miniMapControl) {
        map.removeControl(miniMapControl);
        miniMapControl = null;

        // Remover retângulo
        customRect = null;

        // Remover evento
        map.off("moveend", updateCustomRect);
        map.off("zoomend", updateCustomRect);

        button.classList.remove('active');
        showToast('MiniMapa desativado', 'info');
    } else {
        const miniMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
        miniMapControl = new L.Control.MiniMap(miniMapLayer, {
            toggleDisplay: false,
            minimized: false,
            position: 'bottomright',
            zoomLevelOffset: -5,
            aimingRectOptions: {
                color: "transparent",
                weight: 0,
                opacity: 0
            }
        }).addTo(map);

        button.classList.add('active');
        showToast('MiniMapa ativado', 'success');

        // Adicionar retângulo envolvente
        map.on("moveend zoomend", updateCustomRect);
        updateCustomRect();
    }
}

function updateCustomRect() {
    if (!miniMapControl || !miniMapControl._miniMap) return;

    const center = map.getCenter();
    const bounds = map.getBounds();

    // Diferença entre extremos de latitude e longitude
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = bounds.getEast() - bounds.getWest();

    // Determina o maior dos dois para garantir um quadrado
    const scaleFactor = 0.5; // quanto menor, menor o quadrado (ex: 0.3 = 30% do tamanho atual)
    const maxSpan = (Math.max(latSpan, lngSpan) * scaleFactor) / 2;

    // Cria um quadrado centrado na visualização atual
    const squareBounds = L.latLngBounds(
        [center.lat - maxSpan, center.lng - maxSpan],
        [center.lat + maxSpan, center.lng + maxSpan]
    );

    if (customRect) {
        customRect.setBounds(squareBounds);
    } else {
        customRect = L.rectangle(squareBounds, {
            color: "#ff7800",
            weight: 1,
            fillOpacity: 0,
            interactive: false
        }).addTo(miniMapControl._miniMap);
    }
}



//Botão de ativar escala
function toggleScaleLine(button) {
    const isActive = button.classList.contains('active');

    if (isActive && scaleControl) {
        map.removeControl(scaleControl);
        scaleControl = null;
        button.classList.remove('active');
        showToast('Escala desativada', 'info');
    } else {
        scaleControl = L.control.scale({
            position: 'bottomleft',
            imperial: false,
            maxWidth: 150,
            metric: true,
            updateWhenIdle: true
        }).addTo(map);

        button.classList.add('active');
        showToast('Escala ativada', 'success');
    }
}


// Funções do mapa
function onMapClick(e) {
    const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`
            <div style="text-align: center;">
                <strong>Coordenadas</strong><br>
                Latitude: ${e.latlng.lat.toFixed(6)}<br>
                Longitude: ${e.latlng.lng.toFixed(6)}
            </div>
        `)
        .openOn(map);
}

function updateCoordinates(e) {
    const coordsElement = document.getElementById('coordinates');
    if (coordsElement) {
        coordsElement.textContent = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
    }
}

function updateZoomLevel() {
    const zoomElement = document.getElementById('zoomLevel');
    if (zoomElement) {
        zoomElement.textContent = `Zoom: ${map.getZoom()}`;
    }
}

// Funções de controle de camadas
function changeBasemap(basemapId) {
    // Remover camada base atual
    if (baseMaps[currentBasemap]) {
        map.removeLayer(baseMaps[currentBasemap]);
    }
    
    // Adicionar nova camada base
    if (baseMaps[basemapId]) {
        baseMaps[basemapId].addTo(map);
        currentBasemap = basemapId;
        showToast(`Camada base alterada para ${getBasemapName(basemapId)}`, 'success');
    }
}

//function toggleOverlay(overlayId, enabled) {
//    const layer = overlayMaps[overlayId];
//    if (!layer) return;

//    if (enabled) {
//        showLoading();
//        layer.addTo(map);
//        showToast(`Camada ${getOverlayName(overlayId)} ativada`, 'success');
//        hideLoading();
//    } else {
//        map.removeLayer(layer);
//        showToast(`Camada ${getOverlayName(overlayId)} desativada`, 'success');
//    }
//}


function toggleOverlay(overlayId, enabled) {
    const layer = overlayMaps[overlayId];
    if (!layer) return;

// Mostrar ou esconder legenda dos biomas
    if (overlayId === 'biomas') {
    const legendBox = document.getElementById('legendBox');
    if (legendBox) legendBox.style.display = enabled ? 'block' : 'none';
    }

    if (enabled) {
        showLoading();
        layer.addTo(map);
        showToast(`Camada ${getOverlayName(overlayId)} ativada`, 'success');
        hideLoading();

    } else {
        map.removeLayer(layer);
        showToast(`Camada ${getOverlayName(overlayId)} desativada`, 'success');
    }
}



function downloadLayer(layerName) {
    const urls = {
        'municipio': 'http://146.235.46.117:8080/geoserver/aula/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aula:municipio&outputFormat=SHAPE-ZIP',
        'bacia': 'http://146.235.46.117:8080/geoserver/aula/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aula:bacia&outputFormat=SHAPE-ZIP',
        'uf': 'http://146.235.46.117:8080/geoserver/aula/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aula:uf&outputFormat=SHAPE-ZIP',
        'biomas':'http://146.235.46.117:8080/geoserver/aula/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=aula:biomas&outputFormat=SHAPE-ZIP'

    };

    if (urls[layerName]) {
        window.open(urls[layerName], '_blank');
        showToast(`Download da camada ${getOverlayName(layerName)} iniciado`, 'success');
    }
}

// Funções de ferramentas
function toggleTool(button, toolType) {
    // Remover estado ativo de todos os botões
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ativar ferramenta
    button.classList.add('active');

    switch (toolType) {
        case 'search':
            activateSearchTool();
            break;
        case 'measure':
            activateMeasureTool();
            break;
    }
}

function toggleSearchTool(button) {
    // Remover estado ativo de todos os botões
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (map._geocoder) {
        map.removeControl(map._geocoder);
        map._geocoder = null;
        showToast('Ferramenta de busca desativada', 'info');
    } else {
        map._geocoder = L.Control.geocoder({
            defaultMarkGeocode: false
        }).on('markgeocode', function(e) {
            const bbox = e.geocode.bbox;
            const poly = L.polygon([
                bbox.getSouthEast(),
                bbox.getNorthEast(),
                bbox.getNorthWest(),
                bbox.getSouthWest()
            ]);
            map.fitBounds(poly.getBounds());
            showToast(`Localização encontrada: ${e.geocode.name}`, 'success');
        }).addTo(map);

        button.classList.add('active');
        showToast('Ferramenta de busca ativada', 'success');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            showToast('Modo tela cheia ativado', 'success');
        });
    } else {
        document.exitFullscreen().then(() => {
            showToast('Modo tela cheia desativado', 'success');
        });
    }
}

// Funções utilitárias
function getBasemapName(id) {
    const names = {
        'osm': 'OpenStreetMap',
        'google-hybrid': 'Google Hybrid',
        'google-streets': 'Google Streets',
        'google-satellite': 'Google Satellite',
        'google-terrain': 'Google Terrain',
    };
    return names[id] || id;
}

function getOverlayName(id) {
    const names = {
        'municipios': 'Municípios',
        'bacias': 'Bacias Hidrográficas',
        'uf': 'Unidades Federativas',
        'biomas': 'Biomas Brasileiros'

    };
    return names[id] || id;
}

// Funções de UI
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remover toast após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Monitoramento de conexão
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (navigator.onLine) {
        statusElement.textContent = 'Conectado';
        statusElement.style.color = '#10b981';
    } else {
        statusElement.textContent = 'Desconectado';
        statusElement.style.color = '#ef4444';
    }
}

// Event listeners para conexão
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Inicializar status de conexão
updateConnectionStatus();


