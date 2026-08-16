/* ============ DATA MODEL ============ */
const ROOMS = [
  {id:'decurtis',   name:'DE CURTIS',  color:'#5B6EF5'},
  {id:'sordi',      name:'SORDI',      color:'#43C89A'},
  {id:'bergman',    name:'BERGMAN',    color:'#C77DF2'},
  {id:'virnalisi',  name:'VIRNA LISI', color:'#4FD8D8'},
  {id:'desica',     name:'DE SICA',    color:'#F2C94C'},
  {id:'mastroianni',name:'MASTROIANNI',color:'#F4685A'},
];
// Sala "fantasma": non è una sala vera, è un contenitore per la prevendita.
// Compare in fondo alla stampa A5 e allo sfondo mobile SOLO se ha film dentro,
// e nel banner pubblico finisce sempre nel box speciale evidenziato invece che in tabella.
const PREVENDITA_ROOM = {id:'prevendita', name:'PREVENDITA', color:'#C0C0C8'};
const ROOMS_STAMPA = [...ROOMS, PREVENDITA_ROOM]; // ordine di stampa: le 6 sale + prevendita in fondo

const DEFAULT_DATA = {
  decurtis: [
    {film:'SpiderMan Brand New Day', times:'16:45 - 19:30 - 22:15', intero:'10,5', ridotto:'-', abb:'N'}
  ],
  sordi: [
    {film:'SpiderMan Brand New Day', times:'18:15 - 21:00', intero:'10,5', ridotto:'-', abb:'N'}
  ],
  bergman: [
    {film:'Odissea', times:'18:00 - 21:15', intero:'10,5', ridotto:'9,5', abb:'N'}
  ],
  virnalisi: [
    {film:'Odissea', times:'20:30', intero:'10,5', ridotto:'-', abb:'N'}
  ],
  desica: [
    {film:'Minions', times:'17:30', intero:'8,5', ridotto:'7,5', abb:'S'},
    {film:'Odissea', times:'19:15', intero:'9', ridotto:'-', abb:'N'},
    {film:'Deep Water', times:'22:15', intero:'3,5', ridotto:'', abb:'N'},
  ],
  mastroianni: [
    {film:'Toy Story', times:'17:30', intero:'8.5', ridotto:'7.5', abb:'S'},
    {film:'Odissea', times:'19:15', intero:'9', ridotto:'', abb:'N'},
    {film:'Deep Water', times:'22:15', intero:'3,5', ridotto:'', abb:'N'},
  ],
  prevendita: [], // vuota di default: non compare finché non la riempi
};

let data = loadData();

function loadData(){
  const saved = localStorage.getItem('programmazione-data');
  if(saved){ try{ return JSON.parse(saved); }catch(e){} }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function saveData(){
  localStorage.setItem('programmazione-data', JSON.stringify(data));
}

/* ============ TABS ============ */
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    renderAll();
    if(btn.dataset.tab==='print'){ requestAnimationFrame(()=>fitAllFrameZones('print')); }
    if(btn.dataset.tab==='mobile'){ requestAnimationFrame(()=>fitAllFrameZones('mobile')); }
    if(btn.dataset.tab==='banner'){ requestAnimationFrame(()=>fitZone('banner-zone')); }
  });
});

/* ============ EDITOR RENDER ============ */
function renderEditor(){
  const wrap = document.getElementById('rooms-editor');
  wrap.innerHTML = '';
  ROOMS_STAMPA.forEach(room=>{
    const box = document.createElement('div');
    box.className = 'room-editor';
    const header = document.createElement('div');
    header.className = 'room-band room-header';
    header.style.background = room.color;
    header.textContent = room.name;
    box.appendChild(header);

    if(room.id === 'prevendita'){
      const note = document.createElement('div');
      note.style.cssText = 'padding:8px 16px;font-size:12px;color:var(--ivory-dim);border-bottom:1px dashed var(--line);';
      note.textContent = 'Non è una sala vera: usala per i film in prevendita. Compare solo se la riempi — in fondo alla stampa A5 e allo sfondo mobile, e nel box speciale evidenziato del banner pubblico (non nella tabella).';
      box.appendChild(note);
    }

    const list = document.createElement('div');
    list.className = 'screenings';
    (data[room.id] || []).forEach((s, idx)=>{
      list.appendChild(screeningRow(room.id, s, idx));
    });
    box.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = '+ Aggiungi film';
    addBtn.onclick = ()=>{
      data[room.id] = data[room.id] || [];
      data[room.id].push({film:'', times:'', intero:'', ridotto:'', abb:'N'});
      saveData(); renderEditor();
    };
    box.appendChild(addBtn);
    wrap.appendChild(box);
  });
}

