// ── Config ────────────────────────────────────────────────────────────────────
var CATEGORIES = {
  CE7: { label: 'Cafe', color: '#d4bb4b' },
  FD6: { label: 'Restaurant', color: '#F4A261' },
  SW8: { label: 'Station', color: '#9B5DE5' },
  CS2: { label: 'Convenience', color: '#2196F3' },
  AC5: { label: 'Study Cafe', color: '#795548' },
  OL7: { label: 'Gas / EV', color: '#FF5722' },
  CT1: { label: 'Entertainment', color: '#E91E63' },
  AD5: { label: 'Accommodation', color: '#607D8B' },
  HP8: { label: 'Hospital', color: '#F44336' },
  MT1: { label: 'Shopping', color: '#009688' }
};

// ── SDK ───────────────────────────────────────────────────────────────────────
function loadKakaoSDK() {
  return new Promise(function (resolve, reject) {
    if (typeof KAKAO_APP_KEY === 'undefined' || KAKAO_APP_KEY === 'YOUR_JAVASCRIPT_APP_KEY_HERE') {
      reject(new Error(
        'config.js가 없거나 앱 키가 설정되지 않았습니다.\n' +
        'config.example.js를 config.js로 복사한 뒤 Kakao JavaScript 앱 키를 입력해주세요.'
      ));
      return;
    }
    var script = document.createElement('script');
    // autoload=false so we can call kakao.maps.load() ourselves after the services library is ready
    script.src =
      '//dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_APP_KEY +
      '&libraries=services&autoload=false';
    script.onerror = function () {
      reject(new Error('Kakao Maps SDK를 불러오지 못했습니다. 키와 허용 도메인을 확인해주세요.'));
    };
    script.onload = function () { kakao.maps.load(resolve); };
    document.head.appendChild(script);
  });
}

// ── State ─────────────────────────────────────────────────────────────────────
var map;
var geocoder;
var markers = [];
var openInfoWindow = null;
var locationCount = 2;
var searchRadius = 2000;
var midpointCopyText = '';
var toastTimer = null;

// ── Markers ───────────────────────────────────────────────────────────────────
function clearMarkers() {
  markers.forEach(function (m) { m.setMap(null); });
  markers = [];
  if (openInfoWindow) {
    openInfoWindow.close();
    openInfoWindow = null;
  }
}

function makeMarker(latLng, title, color) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">' +
    '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z" fill="' + color + '"/>' +
    '<circle cx="12" cy="12" r="5" fill="white"/>' +
    '</svg>';
  var imgSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  var markerImage = new kakao.maps.MarkerImage(
    imgSrc,
    new kakao.maps.Size(24, 36),
    { offset: new kakao.maps.Point(12, 36) }
  );
  var marker = new kakao.maps.Marker({ position: latLng, title: title, image: markerImage });
  marker.setMap(map);
  markers.push(marker);
  return marker;
}

// ── Search ────────────────────────────────────────────────────────────────────
function searchLocation(keyword) {
  var places = new kakao.maps.services.Places();
  return new Promise(function (resolve, reject) {
    places.keywordSearch(keyword, function (results, status) {
      if (status === kakao.maps.services.Status.OK) {
        resolve({
          lat: parseFloat(results[0].y),
          lng: parseFloat(results[0].x),
          name: results[0].place_name || keyword
        });
      } else {
        reject(new Error('"' + keyword + '" 위치를 찾을 수 없습니다. 다시 입력해주세요.'));
      }
    });
  });
}

function searchCategory(code, midLatLng) {
  var places = new kakao.maps.services.Places();
  return new Promise(function (resolve) {
    places.categorySearch(code, function (results, status) {
      if (status === kakao.maps.services.Status.OK) {
        results.forEach(function (r) { r._categoryCode = code; });
        resolve(results);
      } else {
        resolve([]);
      }
    }, { location: midLatLng, radius: searchRadius, sort: kakao.maps.services.SortBy.DISTANCE });
  });
}

