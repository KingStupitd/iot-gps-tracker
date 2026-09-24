// Koordinat awal (Jakarta) jika belum ada data
const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;
const DEFAULT_ZOOM = 16;

let map;
let marker;
let polyline;
let lastKnownLat = DEFAULT_LAT;
let lastKnownLng = DEFAULT_LNG;

// Inisialisasi Peta Leaflet
function initMap() {
  map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

  // Tile Layer dari OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors | IoT GPS Tracker'
  }).addTo(map);

  // Inisialisasi Marker Pin
  const customIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -34]
  });

  marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { icon: customIcon }).addTo(map);
  marker.bindPopup('<b>Lokasi Perangkat IoT</b><br>Menunggu sinyal GPS...').openPopup();

  // Inisialisasi Polyline untuk lintasan riwayat
  polyline = L.polyline([], {
    color: '#38bdf8',
    weight: 5,
    opacity: 0.8,
    smoothFactor: 1
  }).addTo(map);

  // Isi awal input simulator
  document.getElementById('input-lat').value = DEFAULT_LAT;
  document.getElementById('input-lng').value = DEFAULT_LNG;
}

/**
 * Mengambil data koordinat TERBARU (GET /api/location/latest)
 */
async function fetchLatestLocation() {
  try {
    const res = await fetch('/api/location/latest');
    const result = await res.json();

    if (result.status === 'success' && result.data) {
      const { latitude, longitude, created_at } = result.data;
      const lat = Number(latitude);
      const lng = Number(longitude);

      lastKnownLat = lat;
      lastKnownLng = lng;

      // Update Marker & Map View
      const newLatLng = [lat, lng];
      marker.setLatLng(newLatLng);
      map.panTo(newLatLng);

      const formattedTime = new Date(created_at).toLocaleString('id-ID');
      marker.setPopupContent(`<b>Lokasi Terkini</b><br>Lat: ${lat}<br>Lng: ${lng}<br><small>${formattedTime}</small>`);

      // Update Info Overlay Card UI
      document.getElementById('val-lat').innerText = lat.toFixed(6);
      document.getElementById('val-lng').innerText = lng.toFixed(6);
      document.getElementById('val-time').innerText = formattedTime;
    }
  } catch (err) {
    console.error('Gagal mengambil data terbaru:', err);
  }
}

/**
 * Mengambil RIWAYAT lintasan (GET /api/location/history)
 */
async function fetchLocationHistory() {
  try {
    const res = await fetch('/api/location/history');
    const result = await res.json();

    if (result.status === 'success' && Array.isArray(result.data)) {
      const latLngs = result.data.map(item => [Number(item.latitude), Number(item.longitude)]);
      
      // Update lintasan garis Polyline
      polyline.setLatLngs(latLngs);
      
      // Update Total Titik
      document.getElementById('val-total').innerText = `${result.data.length} titik`;
    }
  } catch (err) {
    console.error('Gagal mengambil riwayat lokasi:', err);
  }
}

/**
 * Mengirim data koordinat lokasi (POST /api/location)
 */
async function sendLocation(latitude, longitude) {
  const statusEl = document.getElementById('status-msg');
  statusEl.className = 'status-msg';
  statusEl.innerText = 'Mengirim data...';

  try {
    const res = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: Number(latitude),
        longitude: Number(longitude)
      })
    });

    const data = await res.json();

    if (data.status === 'success') {
      statusEl.className = 'status-msg status-success';
      statusEl.innerText = `✅ ${data.message}`;
    } else if (data.status === 'ignored') {
      statusEl.className = 'status-msg status-ignored';
      statusEl.innerText = `⚠️ ${data.message}`;
    } else {
      statusEl.className = 'status-msg status-error';
      statusEl.innerText = `❌ ${data.message || 'Gagal mengirim'}`;
    }

    // Segera refresh data setelah mengirim
    fetchLatestLocation();
    fetchLocationHistory();
  } catch (err) {
    statusEl.className = 'status-msg status-error';
    statusEl.innerText = '❌ Gagal terhubung ke server';
    console.error('Error sendLocation:', err);
  }
}

// Handler Form Simulator
document.getElementById('sim-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const lat = document.getElementById('input-lat').value;
  const lng = document.getElementById('input-lng').value;
  sendLocation(lat, lng);
});

// Handler Button Random Step (Gerak Acak +0.0005)
document.getElementById('btn-random-step').addEventListener('click', () => {
  // Geser koordinat sedikit secara acak
  const deltaLat = (Math.random() - 0.3) * 0.001;
  const deltaLng = (Math.random() - 0.3) * 0.001;

  const nextLat = (lastKnownLat + deltaLat).toFixed(6);
  const nextLng = (lastKnownLng + deltaLng).toFixed(6);

  document.getElementById('input-lat').value = nextLat;
  document.getElementById('input-lng').value = nextLng;

  sendLocation(nextLat, nextLng);
});

// Start Application & Setup 3s Polling
window.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Load awal
  fetchLatestLocation();
  fetchLocationHistory();

  // Polling setiap 3 detik (3000ms)
  setInterval(() => {
    fetchLatestLocation();
    fetchLocationHistory();
  }, 3000);
});
