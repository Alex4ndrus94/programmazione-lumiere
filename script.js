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
    {film:'SpiderMan Brand New Day', times:'16:45 - 19:30 - 22:15', intervallo:'', mostraIntervallo:true, intero:'10,5', ridotto:'-', abb:'N'}
  ],
  sordi: [
    {film:'SpiderMan Brand New Day', times:'18:15 - 21:00', intervallo:'', mostraIntervallo:true, intero:'10,5', ridotto:'-', abb:'N'}
  ],
  bergman: [
    {film:'Odissea', times:'18:00 - 21:15', intervallo:'', mostraIntervallo:true, intero:'10,5', ridotto:'9,5', abb:'N'}
  ],
  virnalisi: [
    {film:'Odissea', times:'20:30', intervallo:'', mostraIntervallo:true, intero:'10,5', ridotto:'-', abb:'N'}
  ],
  desica: [
    {film:'Minions', times:'17:30', intervallo:'', mostraIntervallo:true, intero:'8,5', ridotto:'7,5', abb:'S'},
    {film:'Odissea', times:'19:15', intervallo:'', mostraIntervallo:true, intero:'9', ridotto:'-', abb:'N'},
    {film:'Deep Water', times:'22:15', intervallo:'', mostraIntervallo:true, intero:'3,5', ridotto:'', abb:'N'},
  ],
  mastroianni: [
    {film:'Toy Story', times:'17:30', intervallo:'', mostraIntervallo:true, intero:'8.5', ridotto:'7.5', abb:'S'},
    {film:'Odissea', times:'19:15', intero:'9', ridotto:'', abb:'N'},
    {film:'Deep Water', times:'22:15', intervallo:'', mostraIntervallo:true, intero:'3,5', ridotto:'', abb:'N'},
  ],
  prevendita: [], // vuota di default: non compare finché non la riempi
};

const INTERVALLO_OPTIONS = ['', '3 min','5 min','7 min','10 min','15 min','Diretto'];
const DEFAULT_INTERVALLO = '5 min';
const DEFAULT_MOSTRA_INTERVALLO = true;

function normalizeScreeningInterval(screening){
  if(!screening || typeof screening !== 'object') return screening;
  // Il campo è facoltativo: vuoto/assente significa lo standard di 5 minuti.
  if(screening.intervallo === undefined || screening.intervallo === null || screening.intervallo === ''){
    screening.intervallo = '';
  } else if(!INTERVALLO_OPTIONS.includes(screening.intervallo)){
    screening.intervallo = DEFAULT_INTERVALLO;
  }
  // Le proiezioni precedenti non hanno il flag: per compatibilità restano visibili.
  if(typeof screening.mostraIntervallo !== 'boolean'){
    screening.mostraIntervallo = DEFAULT_MOSTRA_INTERVALLO;
  }
  return screening;
}

function normalizeAllIntervals(source){
  Object.keys(source || {}).forEach(roomId=>{
    if(!Array.isArray(source[roomId])) return;
    source[roomId].forEach(normalizeScreeningInterval);
  });
  return source;
}

// ---- Firebase: fonte dati condivisa fra tutti i dispositivi ----
// NB: databaseURL da completare non appena disponibile dalla console Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAyQSVrMfEgws_yca7f8Lo_HTysszmhsqU",
  authDomain: "programmazione-lumiere.firebaseapp.com",
  databaseURL: "https://programmazione-lumiere-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "programmazione-lumiere",
  storageBucket: "programmazione-lumiere.firebasestorage.app",
  messagingSenderId: "145340126224",
  appId: "1:145340126224:web:12fc08064b27da3448a695"
};
let fbRef = null;
try{
  firebase.initializeApp(firebaseConfig);
  fbRef = firebase.database().ref('programmazione');
}catch(e){ console.error('Firebase non disponibile, uso solo il salvataggio locale.', e); }

let data = JSON.parse(JSON.stringify(DEFAULT_DATA)); // valore iniziale, sostituito appena Firebase risponde
let saveTimeout = null;

function loadDataLocalFallback(){
  const saved = localStorage.getItem('programmazione-data');
  if(saved){ try{ return normalizeAllIntervals(JSON.parse(saved)); }catch(e){} }
  return normalizeAllIntervals(JSON.parse(JSON.stringify(DEFAULT_DATA)));
}

async function initData(){
  if(!fbRef){ data = loadDataLocalFallback(); renderAll(); return; }
  try{
    const snapshot = await fbRef.once('value');
    if(snapshot.exists()){
      data = normalizeAllIntervals(snapshot.val());
    }else{
      // Primo avvio in assoluto: nessun dato condiviso ancora presente, carichiamo quello di default
      data = loadDataLocalFallback();
      await fbRef.set(data);
    }
  }catch(e){
    console.error('Errore nel caricare da Firebase, uso la copia locale come riserva.', e);
    data = loadDataLocalFallback();
  }
  renderAll();
}

function saveData(){
  // Copia locale immediata come riserva se manca la connessione
  localStorage.setItem('programmazione-data', JSON.stringify(data));
  if(!fbRef) return;
  // Raggruppiamo i salvataggi (es. mentre si digita) invece di scrivere ad ogni carattere
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(()=>{
    fbRef.set(data).catch(e=>console.error('Errore nel salvare su Firebase:', e));
  }, 500);
}

/* ============ TABS ============ */
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    renderAll();
    if(btn.dataset.tab==='print'){ requestAnimationFrame(()=>fitAllCells('print')); }
    if(btn.dataset.tab==='mobile'){ requestAnimationFrame(()=>fitAllCells('mobile')); }
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
      data[room.id].push({film:'', times:'', versione:'', sezionePromo:'', intervallo:'', mostraIntervallo:DEFAULT_MOSTRA_INTERVALLO, intero:'', ridotto:'', abb:'N'});
      saveData(); renderEditor();
    };
    box.appendChild(addBtn);
    wrap.appendChild(box);
  });
}

// Genera gli scaglioni di prezzo da min a max ogni 0,50€, formattati con la virgola (es. "3,50")
function priceOptionsRange(min, max, step){
  const opts = [];
  for(let v = min; v <= max + 0.001; v += step){
    opts.push(v.toFixed(2).replace('.', ','));
  }
  return opts;
}
const INTERO_OPTIONS = priceOptionsRange(3.5, 35, 0.5);
const RIDOTTO_OPTIONS = priceOptionsRange(5, 33, 0.5);

