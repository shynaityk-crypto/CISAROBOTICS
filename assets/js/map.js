// Leaflet map initialization - safe to run on any page
document.addEventListener('DOMContentLoaded', function () {
  // Ensure the map container exists
  var mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Default center (San Francisco) — change to your preferred coordinates
  var defaultCenter = [37.7749, -122.4194];
  var defaultZoom = 12;

  // Initialize map
  var map = L.map('map').setView(defaultCenter, defaultZoom);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Example marker — remove or change as needed
  var marker = L.marker(defaultCenter).addTo(map);
  marker.bindPopup('<strong>CISAROBOTICS</strong><br>Example location.').openPopup();

  // Resize handling to ensure map renders correctly inside responsive layouts
  window.addEventListener('resize', function () {
    map.invalidateSize();
  });
});
