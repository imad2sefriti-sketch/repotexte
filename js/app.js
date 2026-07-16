/* ════════════════════════════════════════════════
   1. DATA — chargée depuis data/mines.json (voir buildMarkers)
   Pour ajouter une mine : ajouter un objet dans data/mines.json
   ════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════
   2. CONFIG
   ════════════════════════════════════════════════ */
const DOMAIN_COLORS = {
  "Rif":               "#6b8f71",
  "Meseta":            "#8b7355",
  "Domaine Atlasique": "#b5762a",
  "Anti-Atlas":        "#c4703f",
  "Domaine Saharien":  "#d4a853"
};

const STATUS = {
  active:    { label:"Active",     color:"#2ecc71", css:"active" },
  closed:    { label:"Fermée",    color:"#e74c3c", css:"closed" },
  abandoned: { label:"Abandonnée",color:"#e74c3c", css:"closed" }
};

/* ════════════════════════════════════════════════
   3. MAP — ESRI Satellite par défaut
   ════════════════════════════════════════════════ */
const map = L.map("map", {
  center: [29.5, -7.5],
  zoom: 6,
  zoomControl: true,
  attributionControl: true
});

// Basemap layers
const basemaps = {
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "© ESRI World Imagery", maxZoom: 19 }
  ),
  topo: L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenTopoMap contributors", maxZoom: 17 }
  ),
  osm: L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap contributors", maxZoom: 19 }
  )
};

// Couche de labels par-dessus le satellite
const labels = L.tileLayer(
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  { opacity: 0.7, maxZoom: 19 }
);

basemaps.satellite.addTo(map);
labels.addTo(map);

let currentBM = "satellite";