// Normalizza per confrontare valori scritti in modo diverso (es. "10,5" e "10,50" sono lo stesso prezzo)
function normalizePrice(str){
  const n = parseFloat((str||'').replace(',', '.'));
  if(isNaN(n)) return null;
  return n.toFixed(2).replace('.', ',');
}

// Formato compatto per gli spazi stretti: niente simbolo €, e niente zero finale
// inutile (es. "9,50" -> "9,5", "8,00" -> "8"), coerente con come scrivevi già i prezzi prima.
function formatPriceShort(str){
  const n = parseFloat((str||'').replace(',', '.'));
  if(isNaN(n)) return '-';
  let out = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0$/, '');
  return out.replace('.', ',');
}

function priceSelectHTML(fieldName, currentValue, options, allowEmpty){
  const normalizedCurrent = normalizePrice(currentValue);
  let optionsHTML = allowEmpty ? `<option value="" ${!currentValue?'selected':''}>—</option>` : '';
  let matched = !currentValue;
  options.forEach(opt=>{
    const isSelected = normalizedCurrent === normalizePrice(opt);
    if(isSelected) matched = true;
    optionsHTML += `<option value="${opt}" ${isSelected?'selected':''}>€ ${opt}</option>`;
  });
  // Se il valore salvato non combacia con nessuno scaglione standard (es. inserito manualmente prima),
  // lo aggiungiamo come opzione extra così non si perde il dato.
  if(!matched && currentValue){
    optionsHTML += `<option value="${escAttr(currentValue)}" selected>€ ${escHtml(currentValue)} (personalizzato)</option>`;
  }
  return `<select data-field="${fieldName}">${optionsHTML}</select>`;
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
    <div>
      <span class="field-label">Intervallo (facoltativo — se lasciato vuoto vale 5 min)</span>
      <select data-field="intervallo">
        <option value="" ${(s.intervallo||'')===''?'selected':''}>Standard — 5 min</option>
        ${INTERVALLO_OPTIONS.filter(Boolean).map(option=>`<option value="${option}" ${s.intervallo===option?'selected':''}>${option}</option>`).join('')}
      </select>
      <label class="interval-visibility"><input type="checkbox" data-field="mostraIntervallo" ${s.mostraIntervallo!==false?'checked':''}> Mostra icona intervallo in A5 e sfondo mobile</label>
    </div>
    <div class="price-grid">
      <div><span class="field-label">Intero</span>${priceSelectHTML('intero', s.intero, INTERO_OPTIONS, false)}</div>
      <div><span class="field-label">Ridotto</span>${priceSelectHTML('ridotto', s.ridotto, RIDOTTO_OPTIONS, true)}</div>
      <div><span class="field-label">Abb.</span>
        <select data-field="abb">
          <option value="N" ${s.abb==='N'?'selected':''}>N</option>
          <option value="S" ${s.abb==='S'?'selected':''}>S</option>
        </select>
      </div>
    </div>
    <div class="row-actions">
      <select class="move-room-select" title="Sposta in un'altra sala">
        <option value="">Sposta in sala…</option>
        ${ROOMS_STAMPA.filter(r=>r.id!==roomId).map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
      </select>
      <button class="btn-remove">Rimuovi</button>
    </div>
  `;
  row.querySelectorAll('input,select:not(.move-room-select)').forEach(el=>{
    const eventName = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(eventName, ()=>{
      data[roomId][idx][el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      saveData();
    });
  });
  // Automazione: quando scegli l'Intero, il Ridotto si propone da solo a -1€
  // (resta comunque modificabile a mano subito dopo, se per quel film serve un altro valore)
  const interoSelect = row.querySelector('select[data-field="intero"]');
  const ridottoSelect = row.querySelector('select[data-field="ridotto"]');
  if(interoSelect && ridottoSelect){
    interoSelect.addEventListener('change', (e)=>{
      const n = parseFloat(e.target.value.replace(',', '.'));
      if(isNaN(n)) return;
      const target = normalizePrice((n - 1).toFixed(2).replace('.', ','));
      const matchOption = Array.from(ridottoSelect.options).find(opt=>normalizePrice(opt.value) === target);
      if(matchOption){
        ridottoSelect.value = matchOption.value;
        data[roomId][idx].ridotto = matchOption.value;
        saveData();
      }
    });
  }
  row.querySelector('.move-room-select').addEventListener('change', (e)=>{
    const targetRoomId = e.target.value;
    if(!targetRoomId) return;
    const [screening] = data[roomId].splice(idx,1);
    data[targetRoomId] = data[targetRoomId] || [];
    data[targetRoomId].push(screening);
    saveData(); renderEditor();
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
// Coordinate misurate per ciascuna sala e ciascun numero di film (1-5), generate
// automaticamente dalle immagini fornite: ogni film ha la propria casella dedicata.
const ROOM_IMAGES = {
  decurtis: {
    1: {file:'room-decurtis-1.png', w:1410, h:193, content:[{left:3.191,top:41.451,width:71.915,height:48.705}], intero:[{left:76.241,top:43.005,width:6.667,height:48.187}], ridotto:[{left:83.688,top:43.005,width:6.454,height:47.668}], abb:[{left:90.851,top:43.005,width:6.241,height:48.187}]},
    2: {file:'room-decurtis-2.png', w:1410, h:287, content:[{left:3.191,top:27.178,width:71.915,height:32.404},{left:3.191,top:61.324,width:71.915,height:29.617}], intero:[{left:76.241,top:27.875,width:6.667,height:31.707},{left:76.241,top:61.324,width:6.667,height:30.662}], ridotto:[{left:83.688,top:27.875,width:6.454,height:31.707},{left:83.688,top:61.324,width:6.454,height:29.965}], abb:[{left:90.851,top:27.875,width:6.241,height:31.707},{left:90.851,top:61.324,width:6.241,height:30.662}]},
    3: {file:'room-decurtis-3.png', w:1410, h:375, content:[{left:3.191,top:21.333,width:71.915,height:24.8},{left:3.191,top:47.467,width:71.915,height:22.133},{left:3.191,top:70.667,width:71.915,height:22.667}], intero:[{left:76.241,top:22.133,width:6.667,height:24.0},{left:76.241,top:47.467,width:6.596,height:22.133},{left:76.241,top:70.667,width:6.667,height:23.467}], ridotto:[{left:83.688,top:22.133,width:6.454,height:24.0},{left:83.688,top:47.467,width:6.454,height:22.133},{left:83.688,top:70.667,width:6.454,height:22.933}], abb:[{left:90.851,top:22.133,width:6.241,height:24.0},{left:90.993,top:47.467,width:6.099,height:22.133},{left:90.851,top:70.667,width:6.241,height:23.467}]},
    4: {file:'room-decurtis-4.png', w:1410, h:466, content:[{left:3.191,top:16.738,width:71.915,height:20.172},{left:3.191,top:37.768,width:71.915,height:17.811},{left:3.191,top:56.652,width:71.915,height:17.811},{left:3.191,top:75.536,width:71.915,height:18.67}], intero:[{left:76.241,top:17.382,width:6.667,height:19.528},{left:76.241,top:37.768,width:6.596,height:17.811},{left:76.241,top:56.652,width:6.596,height:17.811},{left:76.241,top:75.536,width:6.667,height:19.313}], ridotto:[{left:83.688,top:17.382,width:6.454,height:19.528},{left:83.688,top:37.768,width:6.454,height:17.811},{left:83.688,top:56.652,width:6.454,height:17.811},{left:83.688,top:75.536,width:6.454,height:19.099}], abb:[{left:90.851,top:17.382,width:6.241,height:19.528},{left:90.993,top:37.768,width:6.099,height:17.811},{left:90.851,top:56.652,width:6.241,height:17.811},{left:90.851,top:75.536,width:6.241,height:19.313}]},
    5: {file:'room-decurtis-5.png', w:1410, h:549, content:[{left:3.191,top:14.026,width:71.915,height:17.122},{left:3.191,top:32.058,width:71.915,height:15.118},{left:3.191,top:47.905,width:71.915,height:15.301},{left:3.191,top:63.934,width:71.915,height:15.665},{left:3.191,top:80.51,width:71.915,height:15.301}], intero:[{left:76.241,top:14.572,width:6.667,height:16.576},{left:76.241,top:32.058,width:6.596,height:15.118},{left:76.241,top:47.905,width:6.596,height:15.301},{left:76.241,top:63.934,width:6.596,height:15.665},{left:76.241,top:80.51,width:6.667,height:15.847}], ridotto:[{left:83.688,top:14.572,width:6.454,height:16.576},{left:83.688,top:32.058,width:6.454,height:15.118},{left:83.688,top:47.905,width:6.454,height:15.301},{left:83.688,top:63.934,width:6.454,height:15.665},{left:83.688,top:80.51,width:6.454,height:15.847}], abb:[{left:90.851,top:14.572,width:6.241,height:16.576},{left:90.993,top:32.058,width:6.099,height:15.118},{left:90.993,top:47.905,width:6.099,height:15.301},{left:90.851,top:63.934,width:6.241,height:15.665},{left:90.851,top:80.51,width:6.241,height:15.847}]},
  },
  sordi: {
    1: {file:'room-sordi-1.png', w:1410, h:194, content:[{left:3.191,top:32.99,width:71.915,height:57.732}], intero:[{left:76.241,top:35.052,width:6.667,height:56.186}], ridotto:[{left:83.688,top:35.567,width:6.454,height:55.67}], abb:[{left:90.851,top:35.567,width:6.241,height:55.67}]},
    2: {file:'room-sordi-2.png', w:1410, h:287, content:[{left:3.191,top:25.087,width:71.915,height:34.843},{left:3.191,top:61.672,width:71.915,height:30.314}], intero:[{left:76.241,top:26.481,width:6.667,height:33.449},{left:76.241,top:61.672,width:6.667,height:31.01}], ridotto:[{left:83.688,top:26.829,width:6.454,height:33.101},{left:83.688,top:61.672,width:6.454,height:31.01}], abb:[{left:90.993,top:26.829,width:6.099,height:33.101},{left:90.851,top:61.672,width:6.241,height:31.01}]},
    3: {file:'room-sordi-3.png', w:1410, h:375, content:[{left:3.191,top:17.867,width:71.915,height:28.533},{left:3.191,top:47.733,width:71.915,height:22.133},{left:3.191,top:70.933,width:71.915,height:23.2}], intero:[{left:76.241,top:19.467,width:6.667,height:26.933},{left:76.241,top:47.733,width:6.667,height:22.133},{left:76.241,top:70.933,width:6.667,height:23.733}], ridotto:[{left:83.688,top:19.2,width:6.454,height:27.2},{left:83.688,top:47.733,width:6.454,height:22.133},{left:83.688,top:70.933,width:6.454,height:23.733}], abb:[{left:90.993,top:19.2,width:6.099,height:27.2},{left:90.993,top:47.733,width:6.099,height:22.133},{left:90.851,top:70.933,width:6.241,height:23.733}]},
    4: {file:'room-sordi-4.png', w:1410, h:461, content:[{left:3.191,top:14.751,width:71.915,height:22.343},{left:3.191,top:37.961,width:71.915,height:18.004},{left:3.191,top:57.05,width:71.915,height:18.004},{left:3.191,top:76.139,width:71.915,height:19.089}], intero:[{left:76.241,top:15.618,width:6.667,height:21.475},{left:76.241,top:37.961,width:6.667,height:18.004},{left:76.241,top:57.05,width:6.667,height:18.004},{left:76.241,top:76.139,width:6.667,height:19.306}], ridotto:[{left:83.688,top:15.835,width:6.454,height:21.258},{left:83.688,top:37.961,width:6.454,height:18.004},{left:83.688,top:57.05,width:6.454,height:18.004},{left:83.688,top:76.139,width:6.454,height:19.306}], abb:[{left:90.993,top:15.835,width:6.099,height:21.258},{left:90.993,top:37.961,width:6.099,height:18.004},{left:90.993,top:57.05,width:6.099,height:18.004},{left:90.851,top:76.139,width:6.241,height:19.306}]},
    5: {file:'room-sordi-5.png', w:1409, h:555, content:[{left:3.123,top:12.793,width:71.966,height:19.279},{left:3.123,top:32.973,width:71.966,height:14.955},{left:3.123,top:48.649,width:71.966,height:15.135},{left:3.123,top:64.505,width:71.966,height:15.495},{left:3.123,top:80.901,width:71.966,height:15.676}], intero:[{left:76.224,top:13.514,width:6.671,height:18.559},{left:76.224,top:32.973,width:6.671,height:14.955},{left:76.224,top:48.649,width:6.671,height:15.135},{left:76.224,top:64.505,width:6.671,height:15.495},{left:76.224,top:80.901,width:6.671,height:15.856}], ridotto:[{left:83.676,top:13.694,width:6.458,height:18.378},{left:83.676,top:32.973,width:6.458,height:14.955},{left:83.676,top:48.649,width:6.458,height:15.135},{left:83.676,top:64.505,width:6.458,height:15.495},{left:83.676,top:80.901,width:6.458,height:15.856}], abb:[{left:90.987,top:13.694,width:6.104,height:18.378},{left:90.987,top:32.973,width:6.104,height:14.955},{left:90.987,top:48.649,width:6.104,height:15.135},{left:90.987,top:64.505,width:6.104,height:15.495},{left:90.845,top:80.901,width:6.246,height:15.856}]},
  },
  bergman: {
    1: {file:'room-bergman-1.png', w:1410, h:193, content:[{left:3.191,top:33.679,width:71.915,height:56.995}], intero:[{left:76.241,top:36.788,width:6.667,height:54.404}], ridotto:[{left:83.688,top:36.269,width:6.454,height:54.922}], abb:[{left:90.851,top:36.269,width:6.312,height:54.922}]},
    2: {file:'room-bergman-2.png', w:1410, h:278, content:[{left:3.191,top:24.46,width:71.915,height:34.892},{left:3.191,top:61.151,width:71.915,height:31.655}], intero:[{left:76.241,top:26.619,width:6.667,height:32.734},{left:76.241,top:61.151,width:6.667,height:32.374}], ridotto:[{left:83.688,top:25.899,width:6.454,height:33.453},{left:83.688,top:61.151,width:6.454,height:32.374}], abb:[{left:90.851,top:26.259,width:6.312,height:33.094},{left:90.851,top:61.151,width:6.312,height:32.374}]},
    3: {file:'room-bergman-3.png', w:1410, h:370, content:[{left:3.191,top:18.649,width:71.915,height:27.568},{left:3.191,top:47.568,width:71.915,height:22.432},{left:3.191,top:71.081,width:71.915,height:23.784}], intero:[{left:76.241,top:19.73,width:6.667,height:26.486},{left:76.241,top:47.568,width:6.667,height:22.432},{left:76.241,top:71.081,width:6.667,height:24.324}], ridotto:[{left:83.688,top:19.73,width:6.454,height:26.486},{left:83.688,top:47.568,width:6.454,height:22.432},{left:83.688,top:71.081,width:6.454,height:24.324}], abb:[{left:90.851,top:19.73,width:6.312,height:26.486},{left:90.851,top:47.568,width:6.241,height:22.432},{left:90.851,top:71.081,width:6.312,height:24.324}]},
    4: {file:'room-bergman-4.png', w:1410, h:458, content:[{left:3.191,top:14.41,width:71.915,height:21.834},{left:3.191,top:37.118,width:71.915,height:18.122},{left:3.191,top:56.332,width:71.915,height:18.122},{left:3.191,top:75.546,width:71.915,height:20.306}], intero:[{left:76.241,top:15.502,width:6.667,height:20.742},{left:76.241,top:37.118,width:6.667,height:18.122},{left:76.241,top:56.332,width:6.667,height:18.122},{left:76.241,top:75.546,width:6.667,height:20.742}], ridotto:[{left:83.688,top:15.284,width:6.454,height:20.961},{left:83.688,top:37.118,width:6.454,height:18.122},{left:83.688,top:56.332,width:6.454,height:18.122},{left:83.688,top:75.546,width:6.454,height:20.742}], abb:[{left:90.851,top:15.284,width:6.312,height:20.961},{left:90.851,top:37.118,width:6.241,height:18.122},{left:90.851,top:56.332,width:6.312,height:18.122},{left:90.851,top:75.546,width:6.312,height:20.742}]},
    5: {file:'room-bergman-5.png', w:1410, h:551, content:[{left:3.191,top:12.16,width:71.915,height:18.875},{left:3.191,top:31.942,width:71.915,height:15.064},{left:3.191,top:47.731,width:71.915,height:15.245},{left:3.191,top:63.702,width:71.915,height:15.608},{left:3.191,top:80.218,width:71.915,height:16.334}], intero:[{left:76.241,top:13.249,width:6.667,height:17.786},{left:76.241,top:31.942,width:6.667,height:15.064},{left:76.241,top:47.731,width:6.667,height:15.245},{left:76.241,top:63.702,width:6.667,height:15.608},{left:76.241,top:80.218,width:6.667,height:16.515}], ridotto:[{left:83.688,top:12.886,width:6.454,height:18.149},{left:83.688,top:31.942,width:6.454,height:15.064},{left:83.688,top:47.731,width:6.454,height:15.245},{left:83.688,top:63.702,width:6.454,height:15.608},{left:83.688,top:80.218,width:6.454,height:16.515}], abb:[{left:90.851,top:12.886,width:6.312,height:18.149},{left:90.851,top:31.942,width:6.241,height:15.064},{left:90.851,top:47.731,width:6.241,height:15.245},{left:90.851,top:63.702,width:6.312,height:15.608},{left:90.851,top:80.218,width:6.312,height:16.515}]},
  },
  virnalisi: {
    1: {file:'room-virnalisi-1.png', w:1410, h:196, content:[{left:3.191,top:34.694,width:71.915,height:55.612}], intero:[{left:76.241,top:36.224,width:6.667,height:54.082}], ridotto:[{left:83.688,top:36.224,width:6.454,height:53.571}], abb:[{left:90.851,top:36.224,width:6.312,height:55.102}]},
    2: {file:'room-virnalisi-2.png', w:1410, h:281, content:[{left:3.191,top:23.488,width:71.915,height:36.655},{left:3.191,top:61.922,width:71.986,height:32.384}], intero:[{left:76.241,top:24.555,width:6.667,height:35.587},{left:76.241,top:61.922,width:6.667,height:32.74}], ridotto:[{left:83.688,top:24.555,width:6.454,height:35.587},{left:83.688,top:61.922,width:6.454,height:32.028}], abb:[{left:90.851,top:24.555,width:6.312,height:35.587},{left:90.851,top:61.922,width:6.312,height:32.74}]},
    3: {file:'room-virnalisi-3.png', w:1410, h:378, content:[{left:3.191,top:17.46,width:71.915,height:28.571},{left:3.191,top:47.354,width:71.844,height:21.958},{left:3.191,top:70.37,width:71.986,height:24.074}], intero:[{left:76.241,top:18.519,width:6.667,height:27.513},{left:76.241,top:47.354,width:6.667,height:21.958},{left:76.241,top:70.37,width:6.667,height:24.339}], ridotto:[{left:83.688,top:18.519,width:6.454,height:27.513},{left:83.688,top:47.354,width:6.454,height:21.958},{left:83.688,top:70.37,width:6.454,height:23.81}], abb:[{left:90.851,top:18.519,width:6.312,height:27.513},{left:90.851,top:47.354,width:6.312,height:21.958},{left:90.851,top:70.37,width:6.312,height:24.339}]},
    4: {file:'room-virnalisi-4.png', w:1410, h:463, content:[{left:3.191,top:14.687,width:71.915,height:22.03},{left:3.191,top:37.581,width:71.844,height:17.927},{left:3.191,top:56.587,width:71.844,height:17.927},{left:3.191,top:75.594,width:71.986,height:20.302}], intero:[{left:76.241,top:15.551,width:6.667,height:21.166},{left:76.241,top:37.581,width:6.667,height:17.927},{left:76.241,top:56.587,width:6.667,height:17.927},{left:76.241,top:75.594,width:6.667,height:20.086}], ridotto:[{left:83.688,top:15.551,width:6.454,height:21.166},{left:83.688,top:37.581,width:6.454,height:17.927},{left:83.688,top:56.587,width:6.454,height:17.927},{left:83.688,top:75.594,width:6.454,height:19.87}], abb:[{left:90.851,top:15.551,width:6.312,height:21.166},{left:90.851,top:37.581,width:6.312,height:17.927},{left:90.851,top:56.587,width:6.312,height:17.927},{left:90.851,top:75.594,width:6.312,height:20.518}]},
    5: {file:'room-virnalisi-5.png', w:1410, h:555, content:[{left:3.191,top:11.892,width:71.915,height:19.459},{left:3.191,top:32.252,width:71.844,height:14.955},{left:3.191,top:47.928,width:71.844,height:15.135},{left:3.191,top:63.784,width:71.844,height:15.495},{left:3.191,top:80.18,width:71.915,height:16.216}], intero:[{left:76.241,top:12.613,width:6.667,height:18.739},{left:76.241,top:32.252,width:6.667,height:14.955},{left:76.241,top:47.928,width:6.667,height:15.135},{left:76.241,top:63.784,width:6.667,height:15.495},{left:76.241,top:80.18,width:6.667,height:16.577}], ridotto:[{left:83.688,top:12.613,width:6.454,height:18.739},{left:83.688,top:32.252,width:6.454,height:14.955},{left:83.688,top:47.928,width:6.454,height:15.135},{left:83.688,top:63.784,width:6.454,height:15.495},{left:83.688,top:80.18,width:6.454,height:16.036}], abb:[{left:90.851,top:12.613,width:6.312,height:18.739},{left:90.851,top:32.252,width:6.312,height:14.955},{left:90.851,top:47.928,width:6.312,height:15.135},{left:90.851,top:63.784,width:6.312,height:15.495},{left:90.851,top:80.18,width:6.312,height:16.577}]},
  },
  desica: {
    1: {file:'room-desica-1.png', w:1410, h:198, content:[{left:3.191,top:31.818,width:71.915,height:57.576}], intero:[{left:76.241,top:34.343,width:6.667,height:56.566}], ridotto:[{left:83.688,top:34.343,width:6.454,height:56.566}], abb:[{left:90.851,top:34.343,width:6.312,height:56.566}]},
    2: {file:'room-desica-2.png', w:1410, h:285, content:[{left:3.191,top:22.456,width:71.915,height:36.842},{left:3.191,top:61.053,width:71.915,height:31.93}], intero:[{left:76.241,top:24.211,width:6.667,height:35.088},{left:76.241,top:61.053,width:6.667,height:32.632}], ridotto:[{left:83.688,top:24.211,width:6.454,height:35.088},{left:83.688,top:61.053,width:6.454,height:32.982}], abb:[{left:90.993,top:24.211,width:6.17,height:35.088},{left:90.851,top:61.053,width:6.312,height:32.982}]},
    3: {file:'room-desica-3.png', w:1410, h:379, content:[{left:3.191,top:16.887,width:71.915,height:29.551},{left:3.191,top:47.757,width:71.915,height:21.9},{left:3.191,top:70.712,width:71.915,height:24.011}], intero:[{left:76.241,top:18.206,width:6.667,height:28.232},{left:76.241,top:47.757,width:6.667,height:21.9},{left:76.241,top:70.712,width:6.667,height:24.538}], ridotto:[{left:83.688,top:18.206,width:6.454,height:28.232},{left:83.688,top:47.757,width:6.454,height:21.9},{left:83.688,top:70.712,width:6.454,height:24.802}], abb:[{left:90.993,top:18.206,width:6.17,height:28.232},{left:90.993,top:47.757,width:6.17,height:21.9},{left:90.851,top:70.712,width:6.312,height:24.802}]},
    4: {file:'room-desica-4.png', w:1410, h:468, content:[{left:3.191,top:14.316,width:71.915,height:22.65},{left:3.191,top:37.821,width:71.915,height:17.735},{left:3.191,top:56.624,width:71.915,height:17.735},{left:3.191,top:75.427,width:71.915,height:20.513}], intero:[{left:76.241,top:15.385,width:6.667,height:21.581},{left:76.241,top:37.821,width:6.667,height:17.735},{left:76.241,top:56.624,width:6.667,height:17.735},{left:76.241,top:75.427,width:6.667,height:20.94}], ridotto:[{left:83.688,top:15.385,width:6.454,height:21.581},{left:83.688,top:37.821,width:6.454,height:17.735},{left:83.688,top:56.624,width:6.454,height:17.735},{left:83.688,top:75.427,width:6.454,height:20.94}], abb:[{left:90.993,top:15.385,width:6.17,height:21.581},{left:90.993,top:37.821,width:6.17,height:17.735},{left:90.993,top:56.624,width:6.17,height:17.735},{left:90.851,top:75.427,width:6.312,height:20.94}]},
    5: {file:'room-desica-5.png', w:1409, h:552, content:[{left:3.123,top:11.413,width:71.966,height:19.565},{left:3.123,top:31.884,width:71.966,height:15.036},{left:3.123,top:47.645,width:71.966,height:15.217},{left:3.123,top:63.587,width:71.966,height:15.58},{left:3.123,top:80.072,width:71.966,height:16.304}], intero:[{left:76.224,top:12.319,width:6.671,height:18.659},{left:76.224,top:31.884,width:6.671,height:15.036},{left:76.224,top:47.645,width:6.671,height:15.217},{left:76.224,top:63.587,width:6.671,height:15.58},{left:76.224,top:80.072,width:6.671,height:16.848}], ridotto:[{left:83.676,top:12.319,width:6.458,height:18.659},{left:83.676,top:31.884,width:6.458,height:15.036},{left:83.676,top:47.645,width:6.458,height:15.217},{left:83.676,top:63.587,width:6.458,height:15.58},{left:83.676,top:80.072,width:6.458,height:16.848}], abb:[{left:90.987,top:12.319,width:6.175,height:18.659},{left:90.987,top:31.884,width:6.175,height:15.036},{left:90.987,top:47.645,width:6.175,height:15.217},{left:90.987,top:63.587,width:6.175,height:15.58},{left:90.845,top:80.072,width:6.317,height:16.848}]},
  },
  mastroianni: {
    1: {file:'room-mastroianni-1.png', w:1410, h:195, content:[{left:3.191,top:33.333,width:71.915,height:57.436}], intero:[{left:76.241,top:35.385,width:6.667,height:57.436}], ridotto:[{left:83.617,top:35.385,width:6.525,height:56.923}], abb:[{left:90.851,top:35.385,width:6.312,height:57.436}]},
    2: {file:'room-mastroianni-2.png', w:1410, h:280, content:[{left:3.191,top:23.214,width:71.915,height:36.429},{left:3.191,top:61.429,width:71.915,height:31.786}], intero:[{left:76.241,top:24.643,width:6.667,height:35.0},{left:76.241,top:61.429,width:6.667,height:32.857}], ridotto:[{left:83.617,top:24.643,width:6.525,height:35.0},{left:83.688,top:61.429,width:6.454,height:32.857}], abb:[{left:90.993,top:24.643,width:6.17,height:35.0},{left:90.851,top:61.429,width:6.312,height:32.857}]},
    3: {file:'room-mastroianni-3.png', w:1410, h:377, content:[{left:3.191,top:17.772,width:71.915,height:28.647},{left:3.191,top:47.745,width:71.915,height:22.016},{left:3.191,top:70.822,width:71.915,height:24.138}], intero:[{left:76.241,top:18.833,width:6.667,height:27.586},{left:76.241,top:47.745,width:6.667,height:22.016},{left:76.241,top:70.822,width:6.667,height:24.934}], ridotto:[{left:83.617,top:18.833,width:6.525,height:27.586},{left:83.688,top:47.745,width:6.454,height:22.016},{left:83.688,top:70.822,width:6.454,height:24.934}], abb:[{left:90.993,top:18.833,width:6.17,height:27.586},{left:90.851,top:47.745,width:6.312,height:22.016},{left:90.851,top:70.822,width:6.312,height:24.934}]},
    4: {file:'room-mastroianni-4.png', w:1410, h:458, content:[{left:3.191,top:14.192,width:71.915,height:22.271},{left:3.191,top:37.336,width:71.915,height:18.122},{left:3.191,top:56.55,width:71.915,height:18.122},{left:3.191,top:75.764,width:71.915,height:20.306}], intero:[{left:76.241,top:15.066,width:6.667,height:21.397},{left:76.241,top:37.336,width:6.667,height:18.122},{left:76.241,top:56.55,width:6.667,height:18.122},{left:76.241,top:75.764,width:6.667,height:21.179}], ridotto:[{left:83.617,top:15.066,width:6.525,height:21.397},{left:83.688,top:37.336,width:6.454,height:18.122},{left:83.688,top:56.55,width:6.454,height:18.122},{left:83.688,top:75.764,width:6.454,height:21.179}], abb:[{left:90.993,top:15.066,width:6.17,height:21.397},{left:90.851,top:37.336,width:6.312,height:18.122},{left:90.851,top:56.55,width:6.312,height:18.122},{left:90.851,top:75.764,width:6.312,height:21.179}]},
    5: {file:'room-mastroianni-5.png', w:1410, h:550, content:[{left:3.191,top:12.364,width:71.915,height:18.909},{left:3.191,top:32.182,width:71.915,height:15.091},{left:3.191,top:48.0,width:71.915,height:15.273},{left:3.191,top:64.0,width:71.915,height:15.636},{left:3.191,top:80.545,width:71.915,height:16.0}], intero:[{left:76.241,top:13.091,width:6.667,height:18.182},{left:76.241,top:32.182,width:6.667,height:15.091},{left:76.241,top:48.0,width:6.667,height:15.273},{left:76.241,top:64.0,width:6.667,height:15.636},{left:76.241,top:80.545,width:6.667,height:16.727}], ridotto:[{left:83.617,top:13.091,width:6.525,height:18.182},{left:83.688,top:32.182,width:6.454,height:15.091},{left:83.688,top:48.0,width:6.454,height:15.273},{left:83.688,top:64.0,width:6.454,height:15.636},{left:83.688,top:80.545,width:6.454,height:16.545}], abb:[{left:90.993,top:13.091,width:6.17,height:18.182},{left:90.993,top:32.182,width:6.17,height:15.091},{left:90.851,top:48.0,width:6.312,height:15.273},{left:90.851,top:64.0,width:6.312,height:15.636},{left:90.851,top:80.545,width:6.312,height:16.545}]},
  },
};
// Badge per versione (3D / V.O., riconosciuti dal testo libero del campo Versione)
// e per CineRevolution (icona "persone" della legenda, riusata per identificarlo a colpo d'occhio)
const INTERVALLO_ICON_MAP = {
  '3 min': 'interval-icons/interval-3.png',
  '5 min': 'interval-icons/interval-5.png',
  '7 min': 'interval-icons/interval-7.png',
  '10 min': 'interval-icons/interval-10.png',
  '15 min': 'interval-icons/interval-15.png',
  'Diretto': 'interval-icons/interval-diretto.png'
};

function intervalIconHTML(s, prefix){
  if(!s || s.mostraIntervallo === false) return '';
  const values = Array.isArray(s.intervalli)
    ? s.intervalli.filter(x=>x && x.visible!==false).map(x=>x.value || DEFAULT_INTERVALLO)
    : [s.intervallo || DEFAULT_INTERVALLO];
  const uniqueValues = [...new Set(values)].filter(v=>INTERVALLO_ICON_MAP[v]);
  if(!uniqueValues.length) return '';
  return uniqueValues.map(value =>
    `<img src="${INTERVALLO_ICON_MAP[value]}" class="${prefix}-interval-icon" alt="Intervallo ${escAttr(value)}" title="Intervallo ${escAttr(value)}">`
  ).join('');
}

function versionBadges(s, prefix){
  const v = (s.versione||'').toLowerCase();
  let html = '';
  if(v.includes('3d')) html += `<img src="icon-3d.png" class="${prefix}-icon-badge" alt="3D" title="3D">`;
  if(v.includes('ov') || v.includes('v.o') || v.includes('originale')) html += `<img src="icon-vo.png" class="${prefix}-icon-badge" alt="Versione originale" title="Versione originale">`;
  const sezionePromoText = (s.sezionePromo||'').trim();
  if(sezionePromoText) html += `<img src="icon-people.png" class="${prefix}-icon-badge" alt="${escAttr(sezionePromoText)}" title="${escAttr(sezionePromoText)}">`;
  return html;
}

function cellStyle(z){
  return `left:${z.left}%;top:${z.top}%;width:${z.width}%;height:${z.height}%;`;
}

// Genera la fascia di UNA sala (immagine + celle di testo posizionate sopra), usando
// la variante immagine giusta in base a quanti film ci sono in quel momento.
function roomBandHTML(prefix, room, showPrices){
  const screenings = data[room.id] || [];
  if(screenings.length===0) return '';

  // Le immagini coprono da 1 a 5 film. Con più di 5, uniamo i film in eccesso
  // nell'ultima casella (caso raro, meglio mostrarli comunque che perderli).
  let displayScreenings = screenings;
  if(screenings.length > 5){
    const overflow = screenings.slice(4);
    const merged = {
      film: overflow.map(s=>s.film).join(' / '),
      times: overflow.map(s=>s.times).join(' - '),
      versione:'', sezionePromo:'',
      intervallo: overflow[0].intervallo || '',
      intervalli: overflow.map(s=>({
        value: s.intervallo || DEFAULT_INTERVALLO,
        visible: s.mostraIntervallo !== false
      })),
      mostraIntervallo: overflow.some(s=>s.mostraIntervallo!==false),
      intero: overflow[0].intero, ridotto: overflow[0].ridotto, abb: overflow[0].abb
    };
    displayScreenings = screenings.slice(0,4).concat([merged]);
  }
  const count = displayScreenings.length;
  const variant = (ROOM_IMAGES[room.id] || {})[count];
  if(!variant) return '';

  let contentCells = '', interoCells = '', ridottoCells = '', abbCells = '';
  displayScreenings.forEach((s, i)=>{
    const cellId = `${prefix}-${room.id}-${i}`;
    const timesSet = new Set();
    s.times.split('-').map(t=>t.trim()).filter(Boolean).forEach(t=>timesSet.add(t));
    const sortedTimes = sortTimesChronologically(timesSet);
    const pills = sortedTimes.map(t=>`<span class="${prefix}-pill" style="background:${room.color}">${escHtml(t)}</span>`).join('');
    contentCells += `<div class="${prefix}-cell ${prefix}-content-cell" id="content-${cellId}" style="${cellStyle(variant.content[i])}">
      <span class="${prefix}-film-title">${escHtml(s.film)}</span>
      ${versionBadges(s, prefix)}
      ${pills}
      ${intervalIconHTML(s, prefix)}
    </div>`;

    if(showPrices){
      interoCells += `<div class="${prefix}-cell ${prefix}-price-cell" id="intero-${cellId}" style="${cellStyle(variant.intero[i])}">${formatPriceShort(s.intero)}</div>`;
      const r = (s.ridotto||'').trim();
      ridottoCells += `<div class="${prefix}-cell ${prefix}-price-cell" id="ridotto-${cellId}" style="${cellStyle(variant.ridotto[i])}">${(r && r!=='-') ? formatPriceShort(r) : '-'}</div>`;
      const abbIcon = s.abb==='S' ? 'icon-abb-yes.png' : 'icon-abb-no.png';
      abbCells += `<div class="${prefix}-cell ${prefix}-abb-cell" style="${cellStyle(variant.abb[i])}"><img src="${abbIcon}" class="${prefix}-abb-icon" alt="Abbonamento"></div>`;
    }
  });

  return `<div class="${prefix}-room-band">
    <img src="${variant.file}" alt="${escAttr(room.name)}" class="${prefix}-band-img" onerror="this.style.opacity='0';">
    ${contentCells}${interoCells}${ridottoCells}${abbCells}
  </div>`;
}

function roomStackHTML(prefix, showPrices){
  return ROOMS.map(room=>roomBandHTML(prefix, room, showPrices)).join('');
}

// Adatta il testo di UNA singola casella (cresce o si rimpicciolisce per riempirla,
// dato che ora ogni film ha già la sua casella su misura, niente più compromessi).
function fitCell(id){
  const cell = document.getElementById(id);
  if(!cell || cell.clientHeight === 0) return;
  cell.style.setProperty('--fz', 1);
  cell.style.setProperty('--fg', 1);
  let s = 1;
  for(let i=0; i<10; i++){
    const ratio = Math.min(cell.clientHeight/cell.scrollHeight, cell.clientWidth/cell.scrollWidth);
    if(Math.abs(ratio - 1) < 0.04) break;
    s = Math.max(0.5, Math.min(2.2, s * ratio * 0.96));
    cell.style.setProperty('--fz', s);
  }
  let g = 1;
  for(let i=0; i<8; i++){
    if(cell.scrollHeight >= cell.clientHeight * 0.97) break;
    const ratio = cell.clientHeight / cell.scrollHeight;
    g = Math.min(6, g * Math.min(ratio, 1.3));
    cell.style.setProperty('--fg', g);
  }
}

function fitAllCells(prefix){
  document.querySelectorAll(`.${prefix}-content-cell, .${prefix}-price-cell`).forEach(el=>fitCell(el.id));
}

// Se l'insieme di tutte le sale (impilate) è più alto dello spazio disponibile,
// restringiamo TUTTO insieme proporzionalmente (mai una sala sola), per restare
// sempre su un'unica pagina/riquadro.
function fitStackScale(stackEl, availableHeightPx){
  stackEl.style.transform = 'none';
  const naturalH = stackEl.scrollHeight;
  if(naturalH <= availableHeightPx){ return; }
  const scale = Math.max(0.4, availableHeightPx / naturalH);
  stackEl.style.transformOrigin = 'top center';
  stackEl.style.transform = `scale(${scale})`;
}

function renderPrintSheet(){
  const el = document.getElementById('sheet-print');
  el.innerHTML = `
    <div class="print-stack" id="print-stack">
      <div class="print-doc-header">
        <img src="logo-lumiere.png" alt="Logo" onerror="this.style.display='none';">
        <div>
          <div class="print-doc-title">PROGRAMMAZIONE</div>
          <div class="print-doc-sub">Aggiornata al ${todayStr()}</div>
        </div>
      </div>
      ${roomStackHTML('print', true)}
      <img src="legenda.png" alt="Legenda" class="print-legend-img" onerror="this.style.display='none';">
    </div>`;
  fitAllCells('print');
  waitImagesThen(el, ()=>{
    fitAllCells('print');
    const stack = document.getElementById('print-stack');
    const sheet = document.getElementById('sheet-print');
    fitStackScale(stack, sheet.clientHeight - 20);
  });
}

function renderMobileSheet(){
  const el = document.getElementById('sheet-mobile');
  el.innerHTML = `
    <div class="mobile-safe-top"></div>
    <div class="mobile-content-group">
      <div class="mobile-stack" id="mobile-stack">
        ${roomStackHTML('mobile', true)}
      </div>
      <div class="mobile-brand">
        <img src="logo-lumiere.png" alt="Logo Cinema Lumière" onerror="this.style.display='none';">
        <div class="brand-text">Multisala Lumière</div>
      </div>
    </div>
    <div class="mobile-safe-bottom"></div>`;
  fitAllCells('mobile');
  waitImagesThen(el, ()=>{
    fitAllCells('mobile');
    const stack = document.getElementById('mobile-stack');
    const group = document.querySelector('#sheet-mobile .mobile-content-group');
    const brand = document.querySelector('#sheet-mobile .mobile-brand');
    const budget = group.clientHeight - brand.offsetHeight - 22;
    fitStackScale(stack, Math.max(80, budget));
  });
}

// Ricalcola dopo che tutte le immagini (sale + logo + legenda) hanno finito di
// caricare, altrimenti le misure sono sbagliate e il layout si sposta dopo.
function waitImagesThen(container, callback){
  const imgs = container.querySelectorAll('img');
  let toLoad = imgs.length;
  if(toLoad === 0){ callback(); return; }
  let done = false;
  const finish = ()=>{ if(done) return; done = true; callback(); };
  imgs.forEach(img=>{
    if(img.complete){ toLoad--; }
    else{
      img.addEventListener('load', ()=>{ toLoad--; if(toLoad<=0) finish(); });
      img.addEventListener('error', ()=>{ toLoad--; if(toLoad<=0) finish(); });
    }
  });
  if(toLoad<=0) finish();
  setTimeout(finish, 1500); // rete di sicurezza se qualche immagine non risponde
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

  // Raggruppa per il testo ESATTO scritto in "Sezione promo": ogni nome diverso
  // ottiene la propria barra con la propria etichetta, invece di finire tutto
  // insieme sotto "CineRevolution".
  const promoGroups = new Map(); // testo sezione -> [entries], nell'ordine di prima comparsa
  entries.filter(e=>e.sezionePromo).forEach(e=>{
    if(!promoGroups.has(e.sezionePromo)) promoGroups.set(e.sezionePromo, []);
    promoGroups.get(e.sezionePromo).push(e);
  });

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

  promoGroups.forEach((groupEntries, sezioneName)=>{
    contentHTML += `<div class="promo-section-bar">★ ${escHtml(sezioneName.toUpperCase())} ★</div>` + groupEntries.map(rowHTML).join('');
  });

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
  for(let i=0; i<20; i++){
    const naturalH = zone.scrollHeight;
    const availH = zone.clientHeight;
    if(naturalH >= availH * 0.98) break;
    const ratio = availH / naturalH;
    g = Math.min(12, g * Math.min(ratio, 1.5));
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
    if(elId==='sheet-mobile'){ fitAllCells('mobile'); }
    const node = document.getElementById(elId);
    // Aspettiamo che tutte le immagini (logo ecc.) siano caricate, altrimenti il layout
    // può spostarsi dopo la cattura e tagliare l'ultima riga.
    const imgsToWait = Array.from(node.querySelectorAll('img')).filter(img=>!img.complete);
    if(imgsToWait.length){
      await Promise.all(imgsToWait.map(img=>new Promise(res=>{
        img.addEventListener('load', res); img.addEventListener('error', res);
      })));
      if(elId==='sheet-banner'){ fitZone('banner-zone'); }
      if(elId==='sheet-mobile'){ fitAllCells('mobile'); }
    }
    if(elId==='sheet-mobile'){
      const stack = document.getElementById('mobile-stack');
      const group = document.querySelector('#sheet-mobile .mobile-content-group');
      const brand = document.querySelector('#sheet-mobile .mobile-brand');
      if(stack && group && brand){
        fitStackScale(stack, Math.max(80, group.clientHeight - brand.offsetHeight - 22));
      }
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
    fitAllCells('print');
    const node = document.getElementById('sheet-print');
    const imgsToWait = Array.from(node.querySelectorAll('img')).filter(img=>!img.complete);
    if(imgsToWait.length){
      await Promise.all(imgsToWait.map(img=>new Promise(res=>{
        img.addEventListener('load', res); img.addEventListener('error', res);
      })));
      fitAllCells('print');
    }
    const stack = document.getElementById('print-stack');
    if(stack){ fitStackScale(stack, node.clientHeight - 20); }
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

initData();
