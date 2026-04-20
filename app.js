// ═══════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════
let allCars = [];
let filteredCars = [];
let currentPage = 1;

const ROWS_PER_PAGE = 7;
function getColumns() {
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 768) return 2;
  return 3;
}
let perPage = getColumns() * ROWS_PER_PAGE;

// Load data
async function loadData() {
  try {
    const resp = await fetch('data/cars.json');
    const data = await resp.json();
    allCars = data.cars;
  } catch(e) {
    console.warn('Could not load cars.json, using inline data');
    return;
  }
  initFilters();
  applyFilters();
  handleRoute();
}

// ═══════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════
const COLOR_DE = { BLACK:'Schwarz', WHITE:'Weiß', GRAY:'Grau', GREY:'Grau', SILVER:'Silber', BLUE:'Blau', RED:'Rot', BROWN:'Braun', GREEN:'Grün', BEIGE:'Beige', GOLD:'Gold', ORANGE:'Orange', YELLOW:'Gelb', PURPLE:'Lila', PINK:'Pink' };

function initFilters() {
  // Brands
  const brands = [...new Set(allCars.map(c => c.brand))].sort();
  const bSel = document.getElementById('filterBrand');
  brands.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; bSel.appendChild(o); });

  // Years
  const years = [...new Set(allCars.map(c => c.year))].sort((a,b) => b-a);
  ['filterYearFrom','filterYearTo'].forEach(id => {
    const sel = document.getElementById(id);
    years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o); });
  });

  // Fuel dropdown
  const fuels = [...new Set(allCars.map(c => c.fuel).filter(Boolean))].sort();
  const fuelDE = { Diesel:'Diesel', Gasoline:'Benzin', Electric:'Elektro', Hybrid:'Hybrid', LPG:'Autogas' };
  const fSel = document.getElementById('filterFuel');
  fuels.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = fuelDE[f] || f; fSel.appendChild(o); });

  // Color dropdown
  const colors = [...new Set(allCars.map(c => c.color).filter(Boolean))].sort();
  const cSel = document.getElementById('filterColor');
  colors.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = COLOR_DE[c.toUpperCase()] || c; cSel.appendChild(o); });
}

function applyFilters() {
  const brand  = document.getElementById('filterBrand').value;
  const yFrom  = +document.getElementById('filterYearFrom').value || 0;
  const yTo    = +document.getElementById('filterYearTo').value || 9999;
  const kmFrom = +document.getElementById('filterKmFrom').value || 0;
  const kmTo   = +document.getElementById('filterKmTo').value || 9999999;
  const pFrom  = +document.getElementById('filterPriceFrom').value || 0;
  const pTo    = +document.getElementById('filterPriceTo').value || 999999;
  const fuel   = document.getElementById('filterFuel').value;
  const color  = document.getElementById('filterColor').value;

  filteredCars = allCars.filter(c => {
    if (brand && c.brand !== brand) return false;
    if (c.year < yFrom || c.year > yTo) return false;
    if (c.mileage_km < kmFrom || c.mileage_km > kmTo) return false;
    if (c.price_eur < pFrom || c.price_eur > pTo) return false;
    if (fuel && c.fuel !== fuel) return false;
    if (color && c.color !== color) return false;
    return true;
  });

  sortCars();
}

function resetFilters() {
  ['filterBrand','filterYearFrom','filterYearTo','filterKmFrom','filterKmTo',
   'filterPriceFrom','filterPriceTo','filterFuel','filterColor'].forEach(id => {
    document.getElementById(id).value = '';
  });
  currentPage = 1;
  applyFilters();
}

function sortCars() {
  const sort = document.getElementById('sortSelect').value;
  switch(sort) {
    case 'price-asc': filteredCars.sort((a,b) => a.price_eur - b.price_eur); break;
    case 'price-desc': filteredCars.sort((a,b) => b.price_eur - a.price_eur); break;
    case 'km-asc': filteredCars.sort((a,b) => a.mileage_km - b.mileage_km); break;
    case 'year-desc': filteredCars.sort((a,b) => b.year - a.year); break;
    default: break;
  }
  currentPage = 1;
  renderGrid();
}

