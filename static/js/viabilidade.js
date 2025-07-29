let ctosVisiveis = false;
let marcadorEndereco = null;
let marcadorCoordenada = null;
let camadaCTOs = null;
let geojsonCobertura = null;
const consultas = [];

const map = L.map("map").setView([-7.2, -39.3], 13);

const iconeAmarelo = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconeVerde = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
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

function usarMinhaLocalizacao() {
  if (!navigator.geolocation) {
    alert("Geolocalização não suportada pelo navegador.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById("coordenadas").value = `${latitude}, ${longitude}`;
    adicionarMarcadorCoordenada(latitude, longitude);
    await verificarViabilidade();
  }, err => {
    alert("Erro ao obter localização.");
    console.error(err);
  });
}

function adicionarMarcadorEndereco(lat, lng) {
  if (marcadorEndereco) map.removeLayer(marcadorEndereco);
  marcadorEndereco = L.marker([lat, lng], { icon: iconeAmarelo }).addTo(map);
  document.getElementById("endereco").dataset.lat = lat;
  document.getElementById("endereco").dataset.lng = lng;
}

function adicionarMarcadorCoordenada(lat, lng) {
  if (marcadorCoordenada) map.removeLayer(marcadorCoordenada);
  marcadorCoordenada = L.marker([lat, lng], { icon: iconeVerde }).addTo(map);
  map.setView([lat, lng], 17);
}

document.getElementById("endereco").addEventListener("blur", async () => {
  const endereco = document.getElementById("endereco").value;
  if (!endereco) return;

  const cidade = document.getElementById("cidade").value;
  const bairro = document.getElementById("bairro").value;

  const fullAddress = `${endereco}, ${bairro}, ${cidade}`;
  const res = await fetch(`/geocode?address=${encodeURIComponent(fullAddress)}`);
  const data = await res.json();

  const location = data.results?.[0]?.geometry?.location;
  if (!location) {
    document.getElementById("resultado").innerHTML = "❌ Endereço não encontrado.";
    return;
  }

  adicionarMarcadorEndereco(location.lat, location.lng);
  await verificarViabilidade();
});

document.getElementById("coordenadas").addEventListener("blur", async () => {
  const coords = document.getElementById("coordenadas").value.trim();
  if (!coords.includes(",")) return;

  const [latStr, lngStr] = coords.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    document.getElementById("resultado").innerHTML = "❌ Coordenadas inválidas.";
    return;
  }

  adicionarMarcadorCoordenada(lat, lng);
  await verificarViabilidade();
});

async function verificarViabilidade() {
  if (!geojsonCobertura) return;

  const resultado = document.getElementById("resultado");
  resultado.innerHTML = "";

  const lat1 = parseFloat(document.getElementById("endereco").dataset.lat);
  const lng1 = parseFloat(document.getElementById("endereco").dataset.lng);
  const coords = document.getElementById("coordenadas").value.trim();
  const [lat2, lng2] = coords.includes(",") ? coords.split(",").map(Number) : [null, null];

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    resultado.innerHTML = "❌ Informe endereço e coordenada para obter o diagnóstico.";
    return;
  }

  const ptEndereco = turf.point([lng1, lat1]);
  const ptCoordenada = turf.point([lng2, lat2]);
  const poly = turf.multiPolygon(geojsonCobertura.features.map(f => f.geometry.coordinates));

  const dentroEndereco = turf.booleanPointInPolygon(ptEndereco, poly);
  const dentroCoordenada = turf.booleanPointInPolygon(ptCoordenada, poly);

  const distancia = turf.distance(ptEndereco, ptCoordenada, { units: "meters" });

  let mensagem = "";
  if (dentroEndereco && dentroCoordenada && distancia <= 50) {
    mensagem = "✅ Endereço e coordenada estão na área de cobertura e coincidem.";
  } else if (dentroEndereco && dentroCoordenada) {
    mensagem = "⚠️ Ambos estão na área de cobertura, mas distantes entre si.";
  } else if (dentroEndereco || dentroCoordenada) {
    mensagem = "⚠️ Apenas um dos pontos está na área de cobertura.";
  } else {
    mensagem = "❌ Nenhum dos pontos está na área de cobertura.";
  }

  resultado.innerHTML = mensagem;
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
          const marker = L.marker([lat, lng])
            .bindPopup(`<b>CTO:</b> ${cto.nome || "Sem nome"}`);
          camadaCTOs.addLayer(marker);
        }
      });
      camadaCTOs.addTo(map);
      ctosVisiveis = true;
      btn.innerText = "📡 Esconder CTOs";
    });
}

function novaViabilidade() {
  ["bairro", "cidade", "endereco", "coordenadas"].forEach(id => {
    document.getElementById(id).value = "";
  });

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