function switchBasemap(key) {
  Object.values(basemaps).forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
  basemaps[key].addTo(map);
  // Labels seulement sur satellite
  if (key === "satellite") {
    if (!map.hasLayer(labels)) labels.addTo(map);
  } else {
    if (map.hasLayer(labels)) map.removeLayer(labels);
  }
  currentBM = key;
  document.querySelectorAll(".bm-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("bm-" + key).classList.add("active");
}

document.getElementById("bm-satellite").addEventListener("click", () => switchBasemap("satellite"));
document.getElementById("bm-topo").addEventListener("click",      () => switchBasemap("topo"));
document.getElementById("bm-osm").addEventListener("click",       () => switchBasemap("osm"));

/* ════════════════════════════════════════════════
   4. RÉGIONS ADMINISTRATIVES (data/regions.geojson)
   ════════════════════════════════════════════════ */
const regionsLayer = L.geoJSON(null, {
  style: {
    color: "#30c9b0",
    weight: 1.4,
    opacity: 0.75,
    fillColor: "#30c9b0",
    fillOpacity: 0.04
  },
  onEachFeature(feature, layer) {
    const p = feature.properties || {};
    layer.bindTooltip(p.nom_fr, { sticky: true, className: "mine-tip" });
    /* Contenu généré à l'ouverture (fonction) : minesData peut ne pas être encore chargé au moment du bindPopup */
    layer.bindPopup(() => {
      const regionMineCount = minesData.filter(m => normalizeRegion(m.region) === normalizeRegion(p.nom_fr)).length;
      return `
        <strong>${p.nom_fr}</strong><br/>
        Population : ${p.P_ensemble ? p.P_ensemble.toLocaleString("fr-FR") : "—"}<br/>
        Urbaine / Rurale : ${p.p_urbaine ? p.p_urbaine.toLocaleString("fr-FR") : "—"} / ${p.p_rurale ? p.p_rurale.toLocaleString("fr-FR") : "—"}<br/>
        Sites miniers indexés : ${regionMineCount}
      `;
    });
    layer.on("mouseover", () => layer.setStyle({ weight: 2.6, fillOpacity: 0.12 }));
    layer.on("mouseout",  () => layer.setStyle({ weight: 1.4, fillOpacity: 0.04 }));
  }
});

/* Retire les articles ("l'", "le ", "la ") pour comparer les noms de régions entre les deux jeux de données */
function normalizeRegion(name) {
  return (name || "").toLowerCase().replace(/^l'|^la |^le /, "").trim();
}

fetch("data/regions.geojson")
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(geojson => regionsLayer.addData(geojson))
  .catch(err => console.error("Erreur de chargement de data/regions.geojson :", err));

document.getElementById("chk-regions").addEventListener("change", function() {
  this.checked ? map.addLayer(regionsLayer) : map.removeLayer(regionsLayer);
});

/* ════════════════════════════════════════════════
   4B. PROVINCES / PRÉFECTURES (data/provinces.geojson)
   ════════════════════════════════════════════════ */
const provincesLayer = L.geoJSON(null, {
  style: {
    color: "#c77dff",
    weight: 1,
    opacity: 0.7,
    fillColor: "#c77dff",
    fillOpacity: 0.03,
    dashArray: "3,3"
  },
  onEachFeature(feature, layer) {
    const p = feature.properties || {};
    layer.bindTooltip(p.nom_fr, { sticky: true, className: "mine-tip" });
    layer.bindPopup(() => `
      <strong>${p.nom_fr}</strong><br/>
      Population : ${p.P_ensemble ? p.P_ensemble.toLocaleString("fr-FR") : "—"}<br/>
      Urbaine / Rurale : ${p.p_urbaine ? p.p_urbaine.toLocaleString("fr-FR") : "—"} / ${p.p_rurale ? p.p_rurale.toLocaleString("fr-FR") : "—"}<br/>
      Ménages : ${p.P_menages ? Math.round(p.P_menages).toLocaleString("fr-FR") : "—"}
    `);
    layer.on("mouseover", () => layer.setStyle({ weight: 2.2, fillOpacity: 0.1 }));
    layer.on("mouseout",  () => layer.setStyle({ weight: 1, fillOpacity: 0.03 }));
  }
});

fetch("data/provinces.geojson")
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(geojson => provincesLayer.addData(geojson))
  .catch(err => console.error("Erreur de chargement de data/provinces.geojson :", err));

document.getElementById("chk-provinces").addEventListener("change", function() {
  this.checked ? map.addLayer(provincesLayer) : map.removeLayer(provincesLayer);
});

/* ════════════════════════════════════════════════
   5. MARKERS
   ════════════════════════════════════════════════ */
function pinIcon(status) {
  const isActive = (status === "active");
  const fill   = isActive ? "%231a7a45" : "%23c0392b";
  const bg     = isActive ? "%23eafaf1" : "%23fdf0ef";
  const border = isActive ? "%231a7a45" : "%23c0392b";

  /* ── Casque minier SVG ── */
  const helmetSVG =
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 52'%3E" +

    /* Ombre portée légère */
    "%3Cellipse cx='22' cy='50' rx='10' ry='3' fill='%23000' opacity='.12'/%3E" +

    /* Corps principal du marqueur (cercle) */
    "%3Ccircle cx='22' cy='21' r='19' fill='" + bg + "' stroke='" + border + "' stroke-width='2.2'/%3E" +

    /* Casque — calotte supérieure */
    "%3Cpath d='M8 21 Q8 7 22 6 Q36 7 36 21 Z' fill='" + fill + "'/%3E" +

    /* Bord horizontal du casque */
    "%3Crect x='6' y='20' width='32' height='4.5' rx='2.2' fill='" + fill + "'/%3E" +

    /* Visière (rectangle translucide) */
    "%3Crect x='14' y='12' width='16' height='11' rx='2' fill='" + bg + "' opacity='.85'/%3E" +

    /* Ligne de reflet sur la calotte */
    "%3Cpath d='M13 12 Q18 8 26 10' stroke='" + bg + "' stroke-width='2' fill='none' stroke-linecap='round' opacity='.6'/%3E" +

    /* Pointe triangulaire */
    "%3Cpolygon points='22,42 15,31 29,31' fill='" + border + "'/%3E" +

    "%3C/svg%3E";

  return L.icon({
    iconUrl:       "data:image/svg+xml," + helmetSVG,
    iconSize:      [30, 36],
    iconAnchor:    [15, 36],
    tooltipAnchor: [0, -36]
  });
}

const layerActive   = L.layerGroup().addTo(map);
const layerInactive = L.layerGroup().addTo(map);
const markerIndex   = [];
let minesData        = [];

/* Construit les marqueurs + met à jour les compteurs une fois les données chargées */
function buildMarkers() {
  minesData.forEach(mine => {
    const marker = L.marker([mine.latitude, mine.longitude], {
      icon: pinIcon(mine.status),
      title: mine.name
    });

    const st = STATUS[mine.status] || STATUS.active;
    /* Label permanent sous le marqueur */
    marker.bindTooltip(mine.name, {
      className:   "mine-label",
      permanent:   true,
      direction:   "bottom",
      offset:      [0, 4]
    });

    /* Tooltip détaillé au survol */
    marker.bindPopup(
      `<strong>${mine.name}</strong><br/><span style="color:${st.color}">${st.label}</span> · ${mine.main_substance}`,
      { className:"mine-tip-hover", closeButton:false, autoClose:true, maxWidth:200 }
    );

    marker.on("click", e => {
      L.DomEvent.stopPropagation(e);
      openPopup(mine);
    });

    const grp = mine.status === "active" ? layerActive : layerInactive;
    marker.addTo(grp);
    markerIndex.push({ mine, marker, grp });
  });

  // Stats
  const total = minesData.length;
  const nActive = minesData.filter(m => m.status === "active").length;
  document.getElementById("s-total").textContent  = total;
  document.getElementById("s-active").textContent = nActive;
  document.getElementById("s-closed").textContent = total - nActive;
  document.getElementById("topbar-count").textContent = total + (total > 1 ? " sites indexés" : " site indexé");
}

/* Chargement des données depuis le fichier JSON statique (pas de backend requis) */
fetch("data/mines.json")
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(data => {
    minesData = data;
    buildMarkers();
  })
  .catch(err => {
    console.error("Erreur de chargement de data/mines.json :", err);
    document.getElementById("topbar-count").textContent = "Erreur de chargement des données";
  });

/* ════════════════════════════════════════════════
   6. POPUP
   ════════════════════════════════════════════════ */
const popupEl   = document.getElementById("mine-popup");
const popupBody = document.getElementById("popup-body");
let currentMine = null;

function openPopup(mine) {
  currentMine = mine;
  popupBody.innerHTML = buildPopup(mine);
  popupEl.hidden = false;
}

/* Export PDF premium : document dédié construit depuis les données de la mine. */
function buildMinePdfDocument(mine) {
  const esc = value => String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
  const present = value => value !== null && value !== undefined && value !== "";
  const fact = (label, value, tone = "") => present(value)
    ? `<div class="pdf-fact ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>` : "";
  const note = (title, value, tone = "") => present(value)
    ? `<div class="pdf-data-note ${tone}"><h3>${esc(title)}</h3><p>${esc(value)}</p></div>` : "";

  const status = STATUS[mine.status] || STATUS.active;
  const reference = mine.id_mine || `SITE-${mine.id}`;
  const active = mine.status === "active";
  const date = new Intl.DateTimeFormat("fr-FR", { day:"2-digit", month:"long", year:"numeric" }).format(new Date());
  const coords = `${Number(mine.latitude).toFixed(4)}° N · ${Math.abs(Number(mine.longitude)).toFixed(4)}° W`;
  const summary = mine.deposit_type_titre || (Array.isArray(mine.deposit_type) ? mine.deposit_type[0] : mine.deposit_type) || mine.geological_description || "Fiche descriptive du site minier";

  const content = popupBody.cloneNode(true);
  content.querySelectorAll(".popup-dl, .popup-header, .img-gallery").forEach(node => node.remove());
  content.querySelectorAll("img").forEach(img => img.closest(".fsc")?.remove());

  const dataHighlights = [
    note("Description géologique", mine.geological_description),
    note("Déchets miniers", mine.mining_waste, "warning"),
    note("Impacts environnementaux", mine.environmental_impacts, "warning")
  ].join("");
  const mineralFacts = [
    fact("Minéraux principaux", mine.min_princ, "highlight"), fact("Minéraux associés", mine.min_assoc),
    fact("Gangue", mine.gangue), fact("Minéraux secondaires", mine.min_sec),
    fact("Contrôle structural", mine.ctrl_struct), fact("Intrusion associée", mine.intrusion),
    fact("Stade métallogénique 1", mine.stade1), fact("Stade métallogénique 2", mine.stade2),
    fact("Zone de cémentation", mine.zone_cem), fact("Signature isotopique δ³⁴S", mine.delta_s)
  ].join("");
  const imageResources = Array.isArray(mine.images) && mine.images.length
    ? `<section class="pdf-resource-section"><div class="pdf-section-kicker">RESSOURCES VISUELLES</div><h2>Documents photographiques & cartographiques</h2><div class="pdf-resource-grid">${mine.images.map((img, index) => `<div class="pdf-resource"><b>${String(index + 1).padStart(2,"0")}</b><div><strong>${esc(img.label || "Ressource visuelle")}</strong><p>${esc([img.type, img.sub].filter(Boolean).join(" · "))}</p>${/^https?:\/\//i.test(img.src || "") ? `<a href="${esc(img.src)}">Ouvrir la ressource en ligne</a>` : ""}</div></div>`).join("")}</div></section>` : "";

  const root = document.createElement("div");
  root.className = "pdf-document";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <header class="pdf-cover">
      <div class="pdf-brand-row">
        <div class="pdf-brand"><svg viewBox="0 0 48 48"><polygon points="24,2 44,13 44,35 24,46 4,35 4,13" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="24,12 34,18 34,30 24,36 14,30 14,18" fill="currentColor" opacity=".22"/><circle cx="24" cy="24" r="5" fill="currentColor"/></svg><div><strong>Morocco Mining WebGIS</strong><span>Plateforme de visualisation et valorisation minière</span></div></div>
        <div class="pdf-doc-meta"><span>FICHE TECHNIQUE</span><strong>${esc(reference)}</strong></div>
      </div>
      <div class="pdf-cover-main"><div class="pdf-eyebrow">DOSSIER GÉOLOGIQUE & MINIER</div><h1>${esc(mine.name)}</h1><div class="pdf-cover-tags"><span class="${active ? "active" : "inactive"}">${esc(status.label)}</span><span>${esc(mine.structural_domain)}</span><span>${esc(mine.main_substance)}</span></div><p>${esc(summary)}</p></div>
      <div class="pdf-geo-band"><div><span>COORDONNÉES</span><strong>${esc(coords)}</strong><small>${esc(mine.coords_dms || "")}</small></div><div><span>LOCALISATION</span><strong>${esc([mine.province, mine.region].filter(Boolean).join(" · "))}</strong><small>Maroc</small></div><div><span>ÉDITION</span><strong>${esc(date)}</strong><small>Données de la plateforme</small></div></div>
    </header>
    <div class="pdf-summary-row">${fact("Substance principale", mine.main_substance, "highlight")}${fact("Substances associées", (mine.other_substances || []).join(" · ") || "Non renseignées")}${fact("Opérateur", mine.operateur || "Non renseigné")}${fact("Statut", status.label, active ? "success" : "danger")}</div>
    <main class="pdf-report-body">
      ${dataHighlights ? `<section class="pdf-source-section"><div class="pdf-section-kicker">SYNTHÈSE DE LA BASE</div><h2>Données essentielles du site</h2>${dataHighlights}${mineralFacts ? `<div class="pdf-facts-grid">${mineralFacts}</div>` : ""}</section>` : ""}
      <div class="pdf-popup-content">${content.innerHTML}</div>
      ${imageResources}
      <div class="pdf-endnote"><strong>Note de lecture</strong><p>Cette fiche restitue les données disponibles dans Morocco Mining WebGIS à la date d'édition. Les mentions « données à compléter » signalent les informations restant à documenter dans la base.</p></div>
    </main>`;
  return root;
}

/* Sélecteurs des blocs "atomiques" qu'on évite de couper au milieu d'une page */
const PDF_AVOID_SELECTORS = ".pdf-fact,.pdf-data-note,.pdf-resource,.pdf-cover,.pdf-endnote,.pdf-brand-row,.pdf-geo-band," +
  ".popup-field,.popup-coords,.popup-subs,.fsct,.fsct-red,tr,li";

/* Calcule les bornes verticales (en pixels canvas, échelle incluse) des blocs à ne pas couper */
function pdfAvoidRanges(root, scale) {
  const rootTop = root.getBoundingClientRect().top;
  return Array.from(root.querySelectorAll(PDF_AVOID_SELECTORS))
    .map(el => {
      const r = el.getBoundingClientRect();
      return { top: Math.round((r.top - rootTop) * scale), bottom: Math.round((r.bottom - rootTop) * scale) };
    })
    .sort((a, b) => a.top - b.top);
}

/* Découpe la hauteur totale [0, totalHeightPx] en tranches <= pageHeightPx, en repoussant
   la coupure avant tout bloc "à éviter" qu'elle traverserait (sauf si ça réduirait trop la page). */
function pdfSlicePages(totalHeightPx, pageHeightPx, avoidRanges) {
  const slices = [];
  let y = 0;
  while (y < totalHeightPx) {
    let end = Math.min(y + pageHeightPx, totalHeightPx);
    for (const range of avoidRanges) {
      if (range.top > y && range.top < end && range.bottom > end) {
        const elHeight = range.bottom - range.top;
        if (elHeight <= pageHeightPx && (range.top - y) > pageHeightPx * 0.15) end = range.top;
        break; /* avoidRanges triés par top : le premier croisement trouvé est le plus proche */
      }
    }
    slices.push([y, end]);
    y = end;
  }
  return slices;
}

async function downloadMineData() {
  const ready = currentMine && typeof html2canvas === "function" && window.jspdf && window.jspdf.jsPDF;
  if (!ready) {
    alert("Le module PDF n'est pas disponible. Vérifiez votre connexion puis réessayez.");
    return;
  }
  const button = document.querySelector(".popup-dl");
  const originalLabel = button?.textContent;
  if (button) { button.textContent = "⏳ Génération du PDF…"; button.classList.add("is-loading"); button.style.pointerEvents = "none"; }
  document.documentElement.classList.add("pdf-exporting");
  document.body.classList.add("pdf-exporting");
  const root = buildMinePdfDocument(currentMine);
  const overlay = document.createElement("div");
  overlay.className = "pdf-generation-overlay";
  overlay.innerHTML = '<div><span></span><strong>Génération du document</strong><small>Mise en page de la fiche géologique…</small></div>';
  document.body.append(root, overlay);
  const safeName = (currentMine.id_mine || currentMine.name || "mine").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/gi, "_");
  try {
    /* Attend les polices ET un cycle de mise en page/peinture complet avant la capture :
       évite le rognage des premiers glyphes (Rajdhani pas encore rasterisé au moment du snapshot). */
    if (document.fonts?.ready) {
      await Promise.all([
        document.fonts.ready,
        document.fonts.load("800 36px Rajdhani"), document.fonts.load("700 18px Rajdhani"),
        document.fonts.load("700 15px Rajdhani"), document.fonts.load("700 13px Rajdhani")
      ]).catch(() => {});
    }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const scale = 2;
    const captureWidth  = root.scrollWidth;
    const captureHeight = root.scrollHeight;

    /* x/y/scrollX/scrollY à 0 : évite un décalage de capture (source du rognage à gauche) */
    const canvas = await html2canvas(root, {
      scale, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false,
      x: 0, y: 0, scrollX: 0, scrollY: 0,
      windowWidth: captureWidth, windowHeight: captureHeight, width: captureWidth, height: captureHeight
    });

    const avoidRanges = pdfAvoidRanges(root, scale);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageWmm = pdf.internal.pageSize.getWidth();
    const pageHmm = pdf.internal.pageSize.getHeight();
    const marginTop = 10, marginBottom = 15, marginSide = 10;
    const contentWmm = pageWmm - marginSide * 2;
    const contentHmm = pageHmm - marginTop - marginBottom;
    const pxPerMm = canvas.width / contentWmm;
    const pageHeightPx = Math.floor(contentHmm * pxPerMm);

    const slices = pdfSlicePages(canvas.height, pageHeightPx, avoidRanges);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    const sliceCtx = sliceCanvas.getContext("2d");

    slices.forEach(([y0, y1], i) => {
      const sliceHeightPx = y1 - y0;
      sliceCanvas.height = sliceHeightPx;
      sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceHeightPx);
      sliceCtx.drawImage(canvas, 0, y0, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const imgData = sliceCanvas.toDataURL("image/jpeg", 0.98);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", marginSide, marginTop, contentWmm, sliceHeightPx / pxPerMm);
    });
    const pages = pdf.internal.getNumberOfPages();
    const reference = currentMine.id_mine || `SITE-${currentMine.id}`;
    pdf.setProperties({ title:`Fiche géologique et minière - ${currentMine.name}`, subject:`Morocco Mining WebGIS - ${reference}`, author:"Morocco Mining WebGIS", creator:"Morocco Mining WebGIS" });
    for (let page = 1; page <= pages; page++) {
      pdf.setPage(page); pdf.setDrawColor(205,218,210); pdf.setLineWidth(0.25); pdf.line(10,pageHmm-10.5,pageWmm-10,pageHmm-10.5);
      pdf.setFont("helvetica","normal"); pdf.setFontSize(7.5); pdf.setTextColor(80,101,90);
      pdf.text(`MOROCCO MINING WEBGIS  ·  ${reference}`,10,pageHmm-6.3);
      pdf.text(`Page ${page} / ${pages}`,pageWmm-10,pageHmm-6.3,{align:"right"});
    }

    pdf.save(`fiche_${safeName}.pdf`);
  } catch (error) {
    console.error("Erreur de génération du PDF :", error);
    alert("La génération du PDF a échoué. Réessayez ou téléchargez plus tard.");
  } finally {
    root.remove(); overlay.remove(); document.documentElement.classList.remove("pdf-exporting"); document.body.classList.remove("pdf-exporting");
    if (button) { button.textContent = originalLabel; button.classList.remove("is-loading"); button.style.pointerEvents = ""; }
  }
}
function closePopup() { popupEl.hidden = true; }

document.getElementById("popup-close").addEventListener("click", closePopup);
map.on("click", closePopup);

function buildPopup(mine) {
  const st = STATUS[mine.status] || STATUS.active;
  const dc = DOMAIN_COLORS[mine.structural_domain] || "#888";
  const subs = `<span class="sub-main">${mine.main_substance}</span>` +
    (mine.other_substances||[]).map(s=>`<span class="sub-other">${s}</span>`).join("");
  /* ── Génération section valorisation ── */
  const treat = (mine.treatment_methods && mine.treatment_methods.hakkou) ? `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div>
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
          color:#1a56a8;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span style="width:3px;height:14px;background:#1a56a8;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
          Propositions techniques — Hakkou et al. (2008)
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${mine.treatment_methods.hakkou.map(h=>`
          <div style="background:#f0f4ff;border:1px solid #c7d9f5;border-radius:8px;padding:10px 14px;">
            <div style="font-size:.82rem;font-weight:700;color:#1a56a8;margin-bottom:4px;">${h.opt}</div>
            <div style="font-size:12pt;font-weight:600;color:#1a1f2e;margin-bottom:3px;font-family:'Times New Roman',Times,serif;">${h.titre}</div>
            <div style="font-size:.84rem;color:#4a5568;line-height:1.55;">→ ${h.desc}</div>
          </div>`).join("")}
        </div>
      </div>

      <div>
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
          color:#1a7a45;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span style="width:3px;height:14px;background:#1a7a45;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
          Recommandations récentes — Barkouch et al. (2026)
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${mine.treatment_methods.barkouch.map(b=>`
          <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;
            background:#eafaf1;border:1px solid #a8d5bc;border-radius:8px;">
            <span style="font-size:1rem;flex-shrink:0;line-height:1.3;">${b.num}</span>
            <span style="font-size:12pt;color:#1a1f2e;line-height:1.5;font-family:'Times New Roman',Times,serif;">${b.titre}</span>
          </div>`).join("")}
        </div>
      </div>

    </div>
  ` : Array.isArray(mine.treatment_methods)
    ? `<ul>${mine.treatment_methods.map(t=>`<li>${t}</li>`).join("")}</ul>`
    : `<p>${mine.treatment_methods||""}</p>`;

  const fld = (lbl,val,style="") =>
    `<div class="popup-field" style="${style}"><label>${lbl}</label><span>${val||"—"}</span></div>`;

  const phasesH = mine.phases ? `
    <div class="fsc fs-lf">

      <!-- Titre rouge avec barre -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #fde8e6;">
        <span style="width:4px;height:18px;background:#c0392b;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:14pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#c0392b;font-family:'Times New Roman',Times,serif;">Histoire de la mine de ${mine.name}</span>
      </div>

      <!-- Texte historique en Times New Roman -->
      ${mine.histoire ? mine.histoire.map(p=>`
        <p style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#1a1f2e;
          line-height:1.5;text-align:justify;margin:0 0 1em 0;">${p}</p>
      `).join("") : ""}

      <!-- Séparateur avant tableau -->
      <div style="margin:20px 0 14px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;height:1px;background:#dde1e8;"></div>
        <span style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
          color:#1a7a45;white-space:nowrap;padding:0 4px;">Synthèse des phases d'exploitation</span>
        <div style="flex:1;height:1px;background:#dde1e8;"></div>
      </div>

      <!-- Tableau des phases amélioré -->
      <table style="width:100%;border-collapse:collapse;font-family:'Times New Roman',Times,serif;font-size:12pt;border-radius:8px;overflow:hidden;border:1px solid #dde1e8;">
        <thead>
          <tr style="background:#eafaf1;">
            <th style="color:#1a7a45;padding:10px 14px;font-size:.72rem;font-weight:800;
              letter-spacing:.08em;text-transform:uppercase;text-align:left;
              border-bottom:2px solid #a8d5bc;width:60px;">PHASE</th>
            <th style="color:#1a7a45;padding:10px 14px;font-size:.72rem;font-weight:800;
              letter-spacing:.08em;text-transform:uppercase;text-align:left;
              border-bottom:2px solid #a8d5bc;width:120px;">PÉRIODE</th>
            <th style="color:#1a7a45;padding:10px 14px;font-size:.72rem;font-weight:800;
              letter-spacing:.08em;text-transform:uppercase;text-align:left;
              border-bottom:2px solid #a8d5bc;">SUBSTANCE EXPLOITÉE</th>
            <th style="color:#1a7a45;padding:10px 14px;font-size:.72rem;font-weight:800;
              letter-spacing:.08em;text-transform:uppercase;text-align:left;
              border-bottom:2px solid #a8d5bc;">PRODUCTION / RÉSERVES</th>
          </tr>
        </thead>
        <tbody>
          ${mine.phases.map((p,i)=>`
          <tr style="border-bottom:1px solid #eef0f4;background:${i%2===0?'#fff':'#f9fafb'};">
            <td style="padding:11px 14px;">
              <span style="display:inline-flex;align-items:center;justify-content:center;
                width:28px;height:28px;background:#1a7a45;color:#fff;
                font-weight:800;font-size:12pt;border-radius:50%;">${p.num}</span>
            </td>
            <td style="padding:11px 14px;color:#1a1f2e;font-weight:700;font-size:12pt;font-family:'Times New Roman',Times,serif;">${p.periode}</td>
            <td style="padding:11px 14px;color:#4a5568;font-size:12pt;line-height:1.5;font-family:'Times New Roman',Times,serif;">${p.substance}</td>
            <td style="padding:11px 14px;color:#4a5568;font-size:12pt;line-height:1.5;font-family:'Times New Roman',Times,serif;">${p.production}</td>
          </tr>`).join("")}
        </tbody>
      </table>

    </div>` : "";

  const metauxH = mine.m_KC1 ? `
    ${mine.images && mine.images.find(im=>im.type && im.type.includes("aérienne")) ? `
    <div class="fsc fs-lf" style="padding:0;overflow:hidden;">
      <div style="position:relative;">
        <img src="${mine.images.find(im=>im.type.includes('aérienne')).src}"
             alt="Vue aérienne de la mine"
             style="width:100%;max-height:380px;object-fit:cover;display:block;cursor:pointer;"
             onclick="openLightbox(window._lbImgs, window._lbImgs.findIndex(i=>i.type && i.type.includes('aérienne')))"
             onerror="this.style.opacity='0.3'">
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));
          padding:30px 18px 12px;">
          <div style="color:#fff;font-size:14pt;font-weight:700;font-family:'Times New Roman',Times,serif;">
            ${mine.images.find(im=>im.type.includes('aérienne')).label}
          </div>
          <div style="color:#e0e0e0;font-size:12pt;font-family:'Times New Roman',Times,serif;">
            ${mine.images.find(im=>im.type.includes('aérienne')).sub}
          </div>
        </div>
      </div>
    </div>` : ""}

    <div class="fsc fs-lf"><div class="fsct">Métaux lourds — Barkouch et al. 2026 (données terrain 2024–2025)</div>
      <table style="width:100%;border-collapse:collapse;font-size:12pt;font-family:'Times New Roman',Times,serif;">
        <tr style="border-bottom:2px solid #d4edda;">
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;">ÉLÉMENT</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;">SIGNIFICATION</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">KC1 (mg/kg)</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">KC2 (mg/kg)</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">MTK — Résidus (mg/kg)</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">Sol Témoin (mg/kg)</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">CF KC1</th>
        </tr>
        ${[["Cd","Cadmium"],["Cu","Cuivre"],["Pb","Plomb"],["Zn","Zinc"]].map(([m,sig])=>`
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:7px 10px;color:#c0392b;font-weight:700;">${m}</td>
          <td style="padding:7px 10px;color:#4a5568;">${sig}</td>
          <td style="padding:7px 10px;text-align:center;color:#b45309;font-weight:700;">${mine.m_KC1[m]}</td>
          <td style="padding:7px 10px;text-align:center;color:#b45309;font-weight:700;">${mine.m_KC2[m]}</td>
          <td style="padding:7px 10px;text-align:center;color:#c0392b;font-weight:700;">${mine.m_res[m]}</td>
          <td style="padding:7px 10px;text-align:center;color:#1a7a45;font-weight:700;">${mine.m_tem[m]}</td>
          <td style="padding:7px 10px;text-align:center;font-weight:700;">${mine.CF[m]}</td>
        </tr>`).join("")}
      </table>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center;">
        <span style="font-size:12pt;font-family:'Times New Roman',Times,serif;background:#fdf0ef;border:1px solid #e8b4b0;color:#c0392b;padding:4px 12px;border-radius:20px;font-weight:700;">PI KC1 = ${mine.PI_KC1} ⚠</span>
        <span style="font-size:12pt;font-family:'Times New Roman',Times,serif;background:#fdf0ef;border:1px solid #e8b4b0;color:#c0392b;padding:4px 12px;border-radius:20px;font-weight:700;">PI KC2 = ${mine.PI_KC2}</span>
        <span style="font-size:12pt;font-family:'Times New Roman',Times,serif;background:#fde8e6;border:1px solid #c0392b;color:#c0392b;padding:4px 12px;border-radius:20px;font-weight:700;">PI Résidus = ${mine.PI_res} ⚠⚠</span>
        <span style="font-size:12pt;font-family:'Times New Roman',Times,serif;color:#718096;">Seuil légal = 1</span>
      </div>
    </div>

    <!-- Indices de pollution -->
    <div class="fsc fs-lf"><div class="fsct">Indices de pollution</div>
      <table style="width:100%;border-collapse:collapse;font-size:12pt;font-family:'Times New Roman',Times,serif;">
        <tr style="border-bottom:2px solid #d4edda;">
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;">INDICE</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;">SIGNIFICATION</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:center;">VALEUR</th>
        </tr>
        ${[
          ["PI KC1","Indice de pollution du site Kettara Rural Center 1","55,1"],
          ["PI KC2","Indice de pollution du site Kettara Rural Center 2","48,9"],
          ["PI MTK","Indice de pollution des résidus miniers de Kettara","661,9"],
          ["Seuil légal","Limite de référence pour considérer une contamination anthropique","PI &gt; 1"]
        ].map(([ind,sig,val])=>`
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:7px 10px;color:#c0392b;font-weight:700;">${ind}</td>
          <td style="padding:7px 10px;color:#4a5568;">${sig}</td>
          <td style="padding:7px 10px;text-align:center;color:#1a1f2e;font-weight:700;">${val}</td>
        </tr>`).join("")}
      </table>
    </div>

    <!-- Signification des abréviations -->
    <div class="fsc fs-lf"><div class="fsct">Signification des abréviations</div>
      <table style="width:100%;border-collapse:collapse;font-size:12pt;font-family:'Times New Roman',Times,serif;">
        <tr style="border-bottom:2px solid #d4edda;">
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;width:120px;">ABRÉVIATION</th>
          <th style="color:#1a7a45;padding:7px 10px;font-size:14pt;text-align:left;">SIGNIFICATION</th>
        </tr>
        ${[
          ["KC1","Kettara Rural Center 1 : premier secteur rural proche de la mine"],
          ["KC2","Kettara Rural Center 2 : deuxième secteur rural proche de la mine"],
          ["MTK","Mine Tailings Kettara : résidus miniers de Kettara"]
        ].map(([ab,sig])=>`
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:7px 10px;color:#1a56a8;font-weight:700;">${ab}</td>
          <td style="padding:7px 10px;color:#4a5568;">${sig}</td>
        </tr>`).join("")}
      </table>
    </div>` : "";

  /* ── Galerie d'images ── */
  if(mine.images) window._lbImgs = mine.images;
  const galleryHTML = mine.images && mine.images.length ? `
    <div class="fsc fs-lf">
      <div class="fsct">Galerie photographique & cartographique</div>
      <div class="img-gallery">
        ${mine.images.map((img,i) => `
        <div class="img-card" onclick="openLightbox(window._lbImgs,${i})">
          <img src="${img.src}" alt="${img.label}"
               onerror="this.style.opacity='0.3'">
          <div class="img-card-lbl">
            <div class="img-card-type">${img.type}</div>
            ${img.label}
          </div>
        </div>`).join("")}
      </div>
    </div>` : "";

  return `
    <!-- HEADER -->
    <div class="popup-header">
      <div class="popup-pin ${st.css}"></div>
      <div style="flex:1;">
        <div class="popup-mine-name" >${mine.name}</div>
        <div class="popup-tags">
          <span class="popup-tag domain" style="background:${dc};">${mine.structural_domain}</span>
          <span class="popup-tag status-${mine.status}">${st.label}</span>
          ${mine.id_mine?`<span style="font-size:.7rem;color:#718096;background:#f7f8fa;padding:2px 8px;border-radius:10px;border:1px solid #dde1e8;">ID : ${mine.id_mine}</span>`:""}
        </div>
      </div>
    </div>

    <!-- Coords + substances -->
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px;">
      <div class="popup-coords">📍 ${mine.latitude.toFixed(4)}° N | ${Math.abs(mine.longitude).toFixed(4)}° W ${mine.coords_dms?"· "+mine.coords_dms:""}</div>
      <div class="popup-subs" style="margin:0;">${subs}</div>
    </div>

    <!-- 4 cartes identification -->
    <div style="display:grid;grid-template-columns:${mine.status==='active' ? '1fr 1fr' : '1.3fr 1fr 1.7fr'};gap:14px;margin:0 0 18px;">
      <div class="fsc"><div class="fsct">Localisation</div>
        ${fld("Région",mine.region)}
        ${fld("Province",mine.province)}
        ${fld("Massif géologique",mine.massif)}
        ${fld("Altitude",mine.altitude)}
        ${fld("Localisation précise",mine.localisation)}
        ${fld("Accès routier",mine.acces)}
      </div>
      <div class="fsc"><div class="fsct">Opérateur</div>
        ${fld("Opérateur",mine.operateur)}
        ${fld("Client",mine.client)}
        ${fld("Durée exploitation",mine.duree_exploitation)}
      </div>
      ${mine.status !== 'active' ? `
      <div class="fsc" style="border:1.5px solid #e8b4b0;background:#fdf9f9;"><div class="fsct-red">Raisons de fermeture</div>
        <p style="font-size:12pt;color:#c0392b;font-weight:700;margin:0 0 10px;font-family:'Times New Roman',Times,serif;">${mine.rehabilitation||"—"}</p>
        ${mine.raisons_fermeture ? `
          <ul style="margin:0;padding-left:18px;font-size:12pt;color:#4a5568;line-height:1.5;font-family:'Times New Roman',Times,serif;">
            ${mine.raisons_fermeture.split("·").map(r=>`<li style="margin-bottom:5px;">${r.trim()}</li>`).join("")}
          </ul>` : ""}
      </div>` : ""}
    </div>

    <!-- Type de gisement -->
    ${galleryHTML}

    <!-- Cadre géographique (texte complet) -->
    ${mine.cadre_geo_txt ? `
    <div class="fsc fs-lf">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #d4edda;">
        <span style="width:4px;height:18px;background:#1a7a45;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:14pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1a7a45;font-family:'Times New Roman',Times,serif;">Cadre géographique</span>
      </div>
      ${mine.cadre_geo_txt.map(p=>`
        <p style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#1a1f2e;
          line-height:1.5;text-align:justify;margin:0 0 1em 0;">${p}</p>
      `).join("")}
    </div>` : ""}

    <div class="fsc fs-lf">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #fde8e6;">
        <span style="width:4px;height:18px;background:#c0392b;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c0392b;">${mine.deposit_type_titre||"Géologie & Genèse"}</span>
      </div>
      ${Array.isArray(mine.deposit_type)
        ? mine.deposit_type.map(p=>`<p style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#1a1f2e;line-height:1.5;text-align:justify;margin:0 0 1em 0;">${p}</p>`).join("")
        : `<p style="font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;margin:0;">${mine.deposit_type}</p>`}
    </div>

    <!-- Géologie — Corps minéralisé uniquement -->
    <div class="fsc fs-lf"><div class="fsct">Corps minéralisé</div>
      <div class="popup-grid">
        ${fld("Roche encaissante",mine.roche_enc)}${fld("Âge géologique",mine.age_geo)}
        ${fld("Direction",mine.direction)}${fld("Extension horizontale",mine.ext_h)}
        ${fld("Épaisseur max.",mine.epaisseur)}${fld("Profondeur",mine.profondeur)}
      </div>
    </div>

    <!-- Texte complet Minéralogie -->
    ${mine.mineralogie_txt ? `
    <div class="fsc fs-lf">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #d4edda;">
        <span style="width:4px;height:18px;background:#1a7a45;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:14pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1a7a45;font-family:'Times New Roman',Times,serif;">Minéralogie</span>
      </div>
      ${mine.mineralogie_txt.map(p=>`
        <p style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#1a1f2e;
          line-height:1.5;text-align:justify;margin:0 0 1em 0;">${p}</p>
      `).join("")}
    </div>` : ""}

    <!-- Texte complet Genèse -->
    ${mine.genese_txt ? `
    <div class="fsc fs-lf">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #d4edda;">
        <span style="width:4px;height:18px;background:#1a7a45;border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-size:14pt;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1a7a45;font-family:'Times New Roman',Times,serif;">Genèse du gisement</span>
      </div>
      ${mine.genese_txt.map(p=>`
        <p style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#1a1f2e;
          line-height:1.5;text-align:justify;margin:0 0 1em 0;">${p}</p>
      `).join("")}
    </div>` : ""}

    <!-- Phases historiques -->
    ${phasesH}

    <!-- Statistiques de production seule -->
    ${mine.res_brutes || mine.min_extrait || mine.conc_produit || mine.vol_res || mine.surf_res ? `
    <div class="fsc fs-lf"><div class="fsct">Statistiques de production — Mine de ${mine.name}</div>
      <div class="popup-grid">
        ${fld("Réserves brutes",mine.res_brutes)}
        ${fld("Minerai extrait",mine.min_extrait)}
        ${fld("Production totale",mine.conc_produit)}
        ${fld("Volume des résidus",mine.vol_res)}
        ${fld("Surface des résidus",mine.surf_res)}
      </div>
    </div>` : ""}

    <!-- Déchets miniers + Contexte climatique -->
    ${mine.pH_res || mine.climat ? `
    <div class="fs-l2">
      <div class="fsc"><div class="fsct">Déchets miniers</div>
        ${fld("pH résidus",mine.pH_res?"<span style='color:#c0392b;font-weight:700;'>"+mine.pH_res+"</span>":"")}
        ${fld("Conductivité résidus",mine.cond_res)}
        ${fld("Teneur S sol",mine.S_sol)}${fld("Teneur S solides",mine.S_solides)}
        ${fld("Teneur Fe solides",mine.Fe_solides)}${fld("Vol. oxydation fins",mine.oxyd_fins)}
        ${fld("Vol. oxydation grossiers",mine.oxyd_gros)}${fld("Structure stockage",mine.struct_stock)}
      </div>
      <div class="fsc"><div class="fsct">Contexte climatique</div>
        ${fld("Type de climat",mine.climat)}${fld("Précipitations",mine.precip)}
        ${fld("T° min. (janvier)",mine.T_min)}${fld("T° max. (juillet)",mine.T_max)}
        ${fld("Évapotranspiration",mine.etp)}
      </div>
    </div>` : ""}

    <!-- Impacts environnementaux + Potentiel DMA -->
    ${mine.SO4_eau || mine.AP ? `
    <div class="fs-l2">
      <div class="fsc"><div class="fsct">Impacts environnementaux</div>
        ${fld("SO₄ eaux souterraines",mine.SO4_eau)}${fld("SO₄ ruissellement",mine.SO4_ruis)}
        ${fld("pH KC1 / KC2",(mine.pH_KC1||mine.pH_KC2)?(mine.pH_KC1+" / "+mine.pH_KC2):"")}
        ${fld("Conductivité KC1/KC2",(mine.cond_KC1||mine.cond_KC2)?(mine.cond_KC1+" / "+mine.cond_KC2):"")}
        ${fld("Communautés exposées",mine.comm)}${fld("Cultures exposées",mine.cultures)}
      </div>
      <div class="fsc" style="border:1.5px solid #e8b4b0;background:#fdf9f9;"><div class="fsct" style="color:#e74c3c;">Potentiel DMA</div>
        ${fld("Potentiel Acide AP",mine.AP?"<span style='color:#c0392b;font-weight:700;'>"+mine.AP+"</span>":"")}
        ${fld("Potentiel Neutral. NP",mine.NP)}
        ${fld("Bilan NNP",mine.NNP?"<span style='color:#c0392b;font-weight:700;'>"+mine.NNP+"</span>":"")}
        ${fld("NP/AP",mine.NP_AP?"<span style='color:#c0392b;font-weight:700;'>"+mine.NP_AP+"</span>":"")}
        ${fld("DMA actif depuis",mine.DMA_dep?"<span style='color:#c0392b;font-weight:700;'>"+mine.DMA_dep+"</span>":"")}
        ${fld("Structure stockage",mine.struct_stock)}
      </div>
    </div>` : ""}

    <!-- Tableau métaux lourds -->
    ${metauxH}

    <!-- Valorisation pleine largeur -->
    <div class="fsc fs-lf"><div class="fsct">Scénarios de réhabilitation & Valorisation</div>${treat}</div>

    <!-- Références pleine largeur -->
    <div class="fsc fs-lf"><div class="fsct">Références bibliographiques</div>
        ${Array.isArray(mine.references) ? `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${mine.references.map(r=>`
              <div style="display:flex;gap:10px;padding:10px 12px;background:#f7f8fa;border-radius:8px;border-left:3px solid #1a7a45;">
                <span style="font-size:12pt;font-weight:800;color:#1a7a45;flex-shrink:0;min-width:28px;font-family:'Times New Roman',Times,serif;">${r.num}</span>
                <div style="flex:1;">
                  <div style="font-size:12pt;font-weight:600;color:#1a1f2e;margin-bottom:3px;font-family:'Times New Roman',Times,serif;">${r.auteurs} <span style="color:#718096;">(${r.annee})</span></div>
                  <div style="font-size:.84rem;color:#4a5568;font-style:italic;margin-bottom:3px;line-height:1.5;">${r.titre}</div>
                  <div style="font-size:.8rem;color:#1a56a8;font-weight:600;">${r.revue} <span style="color:#718096;font-weight:400;">${r.details}</span>
                    ${r.doi?`<a href="https://doi.org/${r.doi}" target="_blank" style="margin-left:6px;font-size:.75rem;background:#e8f4fd;color:#1a56a8;padding:2px 7px;border-radius:10px;text-decoration:none;border:1px solid #b8d8f0;">DOI ↗</a>`:""}
                    <span style="margin-left:6px;font-size:.7rem;background:${r.type==='article'?'#eafaf1':r.type==='conference'?'#fdf3e3':'#eef0f4'};color:${r.type==='article'?'#1a7a45':r.type==='conference'?'#b45309':'#4a5568'};padding:2px 7px;border-radius:10px;border:1px solid ${r.type==='article'?'#a8d5bc':r.type==='conference'?'#f0c070':'#dde1e8'};">${r.type==='article'?'Article':'conference'===r.type?'Conférence':'Chapitre'}</span>
                  </div>
                </div>
              </div>`).join("")}
          </div>
          ${mine.references_comp && mine.references_comp.length ? `
            <div style="margin-top:16px;">
              <div style="font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#718096;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #dde1e8;">Sources complémentaires</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${mine.references_comp.map(r=>`
                  <div style="display:flex;gap:8px;padding:8px 12px;background:#f7f8fa;border-radius:6px;border-left:2px solid #dde1e8;">
                    <div style="flex:1;">
                      <span style="font-size:.84rem;font-weight:600;color:#1a1f2e;">${r.auteurs} <span style="color:#718096;">(${r.annee})</span></span>
                      <span style="font-size:.82rem;color:#4a5568;font-style:italic;"> ${r.titre}</span>
                      <span style="font-size:.8rem;color:#1a56a8;font-weight:600;"> ${r.revue}</span>
                      <span style="font-size:.78rem;color:#718096;"> ${r.details}</span>
                      ${r.doi?`<a href="https://doi.org/${r.doi}" target="_blank" style="margin-left:4px;font-size:.72rem;background:#e8f4fd;color:#1a56a8;padding:1px 6px;border-radius:8px;text-decoration:none;">DOI ↗</a>`:""}
                    </div>
                  </div>`).join("")}
              </div>
            </div>` : ""}
        ` : `<p style="font-style:italic;color:#4a5568;font-size:.84rem;line-height:1.85;">${mine.references}</p>`}
      </div>
    </div>

    <span class="popup-dl" onclick="downloadMineData()">⬇ Télécharger la fiche (PDF)</span>
  `;
}

/* ════════════════════════════════════════════════
   7. LAYER TOGGLES
   ════════════════════════════════════════════════ */
document.getElementById("chk-active").addEventListener("change", function() {
  this.checked ? map.addLayer(layerActive) : map.removeLayer(layerActive);
});
document.getElementById("chk-inactive").addEventListener("change", function() {
  this.checked ? map.addLayer(layerInactive) : map.removeLayer(layerInactive);
});
/* domaines supprimés */

/* ════════════════════════════════════════════════
   8. SUBSTANCE FILTER
   ════════════════════════════════════════════════ */
document.getElementById("filter-sub").addEventListener("change", function() {
  const val = this.value.toLowerCase();
  markerIndex.forEach(({ mine, marker, grp }) => {
    const substances = [mine.main_substance, ...(mine.other_substances||[])].map(s=>s.toLowerCase());
    const show = !val || substances.some(s => s.includes(val));
    if (show) { if (!map.hasLayer(marker)) marker.addTo(grp); }
    else       { if (map.hasLayer(marker))  map.removeLayer(marker); }
  });
});

/* ════════════════════════════════════════════════
   9. COLLAPSIBLE GROUPS
   ════════════════════════════════════════════════ */
document.querySelectorAll(".lp-group-header").forEach(h => {
  h.addEventListener("click", () => {
    const body = document.getElementById(h.dataset.target);
    const chev = h.querySelector(".lp-chevron");
    const open = !body.classList.contains("hidden");
    body.classList.toggle("hidden", open);
    chev.classList.toggle("shut", open);
  });
});

/* ════════════════════════════════════════════════
   10. SEARCH
   ════════════════════════════════════════════════ */
const searchInput = document.getElementById("search-input");
const lpResults   = document.getElementById("lp-results");

/* Échappe les caractères HTML dangereux avant insertion dans le DOM */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { lpResults.hidden = true; return; }

  const hits = minesData.filter(m => [
    m.name, m.region, m.province,
    m.structural_domain, m.main_substance,
    ...(m.other_substances||[])
  ].join(" ").toLowerCase().includes(q));

  lpResults.hidden = false;
  if (!hits.length) {
    lpResults.innerHTML = `<div class="lp-no-result">Aucun résultat pour "${escapeHtml(q)}"</div>`;
    return;
  }

  lpResults.innerHTML = hits.map(m => {
    const st = STATUS[m.status] || STATUS.active;
    return `<div class="lp-result-item" data-id="${m.id}">
      <span class="lp-result-dot" style="background:${st.color}"></span>
      <div>
        <div class="lp-result-name">${m.name}</div>
        <div class="lp-result-sub">${m.main_substance} · ${m.structural_domain}</div>
      </div>
    </div>`;
  }).join("");

  lpResults.querySelectorAll(".lp-result-item").forEach(el => {
    el.addEventListener("click", () => {
      const mine = minesData.find(m => m.id === +el.dataset.id);
      if (!mine) return;
      /* On se contente de survoler le site : la fiche ne s'ouvre qu'au clic sur le marqueur */
      map.flyTo([mine.latitude, mine.longitude], 13, { duration: 1.2 });
      lpResults.hidden = true;
      searchInput.value = "";
    });
  });
}

searchInput.addEventListener("input", doSearch);
document.getElementById("search-btn").addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
document.addEventListener("click", e => {
  if (!e.target.closest(".left-panel")) lpResults.hidden = true;
});

/* ════════════════════════════════════════════════
   11. FIX LEAFLET SIZE
   Force Leaflet à recalculer la taille après le rendu
   ════════════════════════════════════════════════ */
setTimeout(() => map.invalidateSize(), 100);
window.addEventListener("resize", () => map.invalidateSize());

/* ── Modal À propos ── */
document.getElementById("btn-about").addEventListener("click", () => {
  document.getElementById("about-overlay").classList.add("open");
});
function closeAbout() {
  document.getElementById("about-overlay").classList.remove("open");
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAbout();
});

/* ── Lightbox galerie ── */
let _lbImages = [];
let _lbIndex  = 0;

function openLightbox(images, index) {
  _lbImages = images;
  _lbIndex  = index;
  _renderLightbox();
  document.getElementById("lightbox").classList.add("open");
  document.addEventListener("keydown", _lbKey);
}
function _renderLightbox() {
  const img = _lbImages[_lbIndex];
  document.getElementById("lb-img").src       = img.src;
  document.getElementById("lb-caption").textContent = img.label;
  document.getElementById("lb-sub").textContent     = img.sub || "";
  document.getElementById("lb-counter").textContent =
    (_lbIndex + 1) + " / " + _lbImages.length;
}
function closeLightbox(e) {
  if (e && e.target !== document.getElementById("lightbox")) return;
  _closeLb();
}
function closeLightboxBtn() { _closeLb(); }
function _closeLb() {
  document.getElementById("lightbox").classList.remove("open");
  document.removeEventListener("keydown", _lbKey);
}
function lightboxNav(dir, e) {
  e.stopPropagation();
  _lbIndex = (_lbIndex + dir + _lbImages.length) % _lbImages.length;
  _renderLightbox();
}
function _lbKey(e) {
  if (e.key === "ArrowRight") lightboxNav(+1, e);
  if (e.key === "ArrowLeft")  lightboxNav(-1, e);
  if (e.key === "Escape")     _closeLb();
}
/* PDF_EXPORT_V2 */
