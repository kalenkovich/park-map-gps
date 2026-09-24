import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- DOM ---
const mapDiv = document.getElementById('map') as HTMLDivElement;

// --- Leaflet ---
const leafletMap = L.map(mapDiv).setView([31.7767, 35.2345], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(leafletMap);