function getSelectedCategories() {
  var checked = document.querySelectorAll('.filter-check:checked');
  return Array.prototype.map.call(checked, function (el) { return el.value; });
}

// ── Location inputs ───────────────────────────────────────────────────────────
function renderLocationInputs(n) {
  var container = document.getElementById('location-inputs');
  container.innerHTML = '';
  for (var i = 1; i <= n; i++) {
    var group = document.createElement('div');
    group.className = 'input-group';

    var label = document.createElement('label');
    label.setAttribute('for', 'addr' + i);
    label.textContent = 'Point ' + i;

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'addr' + i;
    input.placeholder = '예: 성균관대역';
    input.autocomplete = 'off';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSearch();
    });

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
function handleSearch() {
  var addrs = [];
  for (var i = 1; i <= locationCount; i++) {
    var val = document.getElementById('addr' + i).value.trim();
    addrs.push(val);
  }
  var btn      = document.getElementById('search-btn');
  var selected = getSelectedCategories();

  if (addrs.some(function (a) { return !a; })) {
    showError('모든 위치를 입력해주세요. (' + locationCount + ' points required)');
    return;
  }
  if (selected.length === 0) { showError('필터를 하나 이상 선택해주세요.'); return; }

  btn.disabled = true;
  btn.textContent = 'Searching…';
  hideError();
  hideResults();
  hideMidpoint();

  Promise.all(addrs.map(searchLocation))
    .then(function (coords) {
      var midLat = coords.reduce(function (s, c) { return s + c.lat; }, 0) / coords.length;
      var midLng = coords.reduce(function (s, c) { return s + c.lng; }, 0) / coords.length;
      var midLatLng = new kakao.maps.LatLng(midLat, midLng);

      clearMarkers();
      map.setCenter(midLatLng);
      map.setLevel(7);
      showMidpoint(midLat, midLng);

      coords.forEach(function (c) {
        makeMarker(new kakao.maps.LatLng(c.lat, c.lng), c.name, '#4361EE');
      });
      makeMarker(midLatLng, '중간 지점', '#5dd639');

      return Promise.all(selected.map(function (code) {
        return searchCategory(code, midLatLng);
      }));
    })
    .then(function (resultsPerCategory) {
      btn.disabled = false;
      btn.textContent = 'Find midpoint';

      var all = [];
      resultsPerCategory.forEach(function (results) { all = all.concat(results); });
      all.sort(function (a, b) { return parseInt(a.distance) - parseInt(b.distance); });

      if (all.length === 0) {
        showError('반경 내에 결과를 찾을 수 없습니다. 다른 위치로 시도해보세요.');
        return;
      }
      renderPlaces(all);
    })
    .catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Find midpoint';
      showError(err.message);
    });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderPlaces(places) {
  var list  = document.getElementById('place-list');
  var count = document.getElementById('results-count');

  list.innerHTML = '';
  count.textContent = '(' + places.length + ')';

  places.forEach(function (place, i) {
    var cat    = CATEGORIES[place._categoryCode];
    var pos    = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
    var marker = makeMarker(pos, place.place_name, cat.color);

    kakao.maps.event.addListener(marker, 'click', function () {
      if (openInfoWindow) openInfoWindow.close();
      openInfoWindow = new kakao.maps.InfoWindow({
        content:
          '<div style="padding:8px 10px;font-size:13px;max-width:220px;line-height:1.5">' +
          '<strong>' + place.place_name + '</strong><br>' +
          (place.road_address_name || place.address_name) + '<br>' +
          '<a href="' + place.place_url + '" target="_blank" rel="noopener" ' +
          'style="color:#4361EE">카카오맵에서 보기 →</a>' +
          '</div>'
      });
      openInfoWindow.open(map, marker);
    });

    var li = document.createElement('li');
    li.className = 'place-item';

    var distText = place.distance
      ? '<span class="place-distance">' + place.distance + 'm from midpoint</span>'
      : '';

    li.innerHTML =
      '<span class="place-num">' + (i + 1) + '</span>' +
      '<div class="place-info">' +
        '<div class="place-name-row">' +
          '<strong class="place-name">' + place.place_name + '</strong>' +
          '<span class="cat-tag" style="background:' + cat.color + '">' + cat.label + '</span>' +
        '</div>' +
        '<span class="place-address">' + (place.road_address_name || place.address_name) + '</span>' +
        distText +
      '</div>' +
      '<a class="place-link" href="' + place.place_url + '" ' +
         'target="_blank" rel="noopener" ' +
         'onclick="event.stopPropagation()">View</a>';

    li.addEventListener('click', function () {
      map.panTo(pos);
      kakao.maps.event.trigger(marker, 'click');
    });

    list.appendChild(li);
  });

  showResults();
}

