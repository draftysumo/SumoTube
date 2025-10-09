(async function(){
  console.log('[SumoTube] Renderer startup');

  // Elements
  const openFolderSmall = document.getElementById('openFolderSmall');
  const refreshBtn = document.getElementById('refreshBtn');
  const sortSelect = document.getElementById('sortSelect');
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const artistsEl = document.getElementById('artists');
  const template = document.getElementById('card-template');
  const bioModal = document.getElementById('bioModal');
  const modalArtistName = document.getElementById('modalArtistName');
  const modalBioInput = document.getElementById('modalBioInput');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');

  // small placeholder SVG for artists without pfp
  const PLACEHOLDER_PFP = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><rect fill="#0b1220" width="24" height="24" rx="4"/><g fill="#9aa4b2"><circle cx="12" cy="8" r="3"/><path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v.5H4V20z"/></g></svg>`);

  // State
  let videos = [];
  let pinned = new Set();
  let artistProfiles = {};
  let customThumbs = {}; 
  let currentView = { type: 'grid' };
  let editingArtist = null;
  let currentFolder = null;

  // keyboard navigation state
  let visibleCards = [];
  let selectedIndex = -1;

  // Load saved state
  function loadState(){
    try{
      const raw = localStorage.getItem('video_browser_state');
      if(!raw) return;
      const parsed = JSON.parse(raw);
      if(parsed.pinned && Array.isArray(parsed.pinned)) pinned = new Set(parsed.pinned);
      artistProfiles = parsed.artistProfiles || {};
      customThumbs = parsed.customThumbs || {};
    }catch(e){console.warn('Failed to load state',e)}
  }

  function saveState(){
    const payload = { pinned: Array.from(pinned), artistProfiles, customThumbs };
    try{ localStorage.setItem('video_browser_state', JSON.stringify(payload)); }catch(e){console.warn('Failed to save state',e)}
  }

  loadState();

  // Helpers
  function formatDuration(s){if(!s||isNaN(s))return '--:--'; s=Math.round(s); const m=Math.floor(s/60); const sec=s%60; return `${m}:${sec.toString().padStart(2,'0')}`;}

  function fileUrl(p){
    if(!p) return '';
    if(p.startsWith('file://')) return p;
    const normalized = p.replace(/\\/g,'/');
    if(/^[a-zA-Z]:\//.test(normalized)) return 'file:///' + normalized;
    if(normalized.startsWith('/')) return 'file://' + normalized;
    return 'file://' + normalized;
  }

  function shuffleArray(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]]=[arr[j], arr[i]];
    }
  }

  function setDurationForVideo(videoPath, pillElement){
    try{
      const v = document.createElement('video');
      v.preload='metadata';
      v.muted=true;
      v.src=fileUrl(videoPath);
      v.addEventListener('loadedmetadata', ()=>{
        const dur = v.duration||0;
        pillElement.textContent=formatDuration(dur);
        v.remove();
      });
      setTimeout(()=>{ if(!pillElement.textContent || pillElement.textContent==='') pillElement.textContent='--:--'; },3000);
    }catch(e){ console.warn('setDurationForVideo failed',e); pillElement.textContent='--:--'; }
  }

  function showBioModal(artist){
    editingArtist = artist;
    modalArtistName.textContent = artist;
    modalBioInput.value = artistProfiles[artist]?.bio || '';
    bioModal.removeAttribute('hidden');
    modalBioInput.focus();
  }

  modalCancel.addEventListener('click', ()=>{ bioModal.setAttribute('hidden',''); editingArtist=null; });
  modalSave.addEventListener('click', ()=>{
    if(!editingArtist) return;
    artistProfiles[editingArtist] = artistProfiles[editingArtist]||{};
    artistProfiles[editingArtist].bio = modalBioInput.value;
    saveState();
    renderCurrentView();
    bioModal.setAttribute('hidden','');
    editingArtist=null;
  });

  function applySort(list){
    const s = sortSelect?.value || 'random';
    const pinnedList = list.filter(v=>pinned.has(v.path));
    let unpinnedList = list.filter(v=>!pinned.has(v.path));

    if(s==='random') shuffleArray(unpinnedList);
    else if(s==='title-asc') unpinnedList.sort((a,b)=>a.title.localeCompare(b.title));
    else if(s==='title-desc') unpinnedList.sort((a,b)=>b.title.localeCompare(a.title));
    else if(s==='artist-asc') unpinnedList.sort((a,b)=>(a.parent||'').localeCompare(b.parent||''));
    else if(s==='artist-desc') unpinnedList.sort((a,b)=>(b.parent||'').localeCompare(a.parent||''));

    list.length=0;
    list.push(...pinnedList, ...unpinnedList);
  }

  function render(){ if(!currentView) currentView={type:'grid'}; renderCurrentView(); }

  function normalizeFiles(files){
    return files.map(f=>({
      path: f.path || f.fullPath || '',
      name: f.name || f.filename || 'Untitled',
      title: (f.name || f.filename || 'Untitled').replace(/\.[^/.]+$/,''),
      parent: f.parent || f.folder || 'Unknown',
      sidecar: f.sidecar || null,
      customThumbnail: null
    }));
  }

  // Restore last folder
  if(window.electronAPI?.getLastFolder){
    const lastFolder = await window.electronAPI.getLastFolder();
    console.log('[SumoTube] getLastFolder:', lastFolder);
    if(lastFolder){
      try{
        const res = await window.electronAPI.rescanFolder(lastFolder);
        console.log('[SumoTube] rescanFolder result:', res);
        if(res && !res.canceled){
          currentFolder=lastFolder;
          if(window.electronAPI?.setLastFolder) await window.electronAPI.setLastFolder(currentFolder);
          videos = normalizeFiles(res.files);
          for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail = customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
          currentView={type:'grid'};
          if(sortSelect?.value==='random') shuffleArray(videos);
          render();
        }
      }catch(e){ console.error('[SumoTube] Error restoring last folder:', e); }
    }
  }

  // Folder open / refresh
  openFolderSmall?.addEventListener('click', async ()=>{
    try{
      let lastFolder = currentFolder;
      if(!lastFolder && window.electronAPI?.getLastFolder) lastFolder = await window.electronAPI.getLastFolder();
      const res = await window.electronAPI.chooseFolder(lastFolder ? { defaultPath: lastFolder } : undefined);
      if(res && !res.canceled){
        currentFolder=res.folder;
        if(window.electronAPI?.setLastFolder) await window.electronAPI.setLastFolder(currentFolder);
        videos=normalizeFiles(res.files);
        for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail=customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
        currentView={type:'grid'};
        if(sortSelect?.value==='random') shuffleArray(videos);
        render();
      }
    }catch(err){ console.error('chooseFolder failed',err); }
  });

  refreshBtn?.addEventListener('click', async ()=>{
    try{
      if(currentFolder){
        const res=await window.electronAPI.rescanFolder(currentFolder);
        if(res && !res.canceled){
          if(window.electronAPI?.setLastFolder) await window.electronAPI.setLastFolder(currentFolder);
          videos=normalizeFiles(res.files);
          for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail=customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
          if(sortSelect?.value==='random') shuffleArray(videos);
          render();
          return;
        }
      }
      const res = await window.electronAPI.chooseFolder();
      if(res && !res.canceled){
        currentFolder=res.folder;
        if(window.electronAPI?.setLastFolder) await window.electronAPI.setLastFolder(currentFolder);
        videos=normalizeFiles(res.files);
        for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail=customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
        if(sortSelect?.value==='random') shuffleArray(videos);
        render();
      }
    }catch(err){ console.error('refresh failed',err); }
  });

  sortSelect?.addEventListener('change', ()=> render());
  search?.addEventListener('input', ()=> render());

  // Renders
  function buildArtists(){
    const map=new Map();
    for(const v of videos){
      const artist=v.parent||'Unknown';
      if(!map.has(artist)) map.set(artist,[]);
      map.get(artist).push(v);
    }
    artistsEl.innerHTML='';
    for(const [artist,list] of map.entries()){
      const li=document.createElement('li');
      li.textContent=`${artist} (${list.length})`;
      li.onclick=()=>{ currentView={type:'artist',name:artist}; render(); };
      li.addEventListener('mouseenter', ()=> li.style.background='rgba(255,255,255,0.03)');
      li.addEventListener('mouseleave', ()=> li.style.background='transparent');
      artistsEl.appendChild(li);
    }
  }

  function renderGrid(){
    currentView={type:'grid'};
    grid.innerHTML='';
    buildArtists();
    visibleCards=[]; selectedIndex=-1;
    const q=(search?.value||'').trim().toLowerCase();
    let filtered=videos.filter(v=> !q || v.title.toLowerCase().includes(q) || (v.parent||'').toLowerCase().includes(q));
    applySort(filtered);
    for(const v of filtered) addVideoCard(v);
  }

  function renderArtist(artist){
    currentView={type:'artist',name:artist};
    grid.innerHTML='';
    visibleCards=[]; selectedIndex=-1;

    const container=document.createElement('div');
    const header=document.createElement('div'); header.className='artist-header';

    const pfp=document.createElement('img'); pfp.className='big-pfp';
    pfp.src=fileUrl(artistProfiles[artist]?.pfp)||PLACEHOLDER_PFP;
    header.appendChild(pfp);

    const meta=document.createElement('div'); meta.className='artist-meta';
    const titleEl=document.createElement('h1'); titleEl.textContent=artist; meta.appendChild(titleEl);
    const bio=document.createElement('p'); bio.textContent=artistProfiles[artist]?.bio||'No bio yet.'; meta.appendChild(bio);

    const actions=document.createElement('div'); actions.className='artist-actions';
    const setPfpBtn=document.createElement('button'); setPfpBtn.textContent='Set Profile Picture';
    setPfpBtn.onclick=async ()=>{
      const f = await window.electronAPI.selectThumbnail();
      if(f){ artistProfiles[artist] = artistProfiles[artist]||{}; artistProfiles[artist].pfp=f; pfp.src=fileUrl(f); saveState(); render(); }
    };
    actions.appendChild(setPfpBtn);

    const editBioBtn=document.createElement('button'); editBioBtn.textContent='Edit Bio'; editBioBtn.addEventListener('click', ()=> showBioModal(artist));
    actions.appendChild(editBioBtn);

    const back=document.createElement('button'); back.textContent='← Back'; back.onclick=()=> renderGrid(); actions.appendChild(back);

    meta.appendChild(actions); header.appendChild(meta); container.appendChild(header);

    const listWrap=document.createElement('div');
    listWrap.style.display='grid';
    listWrap.style.gridTemplateColumns='repeat(auto-fill,minmax(320px,1fr))';
    listWrap.style.gap='12px';
    listWrap.style.marginTop='18px';

    const filtered=videos.filter(v=>v.parent===artist);
    applySort(filtered);
    for(const v of filtered){ const cardEl=createCardElement(v); listWrap.appendChild(cardEl); }

    container.appendChild(listWrap);
    grid.appendChild(container);
  }

  function createCardElement(v){
    const frag=template.content.cloneNode(true);
    const card=frag.querySelector('.card');
    const canvas=frag.querySelector('.thumb-canvas');
    const thumbImg=frag.querySelector('.thumb-img');
    const preview=frag.querySelector('video.preview');
    const title=frag.querySelector('.title');
    const artistName=frag.querySelector('.artist-name');
    const pill=frag.querySelector('.duration-pill');
    const artistPfp=frag.querySelector('.artist-pfp');
    const pinIcon=frag.querySelector('.pin-icon');

    card.dataset.path=v.path; card.tabIndex=0;
    card.addEventListener('mouseenter', ()=> card.style.boxShadow='0 12px 36px rgba(2,6,23,0.7)');
    card.addEventListener('mouseleave', ()=> card.style.boxShadow='0 6px 18px rgba(2,6,23,0.6)');

    title.textContent=v.title;
    artistName.textContent=v.parent;
    artistPfp.src=fileUrl(artistProfiles[v.parent]?.pfp)||PLACEHOLDER_PFP;

    pinIcon.hidden = !pinned.has(v.path);

    const thumbToUse = v.customThumbnail || customThumbs[v.path] || v.sidecarThumbnail || null;
    if(thumbToUse){
      thumbImg.src=fileUrl(thumbToUse);
      thumbImg.style.display='block'; canvas.style.display='none';
      setDurationForVideo(v.path,pill);
      thumbImg.onerror = ()=>{ thumbImg.style.display='none'; canvas.style.display='block'; setDurationForVideo(v.path,pill); };
    } else {
      const videoEl = document.createElement('video');
      videoEl.preload='metadata'; videoEl.muted=true; videoEl.src=fileUrl(v.path);
      videoEl.addEventListener('loadedmetadata', ()=>{ const dur=videoEl.duration||0; pill.textContent=formatDuration(dur); const seekTo=Math.min(2,Math.max(0.1,dur*0.05)); videoEl.currentTime=seekTo; });
      videoEl.addEventListener('seeked', ()=>{ try{ const ctx=canvas.getContext('2d'); canvas.width=canvas.clientWidth*devicePixelRatio; canvas.height=canvas.clientHeight*devicePixelRatio; ctx.drawImage(videoEl,0,0,canvas.width,canvas.height); }catch(e){} });
      setDurationForVideo(v.path,pill);
    }

    preview.src=fileUrl(v.path); preview.loop=true;
    const thumbwrap=frag.querySelector('.thumbwrap');
    thumbwrap.addEventListener('mouseenter', ()=>{ preview.style.display='block'; preview.play().catch(()=>{}); thumbwrap.style.transform='scale(1.02)'; });
    thumbwrap.addEventListener('mouseleave', ()=>{ preview.pause(); preview.style.display='none'; thumbwrap.style.transform='scale(1)'; });

    card.addEventListener('click', ()=> selectCardByPath(v.path));
    card.addEventListener('focus', ()=>{ const idx=visibleCards.findIndex(x=>x.path===v.path); if(idx!==-1) setSelectedIndex(idx); });
    card.addEventListener('dblclick', ()=> window.electronAPI.openFile(v.path).catch(err=>console.warn('openFile failed',err)));

    card.addEventListener('contextmenu', async (e)=>{
      e.preventDefault(); const existing=document.querySelector('.context-menu'); if(existing) existing.remove();
      const menu=document.createElement('div'); menu.className='context-menu';
      menu.style.position='fixed'; menu.style.top=`${e.clientY}px`; menu.style.left=`${e.clientX}px`;
      menu.style.background='#222'; menu.style.padding='6px'; menu.style.borderRadius='8px'; menu.style.boxShadow='0 8px 30px rgba(0,0,0,0.5)'; menu.style.zIndex='10000';

      const pinOption=document.createElement('div'); pinOption.className='context-item'; pinOption.textContent=pinned.has(v.path)?'Unpin from top':'Pin to top';
      pinOption.onclick=()=>{ if(pinned.has(v.path)) pinned.delete(v.path); else pinned.add(v.path); saveState(); renderCurrentView(); menu.remove(); };
      menu.appendChild(pinOption);

      const playOption=document.createElement('div'); playOption.className='context-item'; playOption.textContent='Open with system player';
      playOption.onclick=()=>{ window.electronAPI.openFile(v.path); menu.remove(); }; menu.appendChild(playOption);

      const thumbOption=document.createElement('div'); thumbOption.className='context-item'; thumbOption.textContent='Set Custom Thumbnail';
      thumbOption.onclick=async ()=>{ const file=await window.electronAPI.selectThumbnail(); if(file){ v.customThumbnail=file; customThumbs[v.path]=file; saveState(); renderCurrentView(); } menu.remove(); };
      menu.appendChild(thumbOption);

      const removeThumb=document.createElement('div'); removeThumb.className='context-item'; removeThumb.textContent='Remove Custom Thumbnail';
      removeThumb.onclick=()=>{ if(customThumbs[v.path]) delete customThumbs[v.path]; if(v.customThumbnail) delete v.customThumbnail; saveState(); renderCurrentView(); menu.remove(); };
      menu.appendChild(removeThumb);

      document.body.appendChild(menu); document.addEventListener('click', ()=> menu.remove(), { once: true });
    });

    visibleCards.push({el:card,path:v.path});
    return card;
  }

  function addVideoCard(v){ grid.appendChild(createCardElement(v)); }

  function renderCurrentView(){
    if(currentView.type==='grid') renderGrid();
    else if(currentView.type==='artist') renderArtist(currentView.name);
  }

  function selectCardByPath(p){
    const idx=visibleCards.findIndex(c=>c.path===p);
    if(idx!==-1) setSelectedIndex(idx);
  }

  function setSelectedIndex(idx){
    if(idx<0 || idx>=visibleCards.length) return;
    if(selectedIndex!==-1) visibleCards[selectedIndex].el.classList.remove('selected');
    selectedIndex=idx;
    visibleCards[selectedIndex].el.classList.add('selected');
    visibleCards[selectedIndex].el.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  // Keyboard nav
  document.addEventListener('keydown', e=>{
    if(!visibleCards.length) return;
    if(e.key==='ArrowRight'){ setSelectedIndex(Math.min(selectedIndex+1,visibleCards.length-1)); e.preventDefault(); }
    if(e.key==='ArrowLeft'){ setSelectedIndex(Math.max(selectedIndex-1,0)); e.preventDefault(); }
    if(e.key==='ArrowDown'){ setSelectedIndex(Math.min(selectedIndex+4,visibleCards.length-1)); e.preventDefault(); }
    if(e.key==='ArrowUp'){ setSelectedIndex(Math.max(selectedIndex-4,0)); e.preventDefault(); }
    if(e.key==='Enter'){ if(selectedIndex!==-1) window.electronAPI.openFile(visibleCards[selectedIndex].path); }
  });

})();
