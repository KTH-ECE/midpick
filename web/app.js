// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Dynamically load the Kakao Maps SDK so the app key stays in config.js
// (which is gitignored) rather than being hard-coded in index.html.

function loadKakaoSDK() {
  return new Promise(function (resolve, reject) {
    // Guard: make sure config.js was loaded and has a real key
    if (typeof KAKAO_APP_KEY === 'undefined' || KAKAO_APP_KEY === 'YOUR_JAVASCRIPT_APP_KEY_HERE') {
      reject(new Error(
        'config.js가 없거나 앱 키가 설정되지 않았습니다.\n' +
        'config.example.js를 config.js로 복사한 뒤 Kakao JavaScript 앱 키를 입력해주세요.'
      ));
      return;
    }

    var script = document.createElement('script');
    // autoload=false lets us call kakao.maps.load() ourselves, so we know
    // exactly when everything (including the services library) is ready.
    script.src =
      '//dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_APP_KEY +
      '&libraries=services&autoload=false';
    script.onerror = function () {
      reject(new Error('Kakao Maps SDK를 불러오지 못했습니다. 키와 허용 도메인을 확인해주세요.'));
    };
    script.onload = function () {
      // kakao.maps.load defers execution until the map engine is fully ready
      kakao.maps.load(resolve);
    };
    document.head.appendChild(script);
  });
}

// ── Module-level state ─────────────────────────────────────────────────────────
var map;           // kakao.maps.Map instance
var markers = [];  // all live markers; cleared on each new search
var openInfoWindow = null;

// ── Marker helpers ─────────────────────────────────────────────────────────────
function clearMarkers() {
  markers.forEach(function (m) { m.setMap(null); });
  markers = [];
  if (openInfoWindow) {
    openInfoWindow.close();
    openInfoWindow = null;
  }
}

// Build a pin marker with a given fill colour.
// Kakao's default marker is always red, so we use a tiny SVG data-URI
// to distinguish "your locations" (blue) from the midpoint (red) from cafes (green).
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

// ── Geocoding ─────────────────────────────────────────────────────────────────
// keywordSearch handles place names like "강남역" or "홍익대학교", not just
// formal street addresses.  It returns { lat, lng } of the top result.
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

// ── Search handler ─────────────────────────────────────────────────────────────
function handleSearch() {
  var addr1 = document.getElementById('addr1').value.trim();
  var addr2 = document.getElementById('addr2').value.trim();
  var btn    = document.getElementById('search-btn');

  if (!addr1 || !addr2) {
    showError('두 위치를 모두 입력해주세요.');
    return;
  }

  btn.disabled = true;
  btn.textContent = '찾는 중…';
  hideError();
  hideResults();

  // Geocode both locations in parallel, then find midpoint and search cafes
  Promise.all([searchLocation(addr1), searchLocation(addr2)])
    .then(function (coords) {
      var c1 = coords[0];
      var c2 = coords[1];

      var midLat = (c1.lat + c2.lat) / 2;
      var midLng = (c1.lng + c2.lng) / 2;
      var midLatLng = new kakao.maps.LatLng(midLat, midLng);

      clearMarkers();

      // Zoom / pan map to midpoint
      map.setCenter(midLatLng);
      map.setLevel(6); // roughly 2 km view

      // Pin the two input locations in blue, midpoint in red
      makeMarker(new kakao.maps.LatLng(c1.lat, c1.lng), c1.name, '#4361EE');
      makeMarker(new kakao.maps.LatLng(c2.lat, c2.lng), c2.name, '#4361EE');
      makeMarker(midLatLng, '중간 지점', '#E63946');

      // Search for cafes (category CE7) within 1 km of the midpoint,
      // sorted by distance so the closest appear first.
      var places = new kakao.maps.services.Places();
      places.categorySearch('CE7', function (results, status) {
        btn.disabled = false;
        btn.textContent = '중간 지점 찾기';

        if (status === kakao.maps.services.Status.OK) {
          renderCafes(results);
        } else {
          showError('반경 1km 내에 카페를 찾을 수 없습니다. 다른 위치로 시도해보세요.');
        }
      }, {
        location: midLatLng,
        radius: 1000,
        sort: kakao.maps.services.SortBy.DISTANCE
      });
    })
    .catch(function (err) {
      btn.disabled = false;
      btn.textContent = '중간 지점 찾기';
      showError(err.message);
    });
}

// ── Render results ─────────────────────────────────────────────────────────────
function renderCafes(cafes) {
  var list  = document.getElementById('cafe-list');
  var count = document.getElementById('results-count');

  list.innerHTML = '';
  count.textContent = '(' + cafes.length + '곳)';

  cafes.forEach(function (cafe, i) {
    var pos    = new kakao.maps.LatLng(parseFloat(cafe.y), parseFloat(cafe.x));
    var marker = makeMarker(pos, cafe.place_name, '#43AA8B');

    // Clicking a marker opens a small info bubble on the map
    kakao.maps.event.addListener(marker, 'click', function () {
      if (openInfoWindow) openInfoWindow.close();
      openInfoWindow = new kakao.maps.InfoWindow({
        content:
          '<div style="padding:8px 10px;font-size:13px;max-width:220px;line-height:1.5">' +
          '<strong>' + cafe.place_name + '</strong><br>' +
          (cafe.road_address_name || cafe.address_name) + '<br>' +
          '<a href="' + cafe.place_url + '" target="_blank" rel="noopener" ' +
          'style="color:#4361EE">카카오맵에서 보기 →</a>' +
          '</div>'
      });
      openInfoWindow.open(map, marker);
    });

    // Build result card
    var li = document.createElement('li');
    li.className = 'cafe-item';

    var distText = cafe.distance
      ? '<span class="cafe-distance">중간 지점에서 ' + cafe.distance + 'm</span>'
      : '';

    li.innerHTML =
      '<span class="cafe-num">' + (i + 1) + '</span>' +
      '<div class="cafe-info">' +
        '<strong class="cafe-name">' + cafe.place_name + '</strong>' +
        '<span class="cafe-address">' + (cafe.road_address_name || cafe.address_name) + '</span>' +
        distText +
      '</div>' +
      '<a class="cafe-link" href="' + cafe.place_url + '" ' +
         'target="_blank" rel="noopener" ' +
         'onclick="event.stopPropagation()">보기</a>';

    // Clicking the card pans the map to the cafe and opens its info window
    li.addEventListener('click', function () {
      map.panTo(pos);
      kakao.maps.event.trigger(marker, 'click');
    });

    list.appendChild(li);
  });

  showResults();
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
function showError(msg) {
  var el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

function showResults() {
  document.getElementById('results-section').classList.remove('hidden');
}

function hideResults() {
  document.getElementById('results-section').classList.add('hidden');
}

// ── Init ───────────────────────────────────────────────────────────────────────
loadKakaoSDK()
  .then(function () {
    // Default center: central Seoul
    map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 8
    });

    var btn = document.getElementById('search-btn');
    btn.addEventListener('click', handleSearch);

    // Let the user press Enter in either input to trigger the search
    ['addr1', 'addr2'].forEach(function (id) {
      document.getElementById(id).addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSearch();
      });
    });
  })
  .catch(function (err) {
    document.body.innerHTML =
      '<div style="max-width:500px;margin:4rem auto;padding:1.5rem;' +
      'font-family:sans-serif;background:#FEE2E2;border-radius:12px;color:#991B1B">' +
      '<strong>앱을 불러올 수 없습니다</strong><br><br>' +
      err.message.replace(/\n/g, '<br>') +
      '</div>';
  });