function screeningRow(roomId, s, idx){
  const row = document.createElement('div');
  row.className = 'screening-row';
  const dataInizioField = roomId === 'prevendita' ? `
    <div>
      <span class="field-label">Data inizio (facoltativo — es. "dal 19 agosto". Compare accanto al titolo nel banner)</span>
      <input type="text" value="${escAttr(s.dataInizio||'')}" data-field="dataInizio" placeholder="es. dal 19 agosto">
    </div>` : '';
  row.innerHTML = `
    <div>
      <span class="field-label">Film</span>
      <input type="text" value="${escAttr(s.film)}" data-field="film">
    </div>
    <div>
      <span class="field-label">Orari (es. 17:30 - 20:00)</span>
      <input type="text" value="${escAttr(s.times)}" data-field="times">
    </div>
    <div>
      <span class="field-label">Versione (facoltativo — es. OV, 3D. Lascia vuoto se è solo copertura interna in un'altra sala)</span>
      <input type="text" value="${escAttr(s.versione||'')}" data-field="versione" placeholder="es. OV, 3D">
    </div>
    <div>
      <span class="field-label">Sezione promo (facoltativo — es. CineRevolution, Cinema in Festa. Se compilato, nel banner pubblico il film comparirà raggruppato sotto quell'etichetta SENZA mostrare il prezzo)</span>
      <input type="text" value="${escAttr(s.sezionePromo||'')}" data-field="sezionePromo" placeholder="es. CineRevolution">
    </div>
    ${dataInizioField}
    <div class="price-grid">
      <div><span class="field-label">Intero</span><input type="text" value="${escAttr(s.intero)}" data-field="intero"></div>
      <div><span class="field-label">Ridotto</span><input type="text" value="${escAttr(s.ridotto)}" data-field="ridotto"></div>
      <div><span class="field-label">Abb.</span>
        <select data-field="abb">
          <option value="N" ${s.abb==='N'?'selected':''}>N</option>
          <option value="S" ${s.abb==='S'?'selected':''}>S</option>
        </select>
      </div>
    </div>
    <div class="row-actions"><button class="btn-remove">Rimuovi</button></div>
  `;
  row.querySelectorAll('input,select').forEach(el=>{
    el.addEventListener('input', ()=>{
      data[roomId][idx][el.dataset.field] = el.value;
      saveData();
    });
  });
  row.querySelector('.btn-remove').addEventListener('click', ()=>{
    data[roomId].splice(idx,1);
    saveData(); renderEditor();
  });
  return row;
}