// ═══════════════════════════════════════════════════════════════
// RENDER CATALOG GRID
// ═══════════════════════════════════════════════════════════════
function renderGrid() {
  const start = (currentPage - 1) * perPage;
  const page = filteredCars.slice(start, start + perPage);
  document.getElementById('totalCount').textContent = filteredCars.length.toLocaleString('de-DE');

  const grid = document.getElementById('carGrid');
  grid.innerHTML = page.map((c, i) => {
    const slides = (c.images && c.images.length) ? c.images.slice(0, 4) : (c.thumbnail ? [c.thumbnail] : []);
    const showNav = slides.length > 1;
    const slidesHtml = slides.map((img, si) =>
      `<img class="cc-slide-img${si === 0 ? ' act' : ''}" src="${img}" alt="${c.brand} ${c.model}" loading="lazy" onerror="this.style.display='none'">`
    ).join('');
    const dotsHtml = showNav ? `<div class="cc-dots">${slides.map((_, si) => `<span class="cc-dot${si === 0 ? ' act' : ''}"></span>`).join('')}</div>` : '';
    const arrowsHtml = showNav ? `
      <button class="cc-arr cc-prev" onclick="ccNav(event,this,-1)">&#8249;</button>
      <button class="cc-arr cc-next" onclick="ccNav(event,this,1)">&#8250;</button>` : '';
    return `
    <a href="#/catalog/${c.id}" class="cc" style="animation-delay:${i*0.04}s">
      <div class="cc-img">
        ${slidesHtml}
        ${arrowsHtml}
        ${dotsHtml}
        <div class="badges">
          ${c.inspected ? '<span class="badge b-insp">✓ Geprüft</span>' : ''}
          ${c.booked ? '<span class="badge b-book">Reserviert</span>' : ''}
        </div>
      </div>
      <div class="cc-body">
        <div class="cc-title">${c.brand} ${c.model}</div>
        <div class="cc-year">${c.year} · ${c.mileage_display} km</div>
        <div class="cc-specs">
          <span class="spec">${c.fuel}</span>
          <span class="spec">${c.displacement}cc</span>
          <span class="spec">${c.transmission === 'AUTO' ? 'Automatik' : 'Schaltung'}</span>
          ${c.drive_type !== '2WD' ? `<span class="spec">${c.drive_type}</span>` : ''}
        </div>
        <div class="cc-foot">
          <div>
            ${c.old_price_eur ? `<div class="cc-old">${c.old_price_eur.toLocaleString('de-DE')} €</div>` : ''}
            <div class="cc-price">${c.price_eur.toLocaleString('de-DE')} €</div>
          </div>
        </div>
      </div>
    </a>
  `;
  }).join('');

  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filteredCars.length / perPage);
  const pag = document.getElementById('pagination');
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="pg" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (i <= 3 || i >= total - 1 || Math.abs(i - currentPage) <= 1) {
      html += `<button class="pg ${i===currentPage?'act':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === 4 && currentPage > 5) {
      html += `<span class="pg" style="pointer-events:none;border:none;background:none">…</span>`;
    }
  }
  html += `<button class="pg" onclick="goPage(${currentPage+1})" ${currentPage===total?'disabled':''}>›</button>`;
  pag.innerHTML = html;
}

function goPage(p) {
  const total = Math.ceil(filteredCars.length / perPage);
  if (p < 1 || p > total) return;
  currentPage = p;
  renderGrid();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════
// RENDER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════
function renderDetail(carId) {
  const car = allCars.find(c => c.id === carId);
  if (!car) { goHome(); return; }

  document.title = `${car.brand} ${car.model} (${car.year}) | MangoAuto`;

  const fuelDE = { 'Diesel':'Diesel','Benzin':'Benzin','Gasoline':'Benzin','Electric':'Elektro','Hybrid':'Hybrid','LPG':'Autogas' };
  const colorDE = { 'BLACK':'Schwarz','WHITE':'Weiß','GRAY':'Grau','SILVER':'Silber','BLUE':'Blau','RED':'Rot','BROWN':'Braun','GREEN':'Grün','BEIGE':'Beige' };
  const transDE = car.transmission === 'AUTO' ? 'Automatik' : 'Schaltgetriebe';

  const insuranceRows = [
    ['Totalschaden',       car.relevant_info?.total_loss],
    ['Hochwasserschaden',  car.relevant_info?.flood],
    ['Diebstahl',          car.relevant_info?.theft],
    ['Regierungsfahrzeug', car.relevant_info?.government_usage],
    ['Kraftstoffumbau',    car.relevant_info?.fuel_modification],
    ['Sitzumbau',          car.relevant_info?.seat_modification],
  ].map(([label, val]) => `
    <div class="spec-row">
      <div class="spec-label">${label}</div>
      <div class="spec-val ${val === 'NO' ? 'val-ok' : 'val-warn'}">${val === 'NO' ? '✓ Nein' : '⚠ Ja'}</div>
    </div>`).join('');

  const waMsg = encodeURIComponent(`Hallo! Ich interessiere mich für: ${car.brand} ${car.model} (${car.year}), ID: ${car.id}`);

  document.getElementById('detailContent').innerHTML = `
    <div class="back-link" onclick="goHome()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2L4 8l6 6"/></svg>
      Zurück zum Katalog
    </div>

    <div class="bread">
      <a href="#" onclick="goHome();return false">Fahrzeugkatalog</a>
      <svg viewBox="0 0 16 16" width="14" height="14"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      <span>${car.brand}</span>
      <svg viewBox="0 0 16 16" width="14" height="14"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      <span>${car.model}</span>
    </div>

    <div class="det-grid">

      <!-- TITLE CARD (mobile only — shown above gallery via order:1) -->
      <div class="pp-title-mob">
        <h1 class="pp-title">${car.year} ${car.brand} ${car.model}</h1>
        ${(car.inspected || car.booked) ? `<div class="pp-subtitle-badges">
          ${car.inspected ? '<span class="badge b-insp">✓ Geprüft</span>' : ''}
          ${car.booked ? '<span class="badge b-book">Reserviert</span>' : ''}
        </div>` : ''}
      </div>

      <!-- MEDIA: Gallery + Quick Stats -->
      <div class="det-media">

        ${buildPhotoGrid(car.images)}

        <div class="quick-stats">
          <div class="qs-item">
            <div class="qs-val">${car.mileage_display}</div>
            <div class="qs-label">km</div>
          </div>
          <div class="qs-item">
            <div class="qs-val">${car.displacement ? car.displacement + ' cc' : '—'}</div>
            <div class="qs-label">Hubraum</div>
          </div>
          <div class="qs-item">
            <div class="qs-val">${fuelDE[car.fuel] || car.fuel}</div>
            <div class="qs-label">Kraftstoff</div>
          </div>
          <div class="qs-item">
            <div class="qs-val">${transDE}</div>
            <div class="qs-label">Getriebe</div>
          </div>
          <div class="qs-item">
            <div class="qs-val">${car.first_registration || car.year}</div>
            <div class="qs-label">Erstzulassung</div>
          </div>
          <div class="qs-item">
            <div class="qs-val">${car.passengers}</div>
            <div class="qs-label">Sitze</div>
          </div>
        </div>

        <div class="disc">ℹ️ Die Fahrzeuginformationen stammen von MangoCar (Korea). Zwischen den Angaben und dem tatsächlichen Fahrzeugcheck können Abweichungen bestehen.</div>

      </div>

      <!-- RIGHT COLUMN: title card (desktop) + price panel, sticky -->
      <div class="det-right">

        <!-- Title card — desktop only, hidden on mobile -->
        <div class="pp-title-card">
          <h1 class="pp-title">${car.year} ${car.brand} ${car.model}</h1>
          ${(car.inspected || car.booked) ? `<div class="pp-subtitle-badges">
            ${car.inspected ? '<span class="badge b-insp">✓ Geprüft</span>' : ''}
            ${car.booked ? '<span class="badge b-book">Reserviert</span>' : ''}
          </div>` : ''}
        </div>

        <div class="price-panel">

          <!-- Price -->
          <div class="pp-price-block">
            <div class="pp-price">${car.price_eur.toLocaleString('de-DE')} €</div>
            ${car.old_price_eur ? `<div class="pp-old">${car.old_price_eur.toLocaleString('de-DE')} €</div>` : ''}
            <div class="pp-note">inkl. Gebühren, Verschiffung & Verzollung exkl. TÜV-Abnahme</div>
          </div>

          <!-- Hint -->
          <div class="hint-box">
            <div style="font-size:18px;flex-shrink:0">ℹ️</div>
            <div>
              <div class="hint-title">Wichtiger Hinweis</div>
              <div class="hint-text">Wir agieren ausschließlich als Vermittler. Alle Fahrzeuge stammen aus Korea und werden direkt importiert. Eine Gewährleistung ist ausgeschlossen — der Käufer trägt das Risiko.</div>
            </div>
          </div>

          <!-- Contact CTAs -->
          <button class="btn-primary btn-wa" onclick="window.open('https://wa.me/4917642134338?text=${waMsg}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> WhatsApp schreiben
          </button>
          <div class="det-cta">
            <button class="btn-secondary" onclick="goKontakt()">
              ✉️ Kontakt
            </button>
            <button class="btn-secondary" onclick="window.location.href='tel:+4917642134338'">
              📞 Anrufen
            </button>
          </div>

          <!-- Service cards -->
          <div class="svc-card">
            <div class="svc-card-icon">🔍</div>
            <div class="svc-card-body">
              <div class="svc-card-title">Fahrzeug-Check vor Ort <span class="svc-price">99 €</span></div>
              <p class="svc-card-text">Bevor wir ein Fahrzeug importieren, lassen wir es durch unseren Partner vor Ort gründlich prüfen. Dieser Check gibt dir ein sicheres Gefühl beim Import.</p>
              <div class="svc-card-actions">
                <a class="svc-link" href="#">Was beinhaltet der Check?</a>
                <button class="svc-btn" onclick="openCheckModal()">Check anfragen</button>
              </div>
            </div>
          </div>

          <div class="svc-card">
            <div class="svc-card-icon">✅</div>
            <div class="svc-card-body">
              <div class="svc-card-title">TÜV-Abnahme durch uns</div>
              <p class="svc-card-text">Wir kümmern uns um die komplette TÜV-Abnahme deines importierten Fahrzeugs in Deutschland.</p>
              <div class="svc-card-actions">
                <a class="svc-link" href="#">Mehr erfahren</a>
              </div>
            </div>
          </div>

          <div class="svc-card">
            <div class="svc-card-icon">🔔</div>
            <div class="svc-card-body">
              <div class="svc-card-title">Fahrzeug-Alarm</div>
              <p class="svc-card-text">Täglich neue Fahrzeuge! Frag nach unserem Benachrichtigungsservice.</p>
              <div class="svc-card-actions">
                <a class="svc-link" onclick="window.open('https://wa.me/4917642134338?text=Hallo!%20Ich%20m%C3%B6chte%20den%20Fahrzeug-Alarm%20aktivieren.')">Jetzt anfragen</a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- SPECS: Tech data + inspection + insurance (col 1, row 2 on desktop; order 3 on mobile) -->
      <div class="det-specs">

        <!-- Technische Daten -->
        <div class="spec-card">
          <div class="spec-card-h">📋 Technische Daten</div>
          <div class="spec-table">
            <div class="spec-row"><div class="spec-label">Marke</div><div class="spec-val">${car.brand}</div></div>
            <div class="spec-row"><div class="spec-label">Modell</div><div class="spec-val">${car.model}</div></div>
            <div class="spec-row"><div class="spec-label">Baujahr</div><div class="spec-val">${car.year}</div></div>
            <div class="spec-row"><div class="spec-label">Erstzulassung</div><div class="spec-val">${car.first_registration || '—'}</div></div>
            <div class="spec-row"><div class="spec-label">Kilometerstand</div><div class="spec-val">${car.mileage_display} km</div></div>
            <div class="spec-row"><div class="spec-label">Kraftstoff</div><div class="spec-val">${fuelDE[car.fuel] || car.fuel}</div></div>
            <div class="spec-row"><div class="spec-label">Getriebe</div><div class="spec-val">${transDE}</div></div>
            <div class="spec-row"><div class="spec-label">Hubraum</div><div class="spec-val">${car.displacement ? car.displacement + ' cc' : '—'}</div></div>
            <div class="spec-row"><div class="spec-label">Farbe</div><div class="spec-val">${colorDE[car.color] || car.color || '—'}</div></div>
            <div class="spec-row"><div class="spec-label">Sitzplätze</div><div class="spec-val">${car.passengers}</div></div>
            <div class="spec-row"><div class="spec-label">Antrieb</div><div class="spec-val">${car.drive_type}</div></div>
            <div class="spec-row"><div class="spec-label">Rahmen</div><div class="spec-val" style="color:${car.frame_status==='Normal'?'var(--grn)':'#DC2626'}">${car.frame_status === 'Normal' ? '✓ Normal' : '⚠ Auffällig'}</div></div>
          </div>
        </div>

        <!-- Inspection Report -->
        ${buildInspectionSection(car)}

        <!-- Versicherungs- & Schadenshistorie -->
        <div class="spec-card">
          <div class="spec-card-h">🔒 Versicherungs- & Schadenshistorie</div>
          <div class="spec-table">
            ${insuranceRows}
            <div class="spec-row"><div class="spec-label">Karosserie außen</div><div class="spec-val">${car.exterior_panel_items} Reparatur(en)</div></div>
          </div>
        </div>

      </div>

    </div>
  `;

  window._lbIdx = 0;
  window._galImages = car.images;

  // Scroll page to top, then scale + pre-scroll the inspection iframe wrapper
  window.scrollTo({ top: 0, behavior: 'instant' });
  requestAnimationFrame(() => { scaleInspIframe(); updateStripArrows(); });
}

function scaleInspIframe() {
  const wrap  = document.querySelector('.insp-iframe-wrap');
  const frame = document.querySelector('.insp-iframe');
  if (!wrap || !frame) return;

  const IFRAME_W = 1200; // px — width the MangoCar page renders at
  const WRAP_H   = 800;  // visible height of the wrapper

  const scale = wrap.offsetWidth / IFRAME_W;

  frame.style.width           = IFRAME_W + 'px';
  frame.style.height          = Math.round(WRAP_H / scale) + 'px';
  frame.style.transform       = `scale(${scale})`;
  frame.style.transformOrigin = 'top left';
}

// ═══════════════════════════════════════════════════════════════
// INSPECTION REPORT SECTION
// ═══════════════════════════════════════════════════════════════
function buildInspectionSection(car) {
  if (!car.inspected) return '';

  const insp = car.inspection_data || {};
  const replCount  = insp.replacement_count ?? 0;
  const weldCount  = insp.welding_count ?? 0;
  const paintCount = insp.painting_count ?? 0;

  // Diagram: use Playwright screenshot if available, otherwise fall back to 4 static SVGs
  const svgBase = 'https://file.mangoworldcar.com/Static/assets/images/svg/MIT_STATUS_ASSESSMENT_';
  const diagramGrid = car.inspection_diagram ? `
    <div class="insp-screenshot">
      <img src="${car.inspection_diagram}" alt="Fahrzeugdiagnose"
           onerror="this.parentElement.innerHTML='<div class=insp-diagram-grid>${[1,2,3,4].map(n=>`<div class=insp-diagram-img><img src=${svgBase}${n}.svg></div>`).join('')}</div>'">
    </div>` : `
    <div class="insp-diagram-grid">
      ${[1,2,3,4].map(n => `
        <div class="insp-diagram-img">
          <img src="${svgBase}${n}.svg" alt="Fahrzeugansicht ${n}"
               onerror="this.parentElement.style.display='none'">
        </div>`).join('')}
    </div>`;

  const legend = `
    <div class="insp-legend">
      <span class="insp-badge insp-x">✕ Erneuerung: ${replCount}</span>
      <span class="insp-badge insp-w">W Karosserie: ${weldCount}</span>
      <span class="insp-badge insp-p">○ Lackierung: ${paintCount}</span>
    </div>`;

  // Option diagnosis table
  const optDiag = insp.option_diagnosis || {};
  const optRows = Object.entries(optDiag).map(([k, v]) => {
    const cls = v === 'Normal' ? 'val-ok' : v === 'Abnormal' ? 'val-warn' : '';
    const icon = v === 'Normal' ? '✓' : v === 'Abnormal' ? '⚠' : '';
    return `<div class="spec-row"><div class="spec-label">${k}</div><div class="spec-val ${cls}">${icon} ${v}</div></div>`;
  }).join('');

  // Device diagnosis table
  const devDiag = insp.device_diagnosis || {};
  const devRows = Object.entries(devDiag).map(([k, v]) => {
    const cls = v === 'Normal' ? 'val-ok' : v === 'Abnormal' ? 'val-warn' : '';
    const icon = v === 'Normal' ? '✓' : v === 'Abnormal' ? '⚠' : '';
    return `<div class="spec-row"><div class="spec-label">${k}</div><div class="spec-val ${cls}">${icon} ${v}</div></div>`;
  }).join('');

  const diagTables = (optRows || devRows) ? `
    <div class="spec-table insp-tables">
      ${optRows ? `
        <div class="spec-row insp-section-head">
          <div class="spec-label" style="font-weight:700;color:var(--t1)">Optionen</div>
          <div class="spec-val"></div>
        </div>
        ${optRows}` : ''}
      ${devRows ? `
        <div class="spec-row insp-section-head" style="margin-top:8px">
          <div class="spec-label" style="font-weight:700;color:var(--t1)">Antrieb & Technik</div>
          <div class="spec-val"></div>
        </div>
        ${devRows}` : ''}
    </div>` : '';

  const iframeBlock = car.inspection_url ? `
    <div class="insp-iframe-wrap">
      <iframe src="${car.inspection_url}" class="insp-iframe" loading="lazy" title="MANGOCAR Prüfbericht"></iframe>
    </div>
    <button class="insp-detail-btn"
            onclick="window.open('${car.inspection_url}')">
      ↗ Im neuen Tab öffnen
    </button>` : '';

  return `
    <div class="spec-card insp-card">
      <div class="spec-card-h">🔍 MANGOCAR-Prüfbericht</div>
      <!-- ${diagramGrid} -->
      <!-- ${legend} -->
      ${diagTables}
      ${iframeBlock}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// PHOTO GRID
// ═══════════════════════════════════════════════════════════════
function buildPhotoGrid(images) {
  if (!images || !images.length) {
    return `<div class="photo-grid" style="display:flex;align-items:center;justify-content:center;color:var(--t3)">Kein Foto verfügbar</div>`;
  }

  const countBadge = `<div class="pg-count">📷 ${images.length} Foto${images.length !== 1 ? 's' : ''}</div>`;

  // Show ALL thumbnails — arrows handle overflow navigation
  const stripHtml = images.map((img, i) => `
      <div class="pg-strip-th ${i === 0 ? 'act' : ''}" onclick="selectGalImg(${i})">
        <img src="${img}" loading="lazy">
      </div>`).join('');

  const hasMultiple = images.length > 1;

  return `
    <div class="photo-grid">
      <div class="pg-main" id="pgMain" onclick="openLightbox(window._lbIdx||0)">
        <img id="pgMainImg" src="${images[0]}" alt="Fahrzeugfoto" loading="eager">${countBadge}
      </div>
    </div>
    <div class="pg-strip-wrap">
      <button class="pg-strip-btn pg-strip-left hidden" id="pgStripLeft" onclick="scrollStrip(-1)">&#8249;</button>
      <div class="pg-strip" id="pgStrip" onscroll="updateStripArrows()">${stripHtml}</div>
      <button class="pg-strip-btn pg-strip-right${hasMultiple ? '' : ' hidden'}" id="pgStripRight" onclick="scrollStrip(1)">&#8250;</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// CHECK MODAL
// ═══════════════════════════════════════════════════════════════
function openCheckModal() {
  document.getElementById('checkModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeCheckModal(e) {
  if (!e || e.target === document.getElementById('checkModal')) {
    document.getElementById('checkModal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const m = document.getElementById('checkModal');
    if (m && !m.classList.contains('hidden')) closeCheckModal();
  }
});

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════════
function selectGalImg(idx) {
  const images = window._galImages || [];
  if (!images[idx]) return;
  const mainImg = document.getElementById('pgMainImg');
  if (mainImg) mainImg.src = images[idx];
  window._lbIdx = idx;
  const strip = document.getElementById('pgStrip');
  if (strip) {
    strip.querySelectorAll('.pg-strip-th').forEach((el, i) => el.classList.toggle('act', i === idx));
    const active = strip.querySelectorAll('.pg-strip-th')[idx];
    if (active) active.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    updateStripArrows();
  }
}

function scrollStrip(dir) {
  const strip = document.getElementById('pgStrip');
  if (!strip) return;
  const th = strip.querySelector('.pg-strip-th');
  const step = th ? (th.offsetWidth + 2) * 3 : 200;
  strip.scrollBy({ left: dir * step, behavior: 'smooth' });
}

function updateStripArrows() {
  const strip = document.getElementById('pgStrip');
  if (!strip) return;
  const left  = document.getElementById('pgStripLeft');
  const right = document.getElementById('pgStripRight');
  if (left)  left.classList.toggle('hidden',  strip.scrollLeft < 1);
  if (right) right.classList.toggle('hidden', strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 1);
}

function openLightbox(startIdx) {
  const images = window._galImages || [];
  if (!images.length) return;
  window._lbIdx = startIdx || 0;
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function lbBgClick(e) {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
}

function lbNav(dir) {
  const images = window._galImages || [];
  window._lbIdx = (window._lbIdx + dir + images.length) % images.length;
  renderLightbox();
}

function lbGoTo(idx) {
  window._lbIdx = idx;
  renderLightbox();
}

function renderLightbox() {
  const images = window._galImages || [];
  const idx = window._lbIdx;
  document.getElementById('lbImg').src = images[idx];
  document.getElementById('lbCount').textContent = `${idx + 1} / ${images.length}`;

  const thumbs = document.getElementById('lbThumbs');
  thumbs.innerHTML = images.map((img, i) => `
    <div class="lb-th ${i === idx ? 'act' : ''}" onclick="lbGoTo(${i})">
      <img src="${img}" loading="lazy">
    </div>`).join('');

  // Scroll active thumb into lightbox strip view
  const active = thumbs.querySelector('.act');
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  // Sync the photo strip below the grid
  const strip = document.getElementById('pgStrip');
  if (strip) {
    strip.querySelectorAll('.pg-strip-th').forEach((el, i) => el.classList.toggle('act', i === idx));
    const activeStrip = strip.querySelector('.act');
    if (activeStrip) activeStrip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || lb.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') lbNav(1);
  if (e.key === 'ArrowLeft') lbNav(-1);
  if (e.key === 'Escape') closeLightbox();
});

// ═══════════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════════
function showView(active) {
  ['catalogView','detailView','kontaktView','serviceView','checkView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== active);
  });
}

function handleRoute() {
  const hash = window.location.hash;
  const catalogMatch = hash.match(/^#\/catalog\/(.+)$/);

  if (catalogMatch) {
    showView('detailView');
    renderDetail(catalogMatch[1]);
    window.scrollTo(0, 0);
  } else if (hash === '#/kontakt') {
    showView('kontaktView');
    renderKontakt();
    window.scrollTo(0, 0);
  } else if (hash === '#/service') {
    showView('serviceView');
    renderService();
    window.scrollTo(0, 0);
  } else if (hash === '#/check') {
    showView('checkView');
    renderCheck();
    window.scrollTo(0, 0);
  } else {
    showView('catalogView');
    document.title = 'Fahrzeugkatalog | MangoAuto Deutschland';
  }
}

function goHome() {
  window.location.hash = '';
  handleRoute();
  window.scrollTo(0, 0);
}

function goKontakt() {
  window.location.hash = '#/kontakt';
  handleRoute();
  window.scrollTo(0, 0);
}

function goService() {
  window.location.hash = '#/service';
  handleRoute();
  window.scrollTo(0, 0);
}

function goCheck() {
  window.location.hash = '#/check';
  handleRoute();
  window.scrollTo(0, 0);
}

function renderKontakt() {
  document.title = 'Kontakt | MangoAuto Deutschland';
  document.getElementById('kontaktView').innerHTML = `

    <!-- Full-width orange banner -->
    <div class="kont-banner">
      <div class="kont-banner-in">
        <nav class="kont-bread">
          <a onclick="goHome();return false" href="#">Startseite</a>
          <svg viewBox="0 0 16 16" width="13" height="13"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          <span>Kontakt</span>
        </nav>
        <h1 class="kont-banner-title">Kontakt</h1>
        <p class="kont-banner-sub">Hast du Fragen oder möchtest du ein Fahrzeug anfragen? Wir sind für dich da.</p>
      </div>
    </div>

    <!-- Page content -->
    <div class="detail">
    <div class="kont-grid">

      <!-- Single unified contact card -->
      <div class="kont-cards">
        <div class="kont-unified">
          <!-- Header -->
          <div class="kont-unified-hdr">
            <div class="kont-unified-hdr-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <span class="kont-unified-hdr-label">Kontaktdaten</span>
          </div>

          <!-- Address block -->
          <div class="kont-unified-addr">
            <div class="kont-addr-name">MangoAuto GmbH</div>
            <div class="kont-addr-line">Berlin, Deutschland</div>
          </div>

          <!-- Divider -->
          <div class="kont-divider"></div>

          <!-- Phone row -->
          <a class="kont-row" href="tel:+4917642134338">
            <div class="kont-row-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.06 6.06l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <span>+49 176 421 34338</span>
          </a>

          <!-- Divider -->
          <div class="kont-divider"></div>

          <!-- Email row -->
          <a class="kont-row" href="mailto:info@mangocarworld.de">
            <div class="kont-row-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <span>info@mangocarworld.de</span>
          </a>
        </div>
      </div>

      <!-- Opening hours + note -->
      <div class="kont-info">
        <div class="kont-box">
          <h3>Erreichbarkeit</h3>
          <div class="kont-hours">
            <div class="kont-hour-row"><span>Montag – Freitag</span><span>09:00 – 18:00 Uhr</span></div>
            <div class="kont-hour-row"><span>Samstag</span><span>10:00 – 15:00 Uhr</span></div>
            <div class="kont-hour-row kont-closed"><span>Sonntag</span><span>Geschlossen</span></div>
          </div>
        </div>
        <div class="kont-box" style="margin-top:20px">
          <h3>Wichtiger Hinweis</h3>
          <p>Wir agieren ausschließlich als Vermittler. Alle Fahrzeuge stammen aus Korea und werden direkt importiert. Eine Gewährleistung ist ausgeschlossen. Bei Fragen helfen wir dir gerne weiter.</p>
        </div>
      </div>

    </div>
    </div>
  `;
}

function renderCheck() {
  document.title = 'Fahrzeug-Check | MangoAuto Deutschland';
  document.getElementById('checkView').innerHTML = `

    <div class="svc-banner">
      <div class="svc-banner-in">
        <nav class="kont-bread">
          <a onclick="goHome();return false" href="#">Startseite</a>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 4l4 4-4 4"/></svg>
          <span>Fahrzeug-Check</span>
        </nav>
        <h1 class="svc-banner-title">Fahrzeug-Check</h1>
        <p class="svc-banner-sub">Lass dein Wunschfahrzeug vor dem Kauf von einem unabhängigen Gutachter vor Ort in Korea prüfen — für mehr Sicherheit und Transparenz.</p>
      </div>
    </div>

    <div class="svc-wrap">

      <!-- ── Was ist der Fahrzeug-Check? ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Was ist der Fahrzeug-Check?</h2>
        <p class="chk-intro">Bevor du ein Fahrzeug aus Korea kaufst, lassen wir es von einem zertifizierten, unabhängigen Gutachter direkt vor Ort in Korea inspizieren. Du erhältst einen detaillierten Prüfbericht mit Fotos, technischer Bewertung und Zustandsbeschreibung — bevor du eine Kaufentscheidung triffst.</p>
      </section>

      <!-- ── Was wird geprüft? ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Was wird geprüft?</h2>
        <p class="svc-section-sub">Der Gutachter prüft das Fahrzeug in allen wichtigen Bereichen</p>
        <div class="chk-grid">
          <div class="chk-item">
            <div class="chk-icon">🔩</div>
            <div>
              <strong>Motor &amp; Getriebe</strong>
              <p>Sichtprüfung auf Öl- und Flüssigkeitslecks, Laufgeräusche, Funktionstest</p>
            </div>
          </div>
          <div class="chk-item">
            <div class="chk-icon">🚗</div>
            <div>
              <strong>Karosserie &amp; Lack</strong>
              <p>Kontrolle auf Unfallschäden, Rostansätze, Lackschäden und Spaltmaße</p>
            </div>
          </div>
          <div class="chk-item">
            <div class="chk-icon">⚡</div>
            <div>
              <strong>Elektrik &amp; Elektronik</strong>
              <p>Prüfung aller elektrischen Systeme, Beleuchtung, Assistenzsysteme</p>
            </div>
          </div>
          <div class="chk-item">
            <div class="chk-icon">🛑</div>
            <div>
              <strong>Bremsen &amp; Fahrwerk</strong>
              <p>Zustand der Bremsbeläge, Bremsscheiben, Stoßdämpfer und Lenkung</p>
            </div>
          </div>
          <div class="chk-item">
            <div class="chk-icon">🪑</div>
            <div>
              <strong>Innenraum</strong>
              <p>Zustand von Sitzen, Verkleidungen, Armaturenbrett und Klimaanlage</p>
            </div>
          </div>
          <div class="chk-item">
            <div class="chk-icon">📋</div>
            <div>
              <strong>MIT-Prüfbericht</strong>
              <p>Auswertung des offiziellen MANGOCAR Inspektionsberichts inkl. Unfallhistorie</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Was bekommst du? ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Was bekommst du?</h2>
        <div class="chk-includes">
          <div class="chk-include-item">✅ Detaillierter schriftlicher Prüfbericht</div>
          <div class="chk-include-item">✅ Fotos des Fahrzeugs (Außen, Innen, Motor)</div>
          <div class="chk-include-item">✅ Bewertung des Gesamtzustands</div>
          <div class="chk-include-item">✅ Auswertung der Unfallhistorie</div>
          <div class="chk-include-item">✅ Empfehlung: Kaufen oder nicht kaufen</div>
          <div class="chk-include-item">✅ Persönliche Beratung durch unser Team</div>
        </div>
      </section>

      <!-- ── Ablauf ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">So läuft der Check ab</h2>
        <p class="svc-section-sub">In 4 einfachen Schritten zum Prüfbericht</p>
        <div class="svc-steps">
          <div class="svc-step">
            <div class="svc-step-num">1</div>
            <div class="svc-step-body">
              <h4>Fahrzeug auswählen</h4>
              <p>Wähle ein Fahrzeug aus unserem Katalog und teile uns die Fahrzeug-ID mit.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">2</div>
            <div class="svc-step-body">
              <h4>Check beauftragen &amp; bezahlen</h4>
              <p>Kontaktiere uns per WhatsApp oder E-Mail. Wir bestätigen den Auftrag und du bezahlst die Check-Gebühr.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">3</div>
            <div class="svc-step-body">
              <h4>Inspektion vor Ort</h4>
              <p>Unser unabhängiger Gutachter in Korea inspiziert das Fahrzeug gründlich innerhalb weniger Werktage.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">4</div>
            <div class="svc-step-body">
              <h4>Prüfbericht erhalten</h4>
              <p>Du erhältst den vollständigen Bericht und kannst anschließend in Ruhe entscheiden, ob du das Fahrzeug kaufst.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Preis ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Kosten</h2>
        <div class="chk-price-box">
          <div class="chk-price-main">
            <span class="chk-price-label">Fahrzeug-Check</span>
            <span class="chk-price-val">ab 99 €</span>
          </div>
          <p class="chk-price-note">Der genaue Preis richtet sich nach Fahrzeugtyp und Standort. Kontaktiere uns für ein individuelles Angebot.</p>
        </div>
      </section>

      <!-- ── Disclaimer ── -->
      <section class="svc-section">
        <div class="svc-disclaimer">
          <div class="svc-disclaimer-icon">⚠️</div>
          <div>
            <strong>Wichtiger Hinweis</strong>
            <p>Der Fahrzeug-Check dient als Entscheidungshilfe. Er ersetzt keine offizielle TÜV-Abnahme in Deutschland. MangoAuto agiert als Vermittler — eine Gewährleistung ist ausgeschlossen.</p>
          </div>
        </div>
      </section>

      <!-- ── CTA ── -->
      <section class="svc-cta-section">
        <h2>Bereit für deinen Fahrzeug-Check?</h2>
        <p>Wähle dein Wunschfahrzeug und kontaktiere uns — wir kümmern uns um den Rest.</p>
        <div class="svc-cta-btns">
          <button class="btn-primary svc-cta-btn" onclick="goHome()">Zum Fahrzeugkatalog</button>
          <button class="btn-secondary svc-cta-btn" onclick="window.open('https://wa.me/4917642134338')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            Per WhatsApp anfragen
          </button>
        </div>
      </section>

    </div>
  `;
}

function renderService() {
  document.title = 'Unser Service | MangoAuto Deutschland';
  document.getElementById('serviceView').innerHTML = `

    <div class="svc-banner">
      <div class="svc-banner-in">
        <nav class="kont-bread">
          <a onclick="goHome();return false" href="#">Startseite</a>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 4l4 4-4 4"/></svg>
          <span>Unser Service</span>
        </nav>
        <h1 class="svc-banner-title">Unser Service</h1>
        <p class="svc-banner-sub">Von der Fahrzeugsuche bis zur TÜV-Abnahme. Wir begleiten dich durch den gesamten Importprozess.</p>
      </div>
    </div>

    <div class="svc-wrap">

      <!-- ── 6 Service Cards ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Was wir bieten</h2>
        <div class="svc-cards">
          <div class="svc-card">
            <div class="svc-card-icon">🔍</div>
            <h3>Fahrzeugsuche</h3>
            <p>Durchsuche unseren umfangreichen Katalog mit täglich aktualisierten Fahrzeugen direkt aus Korea.</p>
          </div>
          <div class="svc-card">
            <div class="svc-card-icon">🔧</div>
            <h3>Fahrzeug-Check</h3>
            <p>Unabhängige Vorort-Inspektion durch zertifizierte Gutachter in Korea — mit detailliertem Prüfbericht und Fotos.</p>
          </div>
          <div class="svc-card">
            <div class="svc-card-icon">🚢</div>
            <h3>Sichere Abwicklung</h3>
            <p>Professionelle Kaufabwicklung inklusive Verschiffung nach Rotterdam und vollständiger Zollabfertigung.</p>
          </div>
          <div class="svc-card">
            <div class="svc-card-icon">✅</div>
            <h3>TÜV-Service</h3>
            <p>Kompletter Zulassungsservice in Deutschland — inklusive Lieferung und TÜV-Abnahme auf Wunsch.</p>
          </div>
          <div class="svc-card">
            <div class="svc-card-icon">🔔</div>
            <h3>Fahrzeug-Alarm</h3>
            <p>Tägliche Benachrichtigung, sobald ein passendes Fahrzeug in unserem Katalog verfügbar ist.</p>
          </div>
          <div class="svc-card">
            <div class="svc-card-icon">✨</div>
            <h3>Aufbereitung</h3>
            <p>Professionelle Innen- und Außenaufbereitung deines Fahrzeugs vor der Übergabe — auf Wunsch.</p>
          </div>
        </div>
      </section>

      <!-- ── Import Process ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Der Importprozess</h2>
        <p class="svc-section-sub">In 7 Schritten zu deinem Fahrzeug aus Korea</p>
        <div class="svc-steps">
          <div class="svc-step">
            <div class="svc-step-num">1</div>
            <div class="svc-step-body">
              <h4>Fahrzeug auswählen</h4>
              <p>Durchsuche unseren Katalog und wähle dein Wunschfahrzeug aus.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">2</div>
            <div class="svc-step-body">
              <h4>Fahrzeug-Check beauftragen</h4>
              <p>Wir lassen das Fahrzeug vor Ort in Korea von einem unabhängigen Gutachter prüfen.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">3</div>
            <div class="svc-step-body">
              <h4>Check-Ergebnis erhalten</h4>
              <p>Du erhältst einen detaillierten Prüfbericht mit Fotos und Zustandsbewertung.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">4</div>
            <div class="svc-step-body">
              <h4>Kaufentscheidung &amp; Rechnung</h4>
              <p>Bei positivem Ergebnis erstellen wir eine verbindliche Rechnung für dich.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">5</div>
            <div class="svc-step-body">
              <h4>Zahlung &amp; Abwicklung</h4>
              <p>Nach Zahlungseingang übernehmen wir Kauf und Exportabwicklung in Korea.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">6</div>
            <div class="svc-step-body">
              <h4>Verschiffung</h4>
              <p>Dein Fahrzeug wird per Seetransport nach Rotterdam verschifft und verzollt.</p>
            </div>
          </div>
          <div class="svc-step">
            <div class="svc-step-num">7</div>
            <div class="svc-step-body">
              <h4>Ankunft in Europa (8–12 Wochen)</h4>
              <p>Abholung in Rotterdam oder Lieferung nach Deutschland. Optional: TÜV-Abnahme durch uns.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Pricing Table ── -->
      <section class="svc-section">
        <h2 class="svc-section-title">Preisübersicht</h2>
        <div class="svc-price-table">
          <div class="svc-price-row svc-price-head">
            <span>Leistung</span><span>Preis</span>
          </div>
          <div class="svc-price-row">
            <div>
              <strong>Katalogpreis</strong>
              <p>Fahrzeugpreis inkl. Verschiffung &amp; Zollabfertigung</p>
            </div>
            <span class="svc-price-val">Im Angebot enthalten</span>
          </div>
          <div class="svc-price-row">
            <div>
              <strong>Fahrzeug-Check</strong>
              <p>Unabhängige Inspektion vor Ort in Korea</p>
            </div>
            <span class="svc-price-val">ab 99 €</span>
          </div>
          <div class="svc-price-row">
            <div>
              <strong>TÜV-Service</strong>
              <p>Zulassung &amp; TÜV-Abnahme in Deutschland</p>
            </div>
            <span class="svc-price-val">auf Anfrage</span>
          </div>
          <div class="svc-price-row">
            <div>
              <strong>Aufbereitung</strong>
              <p>Professionelle Innen- &amp; Außenaufbereitung</p>
            </div>
            <span class="svc-price-val">auf Anfrage</span>
          </div>
          <div class="svc-price-row">
            <div>
              <strong>Fahrzeug-Alarm</strong>
              <p>Benachrichtigung bei neuen Treffern</p>
            </div>
            <span class="svc-price-val">auf Anfrage</span>
          </div>
        </div>
      </section>

      <!-- ── Disclaimer ── -->
      <section class="svc-section">
        <div class="svc-disclaimer">
          <div class="svc-disclaimer-icon">⚠️</div>
          <div>
            <strong>Wichtiger Hinweis</strong>
            <p>Wir agieren ausschließlich als Vermittler zwischen dir und dem koreanischen Fahrzeugmarkt. Alle Fahrzeuge stammen aus Korea und werden direkt importiert. Eine Gewährleistung ist gemäß unseren AGB ausgeschlossen. Der Käufer trägt das Importrisiko. Bei Fragen helfen wir dir gerne weiter.</p>
          </div>
        </div>
      </section>

      <!-- ── CTA ── -->
      <section class="svc-cta-section">
        <h2>Bereit für dein Auto aus Korea?</h2>
        <p>Entdecke unsere aktuellen Fahrzeuge oder kontaktiere uns direkt.</p>
        <div class="svc-cta-btns">
          <button class="btn-primary svc-cta-btn" onclick="goHome()">Zum Fahrzeugkatalog</button>
          <button class="btn-secondary svc-cta-btn" onclick="goKontakt()">Kontakt aufnehmen</button>
        </div>
      </section>

    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// CARD CAROUSEL
// ═══════════════════════════════════════════════════════════════
function ccNav(e, btn, dir) {
  e.preventDefault();
  e.stopPropagation();
  const ccImg = btn.closest('.cc-img');
  const slides = ccImg.querySelectorAll('.cc-slide-img');
  const dots   = ccImg.querySelectorAll('.cc-dot');
  let cur = 0;
  slides.forEach((s, i) => { if (s.classList.contains('act')) cur = i; });
  const next = (cur + dir + slides.length) % slides.length;
  slides[cur].classList.remove('act');
  slides[next].classList.add('act');
  dots[cur].classList.remove('act');
  dots[next].classList.add('act');
}

// ═══════════════════════════════════════════════════════════════
// MOBILE MENU
// ═══════════════════════════════════════════════════════════════
function toggleMobileMenu() {
  const drawer = document.getElementById('mobNavDrawer');
  const overlay = document.getElementById('mobNavOverlay');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    drawer.classList.add('open');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobNavDrawer');
  const overlay = document.getElementById('mobNavOverlay');
  drawer.classList.remove('open');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('mobNavDrawer');
    if (drawer && drawer.classList.contains('open')) closeMobileMenu();
  }
});

window.addEventListener('hashchange', handleRoute);
window.addEventListener('resize', () => {
  scaleInspIframe();
  const newPerPage = getColumns() * ROWS_PER_PAGE;
  if (newPerPage !== perPage) {
    perPage = newPerPage;
    currentPage = 1;
    renderGrid();
  }
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
loadData();
