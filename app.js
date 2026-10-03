// ===== 1. Inisialisasi peta =====
var map = L.map('map', {preferCanvas:true}).setView([-5.147, 119.432], 12);

// Pane untuk urutan layer (z-index): basemap < WMS < tutupan lahan < jalan/sungai < batas < marker/label
map.createPane('paneWMS').style.zIndex = 250;
map.createPane('panePoly').style.zIndex = 300;
map.createPane('paneLine').style.zIndex = 400;
map.createPane('paneBatas').style.zIndex = 450;

// ===== 2. Basemap =====
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, zIndex: 1,
  attribution: '&copy; <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors'
}).addTo(map);
var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19, zIndex: 1, attribution: 'Tiles &copy; Esri'
});
var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  maxZoom: 19, zIndex: 1, attribution: '&copy; OpenStreetMap, &copy; CARTO'
});

// ===== 3. Popup otomatis dari atribut =====
function popupProps(f, l){
  var h = '<table>';
  for (var k in f.properties) h += '<tr><td><b>'+k+'</b></td><td>&nbsp;'+f.properties[k]+'</td></tr>';
  l.bindPopup(h + '</table>');
}

// ===== 4. Layer data =====
// Administrasi (kelurahan) - warna per kecamatan
var pal = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#008080','#9a6324','#800000','#808000','#000075','#fabebe','#aaffc3'];
var kecList = [...new Set(dataAdmin.features.map(f => f.properties.Kecamatan))].sort();
var kecColor = {}; kecList.forEach((k,i) => kecColor[k] = pal[i % pal.length]);

var lyrAdmin = L.geoJSON(dataAdmin, {
  pane:'paneBatas',
  style:function(f){ return {color:'#222', weight:1, fillColor:kecColor[f.properties.Kecamatan], fillOpacity:0.12}; },
  onEachFeature:function(f,l){
    popupProps(f,l);
    l.bindTooltip(f.properties.Kelurahan + ' (Kec. ' + f.properties.Kecamatan + ')', {sticky:true});
  }
}).addTo(map);

// Tutupan lahan
var warna = {
 'Permukiman dan Tempat Kegiatan':'#f59e0b','Sawah':'#bef264','Tegalan/Ladang':'#d9f99d','Semak Belukar':'#65a30d',
 'Tambak':'#22d3ee','Empang':'#67e8f9','Tanah Kosong/Gundul':'#d6c7a1','Perkebunan/Kebun':'#16a34a',
 'Danau/Situ':'#3b82f6','Padang Rumput':'#a3e635','Pemakaman Umum':'#9ca3af','Pelabuhan Samudera':'#64748b',
 'Pasir/Bukit Pasir Laut':'#fde68a','Dermaga':'#475569','Rawa':'#0d9488','Hutan Bakau/Mangrove':'#047857',
 'Padang Golf':'#4ade80','Pulau':'#86efac','Hutan Rawa/Gambut':'#115e59','Wilayah Bandara':'#a78bfa'
};
var lyrTutupan = L.geoJSON(dataTutupan, {
  pane:'panePoly',
  style:function(f){ return {color:'#555', weight:0.4, fillColor:warna[f.properties.Kelas] || '#ccc', fillOpacity:0.7}; },
  onEachFeature:popupProps
}).addTo(map);

var lyrJalan = L.geoJSON(dataJalan, {pane:'paneLine', style:{color:'#7c2d12', weight:1, fillColor:'#a8a29e', fillOpacity:0.9}, onEachFeature:popupProps}).addTo(map);
var lyrSungai = L.geoJSON(dataSungai, {pane:'paneLine', style:{color:'#1d4ed8', weight:2}, onEachFeature:popupProps}).addTo(map);

// Toponim: nama kecamatan (titik tengah dari batas kelurahan)
var lyrToponim = L.layerGroup();
kecList.forEach(function(k){
  var b = L.latLngBounds([]);
  dataAdmin.features.forEach(function(f){
    if (f.properties.Kecamatan === k) b.extend(L.geoJSON(f).getBounds());
  });
  L.marker(b.getCenter(), {
    interactive:false,
    icon:L.divIcon({className:'', html:'<div class="kec-label">'+k+'</div>', iconSize:[0,0]})
  }).addTo(lyrToponim);
});
lyrToponim.addTo(map);

// ===== 5. Layer WMS (contoh, nonaktif) =====
// Ganti URL & nama layer dengan layanan WMS Anda (mis. GeoServer)
var lyrWMS = L.tileLayer.wms('https://contohserver/geoserver/wms', {
  layers:'nama_layer', format:'image/png', transparent:true, version:'1.1.1', pane:'paneWMS'
});

// ===== 6. Layer control =====
var ctrl = L.control.layers(
  {'OpenStreetMap':osm, 'Esri World Imagery':esri, 'Carto Light':carto},
  {
    'Batas Administrasi (Kelurahan)':lyrAdmin,
    'Tutupan Lahan':lyrTutupan,
    'Jalan':lyrJalan,
    'Sungai':lyrSungai,
    'Toponim (Kecamatan)':lyrToponim,
    'WMS (contoh)':lyrWMS
  }, {collapsed:true}
).addTo(map);
L.control.scale({imperial:false}).addTo(map);

map.fitBounds(lyrAdmin.getBounds());

// ===== 7. Legenda =====
var legend = L.control({position:'bottomright'});
legend.onAdd = function(){
  var d = L.DomUtil.create('div','legend');
  var h = '<b>Tutupan Lahan</b><br>';
  for (var k in warna) h += '<i style="background:'+warna[k]+'"></i>'+k+'<br>';
  h += '<i style="background:#1d4ed8;height:3px"></i>Sungai<br><i style="background:#a8a29e"></i>Jalan<br>';
  d.innerHTML = h;
  L.DomEvent.disableClickPropagation(d);
  return d;
};
legend.addTo(map);

// ===== 8. Koordinat kursor =====
map.on('mousemove', function(e){
  document.getElementById('coord').textContent = 'Lat: ' + e.latlng.lat.toFixed(5) + ' | Lng: ' + e.latlng.lng.toFixed(5);
});

// ===== 9. Upload layer GeoJSON tambahan =====
document.getElementById('upl').addEventListener('change', function(ev){
  var file = ev.target.files[0];
  if (!file) return;
  var r = new FileReader();
  r.onload = function(){
    try {
      var lyr = L.geoJSON(JSON.parse(r.result), {pane:'panePoly', onEachFeature:popupProps,
        style:{color:'#7c3aed', weight:2, fillOpacity:0.3}}).addTo(map);
      ctrl.addOverlay(lyr, 'Upload: ' + file.name);
      map.fitBounds(lyr.getBounds());
    } catch(e){ alert('File bukan GeoJSON yang valid (gunakan EPSG:4326).'); }
  };
  r.readAsText(file);
});
