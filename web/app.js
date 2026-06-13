// ── Config ────────────────────────────────────────────────────────────────────
// Short labels (used on map markers / result tags); full names live in I18N.filt_*
var CATEGORIES = {
  CE7: { en: 'Cafe',          ko: '카페',        color: '#d4bb4b' },
  FD6: { en: 'Restaurant',    ko: '음식점',      color: '#F4A261' },
  SW8: { en: 'Station',       ko: '지하철역',    color: '#9B5DE5' },
  CS2: { en: 'Convenience',   ko: '편의점',      color: '#2196F3' },
  AC5: { en: 'Study Cafe',    ko: '스터디카페',  color: '#795548' },
  OL7: { en: 'Gas / EV',      ko: '주유·충전',   color: '#FF5722' },
  CT1: { en: 'Entertainment', ko: '문화시설',    color: '#E91E63' },
  AD5: { en: 'Accommodation', ko: '숙박',        color: '#607D8B' },
  HP8: { en: 'Hospital',      ko: '병원',        color: '#F44336' },
  MT1: { en: 'Shopping',      ko: '쇼핑',        color: '#009688' }
};

// ── i18n ──────────────────────────────────────────────────────────────────────
var currentLang = 'en';

var I18N = {
  en: {
    subtitle: 'Find the midpoint between you and your friends.',
    locations: 'Locations',
    radius: 'Search radius',
    filter: 'Filter',
    nearby: 'Nearby',
    copyHint: 'Click to copy',
    copied: 'Copied!',
    view: 'View',
    viewKakao: 'View on KakaoMap →',
    find: 'Find midpoint',
    searching: 'Searching…',
    midpoint: 'Midpoint',
    point: 'Point',
    placeholder: 'e.g. Sungkyunkwan Univ. Station',
    errSelectFilter: 'Please select at least one filter.',
    errNoResults: 'No results found within the radius. Try different locations.',
    filt_CE7: 'Cafe',
    filt_FD6: 'Restaurant',
    filt_SW8: 'Station',
    filt_CS2: 'Convenience Store',
    filt_AC5: 'Study Cafe',
    filt_OL7: 'Gas / EV Station',
    filt_CT1: 'Cinema & Entertainment',
    filt_AD5: 'Accommodation',
    filt_HP8: 'Hospital',
    filt_MT1: 'Shopping'
  },
  ko: {
    subtitle: '당신과 친구들의 중간 지점을 찾아보세요.',
    locations: '위치 수',
    radius: '검색 반경',
    filter: '필터',
    nearby: '주변',
    copyHint: '클릭하여 복사',
    copied: '복사됨!',
    view: '보기',
    viewKakao: '카카오맵에서 보기 →',
    find: '중간 지점 찾기',
    searching: '검색 중…',
    midpoint: '중간 지점',
    point: '지점',
    placeholder: '예: 성균관대역',
    errSelectFilter: '필터를 하나 이상 선택해주세요.',
    errNoResults: '반경 내에 결과를 찾을 수 없습니다. 다른 위치로 시도해보세요.',
    filt_CE7: '카페',
    filt_FD6: '음식점',
    filt_SW8: '지하철역',
    filt_CS2: '편의점',
    filt_AC5: '스터디카페',
    filt_OL7: '주유소·충전소',
    filt_CT1: '영화·문화시설',
    filt_AD5: '숙박',
    filt_HP8: '병원',
    filt_MT1: '쇼핑'
  }
};

function t(key) { return I18N[currentLang][key]; }
function catLabel(code) { return CATEGORIES[code][currentLang]; }

// strings with interpolation / language-specific word order
function distanceText(d) {
  return currentLang === 'ko' ? '중간 지점에서 ' + d + 'm' : d + 'm from midpoint';
}
function msgAllLocations(n) {
  return currentLang === 'ko'
    ? '모든 위치를 입력해주세요. (' + n + '개 지점 필요)'
    : 'Please enter all locations. (' + n + ' points required)';
}
function msgNotFound(kw) {
  return currentLang === 'ko'
    ? '"' + kw + '" 위치를 찾을 수 없습니다. 다시 입력해주세요.'
    : 'Could not find "' + kw + '". Please try again.';
}

function applyLanguage(lang) {
  currentLang = lang;
  try { localStorage.setItem('midpick_lang', lang); } catch (e) { /* ignore */ }
  document.documentElement.lang = lang;

  // static text nodes flagged with data-i18n
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
    var val = I18N[lang][el.getAttribute('data-i18n')];
    if (val != null) el.textContent = val;
  });

  // point labels + input placeholders (preserve whatever the user has typed)
  Array.prototype.forEach.call(document.querySelectorAll('#location-inputs label'), function (el, i) {
    el.textContent = t('point') + ' ' + (i + 1);
  });
  Array.prototype.forEach.call(document.querySelectorAll('#location-inputs input'), function (el) {
    el.placeholder = t('placeholder');
  });

  // search button, only when idle (leave the "Searching…" label alone mid-search)
  var btn = document.getElementById('search-btn');
  if (btn && !btn.disabled) btn.textContent = t('find');

  // toggle highlight
  Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (el) {
    el.classList.toggle('active', el.getAttribute('data-lang') === lang);
  });

  // re-render the result list (cat tags / distance / "View") in the new language
  if (lastPlaces) renderPlaceList(lastPlaces);
}

