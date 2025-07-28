
let ctosVisiveis = false;
const map = L.map("map").setView([-7.2, -39.3], 13);
let marcadorEndereco = null;
let marcadorCoordenada = null;
let camadaCTOs = null;
let geojsonCobertura;
const consultas = [];

const iconeAmarelo = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const iconeVerde = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

try {
  const googleMutantLayer = L.gridLayer.googleMutant({
    maxZoom: 24,
    type: "satellite"
  });
  googleMutantLayer.addTo(map);
} catch (error) {
  console.warn("Erro ao carregar GoogleMutant. Revertendo para OSM.", error);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}

fetch("/geojson")
  .then(res => res.json())
  .then(data => {
    geojsonCobertura = data;
    const layer = L.geoJSON(data);
    map.fitBounds(layer.getBounds());
  });

function alternarCTOs() {
  const btn = document.getElementById("botao-ctos");

  if (camadaCTOs) {
    map.removeLayer(camadaCTOs);
    camadaCTOs = null;
    ctosVisiveis = false;
    btn.innerText = "📡 Ver CTOs";
    return;
  }

  fetch("/ctos")
    .then(res => res.json())
    .then(ctos => {
      camadaCTOs = L.layerGroup();
      Object.values(ctos).forEach(cto => {
        const lat = parseFloat(cto.latitude);
        const lng = parseFloat(cto.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.marker([lat, lng]).bindPopup(`<b>CTO:</b> ${cto.nome || "Sem nome"}`);
          camadaCTOs.addLayer(marker);
        }
      });
      camadaCTOs.addTo(map);
      ctosVisiveis = true;
      btn.innerText = "📡 Esconder CTOs";
    });
}

function novaViabilidade() {
  document.getElementById("bairro").value = "";
  document.getElementById("cidade").value = "";
  document.getElementById("endereco").value = "";
  document.getElementById("coordenadas").value = "";
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("endereco").dataset.lat = "";
  document.getElementById("endereco").dataset.lng = "";

  if (marcadorEndereco) {
    map.removeLayer(marcadorEndereco);
    marcadorEndereco = null;
  }
  if (marcadorCoordenada) {
    map.removeLayer(marcadorCoordenada);
    marcadorCoordenada = null;
  }
  if (camadaCTOs) {
    map.removeLayer(camadaCTOs);
    camadaCTOs = null;
    document.getElementById("botao-ctos").innerText = "📡 Ver CTOs";
    ctosVisiveis = false;
  }

  map.setView([-7.2, -39.3], 13);
}

function usarMinhaLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não é suportada pelo seu navegador.");
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (marcadorCoordenada) {
      map.removeLayer(marcadorCoordenada);
    }

    marcadorCoordenada = L.marker([lat, lng], { icon: iconeVerde })
      .addTo(map)
      .bindPopup("Sua localização")
      .openPopup();

    map.setView([lat, lng], 17);
    document.getElementById("coordenadas").value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, () => {
    alert("Não foi possível obter sua localização.");
  });
}

window.initAutocomplete = () => {
  const enderecoInput = document.getElementById("endereco");
  const autocomplete = new google.maps.places.Autocomplete(enderecoInput);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    if (marcadorEndereco) {
      map.removeLayer(marcadorEndereco);
    }

    marcadorEndereco = L.marker([lat, lng], { icon: iconeAmarelo })
      .addTo(map)
      .bindPopup("Endereço selecionado")
      .openPopup();

    map.setView([lat, lng], 17);

    enderecoInput.dataset.lat = lat;
    enderecoInput.dataset.lng = lng;
    document.getElementById("coordenadas").value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  });
};

window.onload = () => {
  if (typeof google !== 'undefined') {
    initAutocomplete();
  } else {
    console.warn("Google Maps API não carregada.");
  }
};
