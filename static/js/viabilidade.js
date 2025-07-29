
document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([-7.2, -39.3], 13);
  try {
    L.gridLayer.googleMutant({ maxZoom: 24, type: "satellite" }).addTo(map);
  } catch (error) {
    console.warn("Erro ao carregar GoogleMutant. Revertendo para OSM.");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  }

  fetch("/geojson")
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data).addTo(map);
      map.fitBounds(layer.getBounds());
    });

  window.novaViabilidade = () => {
    document.getElementById("bairro").value = "";
    document.getElementById("cidade").value = "";
    document.getElementById("endereco").value = "";
    document.getElementById("coordenadas").value = "";
    document.getElementById("resultado").innerHTML = "";
    map.setView([-7.2, -39.3], 13);
  };

  window.usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) return alert("Geolocalização não suportada");
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const marker = L.marker([latitude, longitude]).addTo(map);
      map.setView([latitude, longitude], 17);
    }, () => alert("Erro ao obter localização"));
  };

  window.alternarCTOs = () => {
    const btn = document.getElementById("botao-ctos");
    if (window.camadasCtos) {
      map.removeLayer(window.camadasCtos);
      window.camadasCtos = null;
      btn.innerText = "📡 Ver CTOs";
    } else {
      fetch("/ctos")
        .then(res => res.json())
        .then(data => {
          const camada = L.layerGroup();
          Object.values(data).forEach(cto => {
            const lat = parseFloat(cto.latitude);
            const lng = parseFloat(cto.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng]).bindPopup(`<b>CTO:</b> ${cto.nome || "Sem nome"}`);
              camada.addLayer(marker);
            }
          });
          camada.addTo(map);
          window.camadasCtos = camada;
          btn.innerText = "📡 Esconder CTOs";
        });
    }
  };

  window.mostrarRelatorio = () => {
    document.getElementById("tabelaRelatorio").innerHTML = "<p>Função de relatório ainda será implementada.</p>";
  };
});