// ── Midpoint box ──────────────────────────────────────────────────────────────
function showMidpoint(lat, lng) {
  var box     = document.getElementById('midpoint-box');
  var valueEl = document.getElementById('midpoint-value');
  var coordStr = lat.toFixed(6) + ', ' + lng.toFixed(6);

  // show coordinates immediately, then upgrade to address when geocoding returns
  valueEl.textContent = coordStr;
  midpointCopyText = coordStr;
  box.classList.remove('hidden');

  geocoder.coord2Address(lng, lat, function (result, status) {
    if (status === kakao.maps.services.Status.OK && result[0]) {
      var addr = result[0].road_address
        ? result[0].road_address.address_name
        : result[0].address.address_name;
      valueEl.textContent = addr + '  ·  ' + coordStr;
      midpointCopyText = addr + ' (' + coordStr + ')';
    }
  });
}

function hideMidpoint() {
  document.getElementById('midpoint-box').classList.add('hidden');
}

function copyMidpoint() {
  if (!midpointCopyText) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(midpointCopyText).then(showCopiedToast, function () {
      fallbackCopy(midpointCopyText);
      showCopiedToast();
    });
  } else {
    fallbackCopy(midpointCopyText);
    showCopiedToast();
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
}

function showCopiedToast() {
  var toast = document.getElementById('copied-toast');
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2000);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showError(msg) {
  var el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError()   { document.getElementById('error-msg').classList.add('hidden'); }
function showResults() { document.getElementById('results-section').classList.remove('hidden'); }
function hideResults() { document.getElementById('results-section').classList.add('hidden'); }

// ── Init ──────────────────────────────────────────────────────────────────────
loadKakaoSDK()
  .then(function () {
    map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(37.2937156, 126.9743370),
      level: 4
    });
    geocoder = new kakao.maps.services.Geocoder();

    renderLocationInputs(locationCount);

    var slider   = document.getElementById('loc-count');
    var sliderVal = document.getElementById('loc-count-val');
    slider.addEventListener('input', function () {
      locationCount = parseInt(this.value);
      sliderVal.textContent = locationCount;
      renderLocationInputs(locationCount);
    });
    
    var radiusSlider = document.getElementById('radius-km');
    var radiusVal = document.getElementById('radius-km-val');
    radiusSlider.addEventListener('input', function () {
      searchRadius = parseInt(this.value) * 1000;
      radiusVal.textContent = this.value + 'km';
    });

    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('midpoint-box').addEventListener('click', copyMidpoint);
  })
  .catch(function (err) {
    document.body.innerHTML =
      '<div style="max-width:500px;margin:4rem auto;padding:1.5rem;' +
      'font-family:sans-serif;background:#FEE2E2;border-radius:12px;color:#991B1B">' +
      '<strong>앱을 불러올 수 없습니다</strong><br><br>' +
      err.message.replace(/\n/g, '<br>') +
      '</div>';
  });