function escAttr(str){ return (str||'').replace(/"/g,'&quot;'); }

/* ============ PRINT SHEET RENDER ============ */
/* ============ PRINT SHEET RENDER (sfondo immagine + zone di testo) ============ */
// Coordinate delle 6 zone bianche in print-frame.png (1410x2001), in percentuale.
const FRAME_ZONES = [
  {id:'decurtis',    top:7.10,  left:10.07, width:88.51, height:13.54},
  {id:'sordi',       top:22.04, left:10.07, width:88.51, height:13.54},
  {id:'bergman',     top:36.93, left:10.07, width:88.51, height:13.59},
  {id:'virnalisi',   top:51.92, left:10.07, width:88.51, height:13.54},
  {id:'desica',      top:66.87, left:10.07, width:88.51, height:13.54},
  {id:'mastroianni', top:81.76, left:10.07, width:88.51, height:13.54},
];

function frameZonesHTML(prefix, showPrices){
  return FRAME_ZONES.map(zone=>{
    const room = ROOMS.find(r=>r.id===zone.id);
    if(!room) return '';
    const screenings = data[room.id] || [];
    if(screenings.length===0){
      return `<div class="frame-room-zone" id="${prefix}-zone-${zone.id}"
        style="left:${zone.left}%;top:${zone.top}%;width:${zone.width}%;height:${zone.height}%;"></div>`;
    }

    const uniquePrices = new Set(screenings.map(s=>`${s.intero}|${s.ridotto}|${s.abb}`));
    const showSharedPrice = showPrices && uniquePrices.size === 1;
    const showPerFilmPrice = showPrices && !showSharedPrice;

    const rows = screenings.map(s=>{
      const timesSet = new Set();
      s.times.split('-').map(t=>t.trim()).filter(Boolean).forEach(t=>timesSet.add(t));
      const sortedTimes = sortTimesChronologically(timesSet);
      const pills = sortedTimes.map(t=>`<span class="frame-pill" style="background:${room.color}">${escHtml(t)}</span>`).join('');
      return `<div class="frame-film-row">
        <span class="frame-film-title">${escHtml(s.film)}</span>
        <span class="frame-pills">${pills}</span>
      </div>`;
    }).join('');

    const first = screenings[0];
    let priceHTML = '';
    if(showSharedPrice){
      const ridottoClean = (first.ridotto||'').trim();
      const hasRidotto = ridottoClean && ridottoClean !== '-';
      const ridottoBlock = hasRidotto ? `
        <div class="fp-divider"></div>
        <div><div class="fp-label">Ridotto</div><div class="fp-value">€${ridottoClean}</div></div>` : '';
      priceHTML = `<div class="frame-price-panel" style="background:${lightenColor(room.color, 0.85)};">
        <div><div class="fp-label">Intero</div><div class="fp-value">€${first.intero||'-'}</div></div>
        ${ridottoBlock}
        <div class="fp-divider"></div>
        <div><div class="fp-label">Abb.</div><div class="fp-value">${first.abb||'N'}</div></div>
      </div>`;
    }else if(showPerFilmPrice){
      const miniRows = screenings.map(s=>{
        const ridottoClean = (s.ridotto||'').trim();
        const hasRidotto = ridottoClean && ridottoClean !== '-';
        const ridottoLine = hasRidotto ? `<div class="fp-mini-line"><span class="fp-mini-label">Rid.</span><span class="fp-mini-value">€${ridottoClean}</span></div>` : '';
        return `<div class="fp-mini-row">
          <div class="fp-mini-line"><span class="fp-mini-label">Int.</span><span class="fp-mini-value">€${s.intero||'-'}</span></div>
          ${ridottoLine}
          <div class="fp-mini-line"><span class="fp-mini-label">Abb.</span><span class="fp-mini-value">${s.abb||'N'}</span></div>
        </div>`;
      }).join('');
      priceHTML = `<div class="frame-price-panel frame-price-panel-multi" style="background:${lightenColor(room.color, 0.85)};">${miniRows}</div>`;
    }

    return `<div class="frame-room-zone" id="${prefix}-zone-${zone.id}"
      style="left:${zone.left}%;top:${zone.top}%;width:${zone.width}%;height:${zone.height}%;">
      <div class="frame-content-row">
        <div class="frame-film-list${showPerFilmPrice ? ' spaced' : ''}">${rows}</div>
        ${priceHTML}
      </div>
    </div>`;
  }).join('');
}

function fitFrameZone(id){
  const zone = document.getElementById(id);
  if(!zone) return;
  if(zone.clientHeight === 0) return; // pannello non visibile, salta
  zone.style.setProperty('--fz', 1);
  let s = 1;
  for(let i=0; i<10; i++){
    const naturalH = zone.scrollHeight;
    const availH = zone.clientHeight;
    const naturalW = zone.scrollWidth;
    const availW = zone.clientWidth;
    const ratio = Math.min(availH/naturalH, availW/naturalW, 1);
    if(ratio >= 0.97) break;
    s = Math.max(0.4, s * ratio * 0.97);
    zone.style.setProperty('--fz', s);
  }
}

function fitAllFrameZones(prefix){
  FRAME_ZONES.forEach(z=>fitFrameZone(`${prefix}-zone-${z.id}`));
}

function renderPrintSheet(){
  const el = document.getElementById('sheet-print');
  el.innerHTML = `
    <img src="print-frame.png" alt="Programmazione" class="print-frame-bg" onerror="this.style.opacity='0';">
    ${frameZonesHTML('print', true)}`;
  fitAllFrameZones('print');
}

function renderMobileSheet(){
  const el = document.getElementById('sheet-mobile');
  el.innerHTML = `
    <div class="mobile-safe-top"></div>
    <div class="mobile-content-group">
      <div class="mobile-frame-wrap">
        <img src="print-frame.png" alt="Programmazione" class="print-frame-bg" onerror="this.style.opacity='0';">
        ${frameZonesHTML('mobile', false)}
      </div>
      <div class="mobile-brand">
        <img src="logo-lumiere.png" alt="Logo Cinema Lumière" onerror="this.style.display='none';">
        <div class="brand-text">Multisala Lumière</div>
      </div>
    </div>
    <div class="mobile-safe-bottom"></div>`;
  fitAllFrameZones('mobile');
  // Le immagini si caricano in modo asincrono: ricalcoliamo dopo che sono pronte
  // per evitare che il layout si sposti e tagli l'ultima riga.
  const imgs = el.querySelectorAll('img');
  let toLoad = imgs.length;
  if(toLoad > 0){
    imgs.forEach(img=>{
      if(img.complete){ toLoad--; }
      else{
        img.addEventListener('load', ()=>{ toLoad--; if(toLoad<=0) fitAllFrameZones('mobile'); });
        img.addEventListener('error', ()=>{ toLoad--; if(toLoad<=0) fitAllFrameZones('mobile'); });
      }
    });
    if(toLoad<=0) fitAllFrameZones('mobile');
  }
}

/* ============ BANNER RENDER ============ */
/* ============ BANNER RENDER (sfondo immagine + overlay testo) ============ */
/* ============ BANNER RENDER (sfondo immagine + un'unica zona di testo) ============ */
/* ============ BANNER RENDER (sfondo immagine + zona data + zona contenuto) ============ */
function renderBannerSheet(){
  const showSala = document.getElementById('toggle-sala').checked;
  const showPrezzo = document.getElementById('toggle-prezzo').checked;
  const el = document.getElementById('sheet-banner');

  // Raggruppa per film+versione+sezionePromo, unendo gli orari da tutte le sale
  let filmMap = new Map();
  ROOMS.forEach(room=>{
    (data[room.id]||[]).forEach(s=>{
      if(!s.film) return;
      const sezione = (s.sezionePromo||'').trim();
      const key = (s.film.trim().toLowerCase())+'|'+((s.versione||'').trim().toLowerCase())+'|'+sezione.toLowerCase();
      if(!filmMap.has(key)){
        filmMap.set(key, {film:s.film.trim(), versione:(s.versione||'').trim(), sezionePromo:sezione, times:new Set(), rooms:new Set()});
      }
      const entry = filmMap.get(key);
      entry.rooms.add(room.name);
      s.times.split('-').map(t=>t.trim()).filter(Boolean).forEach(t=>entry.times.add(t));
    });
  });
  let entries = Array.from(filmMap.values());
  const normali = entries.filter(e=>!e.sezionePromo);
  const cinerevolution = entries.filter(e=>e.sezionePromo);

  function rowHTML(entry){
    const sortedTimes = sortTimesChronologically(entry.times).join(' - ');
    const versionTag = entry.versione ? ` (${escHtml(entry.versione)})` : '';
    const salaTag = showSala ? ' — ' + Array.from(entry.rooms).join(', ') : '';
    const priceCell = showPrezzo ? `<div class="zf-cell"><span class="zf-price">${pricesForFilm(entry)}</span></div>` : '';
    return `<div class="zone-row${showPrezzo ? ' with-price' : ''}">
      <div class="zf-cell"><span class="zf-title">${escHtml(entry.film)}${versionTag}${salaTag}</span></div>
      <div class="zf-cell"><span class="zf-times">${escHtml(sortedTimes)}</span></div>
      ${priceCell}
    </div>`;
  }

  let contentHTML = normali.map(rowHTML).join('');

  if(cinerevolution.length){
    contentHTML += `<div class="promo-section-bar">★ CINEREVOLUTION ★</div>` + cinerevolution.map(rowHTML).join('');
  }

  // ---- Sezione PREVENDITE: dalla sala fantasma "prevendita", raggruppata per film ----
  const badgeColors = ['#2E7D32','#1B3A6B','#8B2E2E','#6A3E9E','#B5651D'];
  const prevenditaScreenings = (data['prevendita']||[]).filter(s=>s.film);
  if(prevenditaScreenings.length){
    const byFilm = new Map();
    prevenditaScreenings.forEach(s=>{
      if(!byFilm.has(s.film)) byFilm.set(s.film, []);
      byFilm.get(s.film).push(s);
    });
    contentHTML += `<div class="prevendite-bar">★ PREVENDITE ★</div>`;
    contentHTML += Array.from(byFilm.entries()).map(([film, list])=>{
      return list.map((s,i)=>{
        const color = badgeColors[i % badgeColors.length];
        const badgeHTML = s.versione ? `<span class="prevendite-badge" style="background:${color}">${escHtml(s.versione.toUpperCase())}</span>` : '';
        const times = new Set();
        s.times.split('-').map(t=>t.trim()).filter(Boolean).forEach(t=>times.add(t));
        const sortedTimes = sortTimesChronologically(times).join(' - ');
        const dataInizio = (s.dataInizio||'').trim();
        const dataInizioTag = dataInizio ? ` <span class="prevendite-data">(${escHtml(dataInizio)})</span>` : '';
        return `<div class="prevendite-mini-row">
          ${badgeHTML}
          <span class="prevendite-film">${escHtml(film)}${dataInizioTag}</span>
          <span class="prevendite-times">${escHtml(sortedTimes)}</span>
        </div>`;
      }).join('');
    }).join('');
  }

  el.innerHTML = `
    <img src="banner-color.png" alt="Cinema Multisala Lumière" class="frame-bg" onerror="this.style.opacity='0';">
    <div class="banner-date-zone"><span>${bannerHeadline()}</span></div>
    <div class="banner-zone" id="banner-zone">${contentHTML}</div>
  `;

  fitZone('banner-zone');
}

function bannerHeadline(){
  const d = new Date();
  const giorni = ['DOMENICA','LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO'];
  return 'DA ' + giorni[d.getDay()];
}

// Rimpicciolisce O ingrandisce il contenuto per riempire il più possibile lo spazio
// disponibile, senza mai uscire dai bordi (le colonne fisse 50/50 impediscono
// il traboccamento orizzontale, quindi crescere è sicuro).
function fitZone(id){
  const zone = document.getElementById(id);
  if(!zone) return;
  if(zone.clientHeight === 0) return; // pannello non visibile, salta
  zone.style.setProperty('--zs', 1);
  zone.style.setProperty('--zg', 1);
  let s = 1;
  for(let i=0; i<12; i++){
    const naturalH = zone.scrollHeight;
    const availH = zone.clientHeight;
    const naturalW = zone.scrollWidth;
    const availW = zone.clientWidth;
    const hRatio = availH / naturalH;
    const wRatio = availW / naturalW;
    const ratio = Math.min(hRatio, wRatio);
    if(Math.abs(ratio - 1) < 0.03) break;
    s = Math.max(0.35, Math.min(2.5, s * ratio * 0.97));
    zone.style.setProperty('--zs', s);
  }
  // Fase 2: se una riga larga (es. tanti orari) ha impedito al testo di crescere
  // abbastanza da riempire l'altezza, allarghiamo lo spazio TRA le righe (non il
  // font) per non lasciare vuoto in fondo alla tessera.
  let g = 1;
  for(let i=0; i<8; i++){
    const naturalH = zone.scrollHeight;
    const availH = zone.clientHeight;
    if(naturalH >= availH * 0.97) break;
    const ratio = availH / naturalH;
    g = Math.min(4, g * Math.min(ratio, 1.3));
    zone.style.setProperty('--zg', g);
  }
}




function sortTimesChronologically(timesSet){
  return Array.from(timesSet).sort((a,b)=>{
    const toMinutes = t=>{
      const m = t.match(/(\d{1,2})[:.](\d{2})/);
      if(!m) return 0;
      return parseInt(m[1],10)*60 + parseInt(m[2],10);
    };
    return toMinutes(a) - toMinutes(b);
  });
}

// html2canvas non supporta bene color-mix() del CSS moderno: calcoliamo il colore chiaro a mano
function lightenColor(hex, whiteAmount){
  hex = hex.replace('#','');
  const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
  const mix = c => Math.round(c + (255-c)*whiteAmount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function roomColorByName(name){
  const r = ROOMS.find(r=>r.name===name);
  return r ? r.color : '#888';
}

function pricesForFilm(entry){
  // Recupera intero/ridotto da tutte le proiezioni di quel film+versione, e se coincidono mostra un solo valore
  const interi = new Set(), ridotti = new Set();
  ROOMS.forEach(room=>{
    (data[room.id]||[]).forEach(s=>{
      if(!s.film) return;
      const key = (s.film.trim().toLowerCase())+'|'+((s.versione||'').trim().toLowerCase());
      const entryKey = (entry.film.trim().toLowerCase())+'|'+(entry.versione.trim().toLowerCase());
      if(key===entryKey){
        if(s.intero) interi.add(s.intero.trim());
        const rid = (s.ridotto||'').trim();
        if(rid && rid !== '-') ridotti.add(rid);
      }
    });
  });
  const interoStr = interi.size ? Array.from(interi).join('/') : '-';
  const ridottoPart = ridotti.size ? ` · Ridotto ${Array.from(ridotti).join('/')}` : '';
  return `Intero ${interoStr}${ridottoPart}`;
}

function escHtml(str){
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function todayStr(){
  const d = new Date();
  return d.toLocaleDateString('it-IT');
}

function renderAll(){
  renderEditor();
  renderPrintSheet();
  renderMobileSheet();
  renderBannerSheet();
}

document.getElementById('toggle-sala').addEventListener('change', renderBannerSheet);
document.getElementById('toggle-prezzo').addEventListener('change', renderBannerSheet);

/* ============ EXPORT ============ */
async function exportPNG(elId, filename, format='png'){
  // Apriamo subito la scheda, nello stesso istante del tap: iOS Safari blocca
  // le aperture "in differita" dopo un'operazione asincrona come html2canvas.
  const win = window.open('', '_blank');
  try{
    if(elId==='sheet-banner'){ fitZone('banner-zone'); }
    if(elId==='sheet-mobile'){ fitAllFrameZones('mobile'); }
    const node = document.getElementById(elId);
    // Aspettiamo che tutte le immagini (logo ecc.) siano caricate, altrimenti il layout
    // può spostarsi dopo la cattura e tagliare l'ultima riga.
    const imgsToWait = Array.from(node.querySelectorAll('img')).filter(img=>!img.complete);
    if(imgsToWait.length){
      await Promise.all(imgsToWait.map(img=>new Promise(res=>{
        img.addEventListener('load', res); img.addEventListener('error', res);
      })));
      if(elId==='sheet-banner'){ fitZone('banner-zone'); }
      if(elId==='sheet-mobile'){ fitAllFrameZones('mobile'); }
    }
    const bg = elId==='sheet-banner' ? '#FFFFFF' : '#141212';
    // Per lo sfondo mobile puntiamo alla risoluzione esatta richiesta (2213×4798px)
    // invece di un fattore di scala fisso, così il file combacia sempre con quella misura.
    const scale = elId==='sheet-mobile' ? (2213 / node.offsetWidth) : 3;
    const canvas = await html2canvas(node, {backgroundColor:bg, scale});
    // Usiamo un Blob invece di un data-URL: un PNG/JPEG in alta qualità genera un
    // URL troppo lungo che Safari su iOS a volte rifiuta di aprire in silenzio.
    const mime = format==='jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format==='jpeg' ? 0.92 : undefined;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
    if(win && blob){
      const blobUrl = URL.createObjectURL(blob);
      win.location.href = blobUrl;
      // Su Chrome desktop, aprire un blob JPEG senza nome file lo fa salvare
      // come .jfif invece di .jpg: forziamo il nome corretto con un link "download"
      // in parallelo. Su iOS questo passaggio in genere non fa nulla (nessun danno),
      // e la scheda già aperta resta comunque disponibile per il salvataggio manuale.
      const ext = format==='jpeg' ? 'jpg' : 'png';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }else if(win){
      win.close();
      alert('Errore nella generazione dell\'immagine. Riprova.');
    }else{
      alert('Il browser ha bloccato l\'apertura automatica. Consenti i popup per questo sito nelle impostazioni di Safari e riprova.');
    }
  }catch(err){
    if(win) win.close();
    alert('Errore durante la generazione: ' + err.message);
    console.error(err);
  }
}

async function exportPDF(){
  const win = window.open('', '_blank');
  try{
    fitAllFrameZones('print');
    const node = document.getElementById('sheet-print');
    const imgsToWait = Array.from(node.querySelectorAll('img')).filter(img=>!img.complete);
    if(imgsToWait.length){
      await Promise.all(imgsToWait.map(img=>new Promise(res=>{
        img.addEventListener('load', res); img.addEventListener('error', res);
      })));
      fitAllFrameZones('print');
    }
    const canvas = await html2canvas(node, {backgroundColor:'#141212', scale:3});
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({unit:'mm', format:'a5', orientation:'portrait'});
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    const blobUrl = pdf.output('bloburl');
    if(win){
      win.location.href = blobUrl;
    }else{
      alert('Il browser ha bloccato l\'apertura automatica. Consenti i popup per questo sito nelle impostazioni di Safari e riprova.');
    }
  }catch(err){
    if(win) win.close();
    alert('Errore durante la generazione: ' + err.message);
    console.error(err);
  }
}

async function exportPDFBanner(){
  const win = window.open('', '_blank');
  const frameImg = document.querySelector('#sheet-banner .frame-bg');
  const originalSrc = frameImg ? frameImg.getAttribute('src') : null;
  try{
    fitZone('banner-zone');
    const node = document.getElementById('sheet-banner');

    // Per il PDF (stampa) usiamo la cornice in bianco e nero; il PNG (monitor) resta a colori.
    if(frameImg){
      await new Promise((resolve, reject)=>{
        frameImg.onload = resolve;
        frameImg.onerror = reject;
        frameImg.src = 'banner-bw.png';
      });
    }

    const canvas = await html2canvas(node, {backgroundColor:'#FFFFFF', scale:3});
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    // La cornice ha un rapporto (1513:1039) leggermente diverso dall'A4 standard:
    // usiamo una pagina larga come un A4 orizzontale ma alta il giusto per non deformare l'immagine.
    const ratio = 1513/1039;
    const pageW = 297;
    const pageH = pageW / ratio;
    const pdf = new jsPDF({unit:'mm', format:[pageW, pageH], orientation:'landscape'});
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    const blobUrl = pdf.output('bloburl');
    if(win){
      win.location.href = blobUrl;
    }else{
      alert('Il browser ha bloccato l\'apertura automatica. Consenti i popup per questo sito nelle impostazioni di Safari e riprova.');
    }
  }catch(err){
    if(win) win.close();
    alert('Errore durante la generazione: ' + err.message);
    console.error(err);
  }finally{
    // Ripristiniamo sempre la cornice a colori nell'anteprima, qualunque cosa succeda
    if(frameImg && originalSrc){ frameImg.src = originalSrc; }
  }
}

renderAll();
