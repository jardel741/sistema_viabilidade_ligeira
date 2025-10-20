let ctosVisiveis = false;
let marcadorEndereco = null;
let marcadorCoordenada = null;
let camadaCTOs = null;
let geojsonCobertura;
const consultas = [];

const map = L.map("map").setView([-7.2, -39.3], 13);

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
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}

fetch("/geojson")
  .then(res => res.json())
  .then(data => {
    geojsonCobertura = data;
    const layer = L.geoJSON(data);
    map.fitBounds(layer.getBounds());
  });

document.getElementById("endereco").addEventListener("change", () => {
  const endereco = document.getElementById("endereco").value;
  if (endereco.trim()) {
    fetch(`/geocode?address=${encodeURIComponent(endereco)}`)
      .then(res => res.json())
      .then(dados => {
        const resultado = dados.results?.[0];
        if (resultado) {
          const { lat, lng } = resultado.geometry.location;
          const enderecoCompleto = resultado.formatted_address;

          document.getElementById("endereco").value = enderecoCompleto;
          document.getElementById("endereco").dataset.lat = lat;
          document.getElementById("endereco").dataset.lng = lng;

          if (marcadorEndereco) map.removeLayer(marcadorEndereco);
          marcadorEndereco = L.marker([lat, lng], { icon: iconeAmarelo }).addTo(map);
          marcadorEndereco.bindPopup("Endereço do Google").openPopup();

          map.setView([lat, lng], 17);
          verificarViabilidade(lat, lng);
        } else {
          alert("Endereço não encontrado.");
        }
      });
  }
});

document.getElementById("coordenadas").addEventListener("change", () => {
  const valor = document.getElementById("coordenadas").value;
  const partes = valor.split(",");
  if (partes.length === 2) {
    const lat = parseFloat(partes[0]);
    const lng = parseFloat(partes[1]);

    if (!isNaN(lat) && !isNaN(lng)) {
      if (marcadorCoordenada) map.removeLayer(marcadorCoordenada);
      marcadorCoordenada = L.marker([lat, lng], { icon: iconeVerde }).addTo(map);
      marcadorCoordenada.bindPopup("Coordenada manual").openPopup();

      map.setView([lat, lng], 17);
      verificarViabilidade(lat, lng);
    }
  }
});

function verificarViabilidade(lat, lng) {
  const ponto = turf.point([lng, lat]);
  const dentro = geojsonCobertura.features.some(f =>
    turf.booleanPointInPolygon(ponto, f)
  );

  const msg = dentro
    ? "✅ Está dentro da área de cobertura!"
    : "❌ Fora da área de cobertura.";

  document.getElementById("resultado").innerHTML = msg;
}

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

function usarMinhaLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não é suportada.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    document.getElementById("coordenadas").value = `${lat}, ${lng}`;
    if (marcadorCoordenada) map.removeLayer(marcadorCoordenada);
    marcadorCoordenada = L.marker([lat, lng], { icon: iconeVerde }).addTo(map);
    marcadorCoordenada.bindPopup("Minha localização").openPopup();

    map.setView([lat, lng], 17);
    verificarViabilidade(lat, lng);
  });
}

function novaViabilidade() {
  document.getElementById("bairro").value = "";
  document.getElementById("cidade").value = "";
  document.getElementById("endereco").value = "";
  document.getElementById("coordenadas").value = "";
  document.getElementById("resultado").innerHTML = "";

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
function inicializarAutocomplete() {
  const inputEndereco = document.getElementById("endereco");
  if (!google || !google.maps || !google.maps.places) {
    console.error("Google Places API não carregada corretamente.");
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(inputEndereco);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      alert("Endereço não encontrado.");
      return;
    }

    const { lat, lng } = place.geometry.location;
    const latitude = lat();
    const longitude = lng();
    document.getElementById("coordenadas").value = `${latitude}, ${longitude}`;
    document.getElementById("endereco").dataset.lat = latitude;
    document.getElementById("endereco").dataset.lng = longitude;

    if (marcadorEndereco) {
      map.removeLayer(marcadorEndereco);
    }

    marcadorEndereco = L.marker([latitude, longitude], { icon: iconeAmarelo })
      .addTo(map)
      .bindPopup("Endereço encontrado pelo Google")
      .openPopup();

    map.setView([latitude, longitude], 17);
  });
  // -----------------------------
// Função de régua de medição
// -----------------------------
let reguaAtiva = false;
let pontosRegua = [];
let linhaRegua = null;

const botaoRegua = document.getElementById("botao-regua");

botaoRegua.addEventListener("click", () => {
  reguaAtiva = !reguaAtiva;
  if (reguaAtiva) {
    botaoRegua.innerText = "❌ Sair da régua";
    alert("Modo régua ativado! Clique no mapa para marcar os pontos.");
  } else {
    botaoRegua.innerText = "📏 Medir distância";
    if (linhaRegua) {
      map.removeLayer(linhaRegua);
      linhaRegua = null;
    }
    pontosRegua = [];
  }
});

map.on("click", (e) => {
  if (!reguaAtiva) return;

  pontosRegua.push(e.latlng);

  if (pontosRegua.length > 1) {
    if (linhaRegua) map.removeLayer(linhaRegua);

    linhaRegua = L.polyline(pontosRegua, {
      color: "red",
      weight: 3,
      opacity: 0.8
    }).addTo(map);

    const distancia = calcularDistancia(pontosRegua);
    const texto = distancia >= 1000
      ? `${(distancia / 1000).toFixed(2)} km`
      : `${distancia.toFixed(1)} m`;

    linhaRegua.bindPopup(`Distância total: ${texto}`).openPopup();
  }
});

function calcularDistancia(pontos) {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += pontos[i - 1].distanceTo(pontos[i]);
  }
  return total;
}

}

// Aguarda o carregamento da API do Google Maps antes de iniciar o autocomplete
window.initAutocomplete = inicializarAutocomplete;