// ── SDK ───────────────────────────────────────────────────────────────────────
function loadKakaoSDK() {
  return new Promise(function (resolve, reject) {
    if (typeof KAKAO_APP_KEY === 'undefined' || KAKAO_APP_KEY === 'YOUR_JAVASCRIPT_APP_KEY_HERE') {
      reject(new Error(
        'config.js is missing or the app key is not set.\n' +
        'Copy config.example.js to config.js and enter your Kakao JavaScript app key.'
      ));
      return;
    }
    var script = document.createElement('script');
    // autoload=false so we can call kakao.maps.load() ourselves after the services library is ready
    script.src =
      '//dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_APP_KEY +
      '&libraries=services&autoload=false';
    script.onerror = function () {
      reject(new Error('Failed to load the Kakao Maps SDK. Check your key and allowed domains.'));
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
var lastPlaces = null;

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
        reject(new Error(msgNotFound(keyword)));
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
    label.textContent = t('point') + ' ' + i;

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'addr' + i;
    input.placeholder = t('placeholder');
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
    showError(msgAllLocations(locationCount));
    return;
  }
  if (selected.length === 0) { showError(t('errSelectFilter')); return; }

  btn.disabled = true;
  btn.textContent = t('searching');
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
      makeMarker(midLatLng, t('midpoint'), '#5dd639');

      return Promise.all(selected.map(function (code) {
        return searchCategory(code, midLatLng);
      }));
    })
    .then(function (resultsPerCategory) {
      btn.disabled = false;
      btn.textContent = t('find');

      var all = [];
      resultsPerCategory.forEach(function (results) { all = all.concat(results); });
      all.sort(function (a, b) { return parseInt(a.distance) - parseInt(b.distance); });

      if (all.length === 0) {
        showError(t('errNoResults'));
        return;
      }
      renderPlaces(all);
    })
    .catch(function (err) {
      btn.disabled = false;
      btn.textContent = t('find');
      showError(err.message);
    });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderPlaces(places) {
  lastPlaces = places;

  // markers (kept across language switches; the list is what gets re-rendered)
  places.forEach(function (place) {
    var pos    = new kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x));
    var marker = makeMarker(pos, place.place_name, CATEGORIES[place._categoryCode].color);
    place._marker = marker;
    place._pos    = pos;
    kakao.maps.event.addListener(marker, 'click', function () {
      openPlaceInfo(place, marker);
    });
  });

  renderPlaceList(places);
  showResults();
}

function openPlaceInfo(place, marker) {
  if (openInfoWindow) openInfoWindow.close();
  openInfoWindow = new kakao.maps.InfoWindow({
    content:
      '<div style="padding:8px 10px;font-size:13px;max-width:220px;line-height:1.5">' +
      '<strong>' + place.place_name + '</strong><br>' +
      (place.road_address_name || place.address_name) + '<br>' +
      '<a href="' + place.place_url + '" target="_blank" rel="noopener" ' +
      'style="color:#4361EE">' + t('viewKakao') + '</a>' +
      '</div>'
  });
  openInfoWindow.open(map, marker);
}

function renderPlaceList(places) {
  var list  = document.getElementById('place-list');
  var count = document.getElementById('results-count');

  list.innerHTML = '';
  count.textContent = '(' + places.length + ')';

  places.forEach(function (place, i) {
    var cat = CATEGORIES[place._categoryCode];
    var li  = document.createElement('li');
    li.className = 'place-item';

    var distText = place.distance
      ? '<span class="place-distance">' + distanceText(place.distance) + '</span>'
      : '';

    li.innerHTML =
      '<span class="place-num">' + (i + 1) + '</span>' +
      '<div class="place-info">' +
        '<div class="place-name-row">' +
          '<strong class="place-name">' + place.place_name + '</strong>' +
          '<span class="cat-tag" style="background:' + cat.color + '">' + catLabel(place._categoryCode) + '</span>' +
        '</div>' +
        '<span class="place-address">' + (place.road_address_name || place.address_name) + '</span>' +
        distText +
      '</div>' +
      '<a class="place-link" href="' + place.place_url + '" ' +
         'target="_blank" rel="noopener" ' +
         'onclick="event.stopPropagation()">' + t('view') + '</a>';

    li.addEventListener('click', function () {
      if (place._pos) map.panTo(place._pos);
      if (place._marker) kakao.maps.event.trigger(place._marker, 'click');
    });

    list.appendChild(li);
  });
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

// ── Language toggle (works immediately, independent of the map loading) ─────────
(function initLanguage() {
  var saved;
  try { saved = localStorage.getItem('midpick_lang'); } catch (e) { /* ignore */ }
  currentLang = (saved === 'ko' || saved === 'en') ? saved : 'en';

  Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (el) {
    el.addEventListener('click', function () { applyLanguage(el.getAttribute('data-lang')); });
  });

  applyLanguage(currentLang);
})();

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
      '<strong>Could not load the app</strong><br><br>' +
      err.message.replace(/\n/g, '<br>') +
      '</div>';
  });
