(async function(){
  console.log('[SumoTube] Renderer startup');

  // Elements
  const openFolderSmall = document.getElementById('openFolderSmall');
  const refreshBtn = document.getElementById('refreshBtn');
  const sortSelect = document.getElementById('sortSelect');
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const artistsEl = document.getElementById('artists');
  const playlistsEl = document.getElementById('playlists');
  const addPlaylistBtn = document.getElementById('addPlaylistBtn');
  const template = document.getElementById('card-template');
  const bioModal = document.getElementById('bioModal');
  const modalArtistName = document.getElementById('modalArtistName');
  // NEW ELEMENT: Input for display name
  const modalDisplayNameInput = document.getElementById('modalDisplayNameInput'); 
  const modalBioInput = document.getElementById('modalBioInput');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');
  // Bio modal specific elements for PFP
  const modalSelectPfp = document.getElementById('modalSelectPfp');
  const modalPfpPreview = document.getElementById('modalPfpPreview');

  // Playlist modal elements
  const playlistModal = document.getElementById('playlistModal');
  const playlistModalTitle = document.getElementById('playlistModalTitle');
  const playlistNameInput = document.getElementById('playlistNameInput');
  const playlistDescInput = document.getElementById('playlistDescInput');
  const playlistSelectThumb = document.getElementById('playlistSelectThumb');
  const playlistThumbPreview = document.getElementById('playlistThumbPreview');
  const playlistSave = document.getElementById('playlistSave');
  const playlistCancel = document.getElementById('playlistCancel');

  // Metadata modal elements
  const metaModal = document.getElementById('metaModal');
  const metaModalTitle = document.getElementById('metaModalTitle');
  const metaTitleInput = document.getElementById('metaTitleInput');
  const metaArtistInput = document.getElementById('metaArtistInput');
  const metaSave = document.getElementById('metaSave');
  const metaCancel = document.getElementById('metaCancel');

  // small placeholder SVG for artists without pfp
  const PLACEHOLDER_PFP = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><rect fill="#0b1220" width="24" height="24" rx="4"/><g fill="#9aa4b2"><circle cx="12" cy="8" r="3"/><path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v.5H4V20z"/></g></svg>`);

  // State
  let videos = [];
  let pinned = new Set();
  let artistProfiles = {}; // Stores { originalArtistName: { displayName: '...', bio: '...', pfp: '...' } }
  let customThumbs = {};
  let playlists = []; // each: { id, name, description, pfp, videos: [path] }
  let customMetadata = {}; // { [path]: { title: '...', parent: '...' } }
  let currentView = { type: 'grid' };
  let editingArtist = null; // The original artist name (folder name)
  let currentFolder = null;
  let editingVideoPath = null;
  // State for temporary PFP path
  let editingArtistPfpPath = null;

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
      customMetadata = parsed.customMetadata || {};
      playlists = parsed.playlists || [];
    }catch(e){console.warn('Failed to load state',e)}
  }

  function saveState(){
    const payload = { pinned: Array.from(pinned), artistProfiles, customThumbs, playlists, customMetadata };
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

  // UPDATED: showBioModal now sets up PFP and Display Name
  function showBioModal(artist){
    editingArtist = artist; // This is the original folder name
    
    const profile = artistProfiles[artist];
    const currentDisplayName = profile?.displayName || artist;

    modalArtistName.textContent = `Edit Info for: ${currentDisplayName}`;
    modalDisplayNameInput.value = currentDisplayName;
    modalBioInput.value = profile?.bio || '';
    
    // Set up PFP preview
    const pfpPath = profile?.pfp;
    modalPfpPreview.src = pfpPath ? fileUrl(pfpPath) : PLACEHOLDER_PFP;
    editingArtistPfpPath = pfpPath; // Set initial path
    
    bioModal.removeAttribute('hidden');
    modalDisplayNameInput.focus();
  }

  modalCancel.addEventListener('click', ()=>{ 
    bioModal.setAttribute('hidden',''); 
    editingArtist=null; 
    editingArtistPfpPath = null; 
  });
  
  // Handle PFP selection inside the Bio modal
  modalSelectPfp.addEventListener('click', async ()=>{
    try{
      const f = await window.electronAPI.selectThumbnail();
      if(f){
        modalPfpPreview.src = fileUrl(f);
        editingArtistPfpPath = f; // Store temp path
      }
    }catch(e){ console.warn('select artist pfp failed', e); }
  });

  // UPDATED: modalSave now saves PFP, Bio, AND Display Name
  modalSave.addEventListener('click', ()=>{
    if(!editingArtist) return;
    
    const newDisplayName = modalDisplayNameInput.value.trim();
    const newBio = modalBioInput.value.trim();
    const originalName = editingArtist;
    
    // Check if we need to keep the profile entry at all
    const isNameChanged = newDisplayName !== originalName;
    const isBioEmpty = newBio === '';
    const isPfpEmpty = !editingArtistPfpPath;

    artistProfiles[originalName] = artistProfiles[originalName]||{};
    const profile = artistProfiles[originalName];

    // 1. Save Display Name
    if(isNameChanged) profile.displayName = newDisplayName;
    else if(profile.displayName) delete profile.displayName;

    // 2. Save Bio
    if(!isBioEmpty) profile.bio = newBio;
    else if(profile.bio) delete profile.bio;

    // 3. Save PFP
    if(editingArtistPfpPath) profile.pfp = editingArtistPfpPath;
    else if(profile.pfp) delete profile.pfp;
    
    // Clean up profile entry if nothing is customized
    if(Object.keys(profile).length === 0) delete artistProfiles[originalName];

    saveState();
    
    // Re-render everything to update all video cards and sidebars
    renderCurrentView(); 
    buildArtists(); // Ensure the sidebar list updates

    bioModal.setAttribute('hidden','');
    editingArtist=null;
    editingArtistPfpPath = null;
  });

  // Metadata modal logic
  function showMetaModal(video){
    const rawVideo = videos.find(v=>v.path===video.path);
    if(!rawVideo) return;
    
    editingVideoPath = video.path;
    const currentMeta = customMetadata[editingVideoPath];
    
    metaModalTitle.textContent = 'Edit Display Info: ' + rawVideo.name;
    metaTitleInput.value = currentMeta?.title || rawVideo.title;
    // NOTE: metaArtistInput should still default to the original parent for easy removal
    metaArtistInput.value = currentMeta?.parent || rawVideo.originalParent; 
    
    metaModal.removeAttribute('hidden');
    metaTitleInput.focus();
  }
  
  metaCancel.addEventListener('click', ()=>{ metaModal.setAttribute('hidden',''); editingVideoPath=null; });
  metaSave.addEventListener('click', ()=>{
    if(!editingVideoPath) return;
    
    const newTitle = metaTitleInput.value.trim();
    const newArtist = metaArtistInput.value.trim();

    const rawVideo = videos.find(v=>v.path===editingVideoPath);
    if(!rawVideo) return;
    
    const isDefaultTitle = newTitle === rawVideo.title;
    const isDefaultArtist = newArtist === rawVideo.originalParent;

    if(isDefaultTitle && isDefaultArtist){
      if(customMetadata[editingVideoPath]) delete customMetadata[editingVideoPath];
    } else {
      customMetadata[editingVideoPath] = customMetadata[editingVideoPath] || {};
      
      if(!isDefaultTitle) customMetadata[editingVideoPath].title = newTitle;
      else if (customMetadata[editingVideoPath].title) delete customMetadata[editingVideoPath].title;

      if(!isDefaultArtist) customMetadata[editingVideoPath].parent = newArtist;
      else if (customMetadata[editingVideoPath].parent) delete customMetadata[editingVideoPath].parent;

      if(Object.keys(customMetadata[editingVideoPath]).length === 0) delete customMetadata[editingVideoPath];
    }
    
    saveState();
    
    const vIdx = videos.findIndex(v=>v.path===editingVideoPath);
    if(vIdx !== -1) {
      videos[vIdx] = getDisplayVideo(rawVideo);
    }
    
    renderCurrentView();

    metaModal.setAttribute('hidden','');
    editingVideoPath=null;
  });

  // Playlist helpers (unchanged)
  function generateId(){ return 'pl-' + Date.now() + '-' + Math.random().toString(36).slice(2,8); }
  function getPlaylistById(id){ return playlists.find(p=>p.id===id); }
  function isVideoInAnyPlaylist(path){ return playlists.some(p=>p.videos && p.videos.includes(path)); }
  function countPlaylistsContaining(path){ return playlists.reduce((acc,p)=> acc + ((p.videos||[]).includes(path)?1:0), 0); }
  function addVideoToPlaylist(id, path){ const p=getPlaylistById(id); if(!p) return; p.videos = p.videos || []; if(!p.videos.includes(path)) p.videos.push(path); saveState(); }
  function removeVideoFromPlaylist(id, path){ const p=getPlaylistById(id); if(!p) return; p.videos = p.videos || []; const idx = p.videos.indexOf(path); if(idx!==-1) p.videos.splice(idx,1); saveState(); }
  function createPlaylist(opts={name:'New playlist', description:'', pfp:null, initialVideo:null}){
    const id = generateId();
    const pl = { id, name:opts.name||'New playlist', description:opts.description||'', pfp:opts.pfp||null, videos:[] };
    if(opts.initialVideo) pl.videos.push(opts.initialVideo);
    playlists.push(pl);
    saveState();
    return pl;
  }
  function deletePlaylist(id){
    const idx = playlists.findIndex(p=>p.id===id);
    if(idx!==-1){ playlists.splice(idx,1); saveState(); }
  }
  function updatePlaylist(id, updates){
    const p = getPlaylistById(id);
    if(!p) return;
    Object.assign(p, updates);
    saveState();
  }

  // Playlist modal open helpers (unchanged)
  let playlistModalMode = null; // 'create' or 'edit'
  let playlistModalEditingId = null;
  function openPlaylistModalForCreate(initialVideo){
    playlistModalMode = 'create';
    playlistModalEditingId = null;
    playlistModalTitle.textContent = 'New Playlist';
    playlistNameInput.value = '';
    playlistDescInput.value = '';
    playlistThumbPreview.style.display = 'none';
    playlistThumbPreview.src = '';
    playlistModal.removeAttribute('hidden');
    playlistNameInput.focus();
    playlistModal.dataset.initialVideo = initialVideo || '';
  }
  function openPlaylistModalForEdit(id){
    const pl = getPlaylistById(id);
    if(!pl) return;
    playlistModalMode = 'edit';
    playlistModalEditingId = id;
    playlistModalTitle.textContent = 'Edit Playlist';
    playlistNameInput.value = pl.name || '';
    playlistDescInput.value = pl.description || '';
    if(pl.pfp){
      playlistThumbPreview.src = fileUrl(pl.pfp);
      playlistThumbPreview.style.display = 'block';
    } else {
      playlistThumbPreview.style.display = 'none';
      playlistThumbPreview.src = '';
    }
    playlistModal.removeAttribute('hidden');
    playlistNameInput.focus();
  }

  playlistCancel.addEventListener('click', ()=>{ playlistModal.setAttribute('hidden',''); playlistModalMode=null; playlistModalEditingId=null; delete playlistModal.dataset.initialVideo; });
  playlistSelectThumb.addEventListener('click', async ()=>{
    try{
      const f = await window.electronAPI.selectThumbnail();
      if(f){
        playlistThumbPreview.src = fileUrl(f);
        playlistThumbPreview.style.display = 'block';
        playlistModal.dataset.selectedThumb = f;
      }
    }catch(e){ console.warn('select playlist thumb failed', e); }
  });

  playlistSave.addEventListener('click', ()=>{
    const name = (playlistNameInput.value || '').trim();
    const desc = (playlistDescInput.value || '').trim();
    const tempThumb = playlistModal.dataset.selectedThumb || null;

    if(!name){
      alert('Please enter a playlist name.');
      return;
    }

    if(playlistModalMode === 'create'){
      const initialVideo = playlistModal.dataset.initialVideo || null;
      const pl = createPlaylist({ name, description: desc, pfp: tempThumb, initialVideo: initialVideo || null });
      playlistModal.setAttribute('hidden','');
      playlistModalMode=null;
      playlistModalEditingId=null;
      delete playlistModal.dataset.initialVideo;
      delete playlistModal.dataset.selectedThumb;
      renderCurrentView();
    } else if(playlistModalMode === 'edit' && playlistModalEditingId){
      updatePlaylist(playlistModalEditingId, {
        name,
        description: desc,
        pfp: tempThumb || getPlaylistById(playlistModalEditingId).pfp || null
      });
      playlistModal.setAttribute('hidden','')
      playlistModalMode=null;
      playlistModalEditingId=null;
      delete playlistModal.dataset.selectedThumb;
      renderCurrentView();
    }
  });

  // Apply sort (unchanged)
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

  // UPDATED: getDisplayVideo now looks up the artist's display name
  function getDisplayVideo(rawVideo){
    const meta = customMetadata[rawVideo.path];
    const artistProfile = artistProfiles[rawVideo.parent];
    
    // Video-specific artist override has priority over artist profile display name
    const displayParent = meta?.parent || artistProfile?.displayName || rawVideo.parent;

    return {
      ...rawVideo,
      title: meta?.title || rawVideo.title,
      parent: displayParent, // The name shown on the card
      originalParent: rawVideo.parent, // The folder/source name
      isCustomTitle: !!meta?.title,
      isCustomParent: !!meta?.parent || !!artistProfile?.displayName, // true if video override OR artist profile override is present
    }
  }

  // Restore last folder (unchanged)
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
          videos = normalizeFiles(res.files).map(getDisplayVideo);
          for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail = customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
          currentView={type:'grid'};
          if(sortSelect?.value==='random') shuffleArray(videos);
          render();
        }
      }catch(e){ console.error('[SumoTube] Error restoring last folder:', e); }
    }
  }

  // Folder open / refresh (unchanged)
  openFolderSmall?.addEventListener('click', async ()=>{
    try{
      let lastFolder = currentFolder;
      if(!lastFolder && window.electronAPI?.getLastFolder) lastFolder = await window.electronAPI.getLastFolder();
      const res = await window.electronAPI.chooseFolder(lastFolder ? { defaultPath: lastFolder } : undefined);
      if(res && !res.canceled){
        currentFolder=res.folder;
        if(window.electronAPI?.setLastFolder) await window.electronAPI.setLastFolder(currentFolder);
        videos = normalizeFiles(res.files).map(getDisplayVideo);
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
          videos = normalizeFiles(res.files).map(getDisplayVideo);
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
        videos = normalizeFiles(res.files).map(getDisplayVideo);
        for(const v of videos){ if(customThumbs[v.path]) v.customThumbnail=customThumbs[v.path]; if(v.sidecar && !v.customThumbnail) v.sidecarThumbnail=v.sidecar; }
        if(sortSelect?.value==='random') shuffleArray(videos);
        render();
      }
    }catch(err){ console.error('refresh failed',err); }
  });

  sortSelect?.addEventListener('change', ()=> render());
  search?.addEventListener('input', ()=> render());
  addPlaylistBtn?.addEventListener('click', ()=> openPlaylistModalForCreate(null));

  // Renders
  function buildPlaylists(){
    if(!playlistsEl) return;
    playlistsEl.innerHTML='';
    for(const p of playlists){
      const li=document.createElement('li');
      li.textContent=`${p.name} (${(p.videos||[]).length})`;
      li.onclick=()=>{ currentView={type:'playlist',id:p.id}; render(); };
      li.addEventListener('mouseenter', ()=> li.style.background='rgba(255,255,255,0.03)');
      li.addEventListener('mouseleave', ()=> li.style.background='transparent');

      li.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        const existing=document.querySelector('.context-menu');
        if(existing) existing.remove();
        const menu=document.createElement('div'); menu.className='context-menu';
        menu.style.position='fixed'; menu.style.top=`${e.clientY}px`; menu.style.left=`${e.clientX}px`;
        menu.style.background='#222'; menu.style.padding='6px'; menu.style.borderRadius='8px'; menu.style.boxShadow='0 8px 30px rgba(0,0,0,0.5)'; menu.style.zIndex='10000';

        const edit=document.createElement('div'); edit.className='context-item'; edit.textContent='Edit playlist';
        edit.onclick=()=>{ openPlaylistModalForEdit(p.id); menu.remove(); };
        menu.appendChild(edit);

        const del=document.createElement('div'); del.className='context-item'; del.textContent='Delete playlist';
        del.onclick=()=>{ if(confirm(`Delete playlist "${p.name}"?`)){ deletePlaylist(p.id); render(); } menu.remove(); };
        menu.appendChild(del);

        document.body.appendChild(menu);
        document.addEventListener('click', ()=> menu.remove(), { once: true });
      });

      playlistsEl.appendChild(li);
    }
  }

  // UPDATED: buildArtists now uses the artist's display name
  function buildArtists(){
    const map=new Map();
    for(const v of videos){
      const artist=v.originalParent||'Unknown';
      if(!map.has(artist)) map.set(artist,[]);
      map.get(artist).push(v);
    }
    artistsEl.innerHTML='';
    for(const [originalName,list] of map.entries()){
      const displayName = artistProfiles[originalName]?.displayName || originalName;
      const li=document.createElement('li');
      li.textContent=`${displayName} (${list.length})`;
      li.onclick=()=>{ currentView={type:'artist',name:originalName}; render(); }; // Note: we use originalName for navigation
      li.addEventListener('mouseenter', ()=> li.style.background='rgba(255,255,255,0.03)');
      li.addEventListener('mouseleave', ()=> li.style.background='transparent');
      artistsEl.appendChild(li);
    }
  }

  function renderGrid(){
    currentView={type:'grid'};
    grid.innerHTML='';
    buildArtists();
    buildPlaylists();
    visibleCards=[]; selectedIndex=-1;
    const q=(search?.value||'').trim().toLowerCase();
    let filtered=videos.filter(v=> !q || v.title.toLowerCase().includes(q) || (v.parent||'').toLowerCase().includes(q) || (v.originalParent||'').toLowerCase().includes(q));
    applySort(filtered);
    for(const v of filtered) addVideoCard(v);
  }

  // UPDATED: renderArtist now uses the artist's display name
  function renderArtist(originalArtist){
    currentView={type:'artist',name:originalArtist};
    grid.innerHTML='';
    visibleCards=[]; selectedIndex=-1;

    const profile = artistProfiles[originalArtist];
    const displayName = profile?.displayName || originalArtist;

    const container=document.createElement('div');
    const header=document.createElement('div'); header.className='artist-header';

    const pfp=document.createElement('img'); pfp.className='big-pfp';
    pfp.src=fileUrl(profile?.pfp)||PLACEHOLDER_PFP;
    header.appendChild(pfp);

    const meta=document.createElement('div'); meta.className='artist-meta';
    const titleEl=document.createElement('h1'); titleEl.textContent=displayName; meta.appendChild(titleEl);
    const bio=document.createElement('p'); bio.textContent=profile?.bio||'No bio yet.'; meta.appendChild(bio);

    const actions=document.createElement('div'); actions.className='artist-actions';
    
    // CONSOLIDATED BUTTON: "Edit Info"
    const editInfoBtn=document.createElement('button'); editInfoBtn.textContent='Edit Info'; 
    editInfoBtn.addEventListener('click', ()=> showBioModal(originalArtist));
    actions.appendChild(editInfoBtn);

    const back=document.createElement('button'); back.textContent='← Back'; back.onclick=()=> renderGrid(); actions.appendChild(back);

    meta.appendChild(actions); header.appendChild(meta); container.appendChild(header);

    const listWrap=document.createElement('div');
    listWrap.style.display='grid';
    listWrap.style.gridTemplateColumns='repeat(auto-fill,minmax(320px,1fr))';
    listWrap.style.gap='16px';
    listWrap.style.marginTop='18px';

    const filtered=videos.filter(v=>v.originalParent===originalArtist);
    applySort(filtered);
    for(const v of filtered){ const cardEl=createCardElement(v); listWrap.appendChild(cardEl); }

    container.appendChild(listWrap);
    grid.appendChild(container);
  }

  // renderPlaylist (unchanged)
  function renderPlaylist(playlistId){
    const pl = getPlaylistById(playlistId);
    if(!pl) return renderGrid();
    currentView={type:'playlist',id:playlistId};
    grid.innerHTML='';
    visibleCards=[]; selectedIndex=-1;

    const container=document.createElement('div');
    const header=document.createElement('div'); header.className='artist-header';

    const pfp=document.createElement('img'); pfp.className='big-pfp';
    pfp.src=fileUrl(pl.pfp)||PLACEHOLDER_PFP;
    header.appendChild(pfp);

    const meta=document.createElement('div'); meta.className='artist-meta';
    const titleEl=document.createElement('h1'); titleEl.textContent=pl.name; meta.appendChild(titleEl);
    const bio=document.createElement('p'); bio.textContent=pl.description||'No description yet.'; meta.appendChild(bio);

    const actions=document.createElement('div'); actions.className='artist-actions';
    
    // CONSOLIDATED BUTTON: "Edit Playlist"
    const editDescBtn=document.createElement('button'); editDescBtn.textContent='Edit Playlist';
    editDescBtn.addEventListener('click', ()=>{
      openPlaylistModalForEdit(pl.id);
    });
    actions.appendChild(editDescBtn);

    const back=document.createElement('button'); back.textContent='← Back'; back.onclick=()=> renderGrid(); actions.appendChild(back);

    meta.appendChild(actions); header.appendChild(meta); container.appendChild(header);

    const listWrap=document.createElement('div');
    listWrap.style.display='grid';
    listWrap.style.gridTemplateColumns='repeat(auto-fill,minmax(320px,1fr))';
    listWrap.style.gap='16px';
    listWrap.style.marginTop='18px';

    const filtered = (pl.videos||[]).map(pv=> videos.find(v=>v.path===pv)).filter(Boolean);
    applySort(filtered);
    for(const v of filtered){ const cardEl=createCardElement(v); listWrap.appendChild(cardEl); }

    container.appendChild(listWrap);
    grid.appendChild(container);
  }

  // UPDATED: createCardElement uses v.parent (the display name) for the card meta
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
    artistName.textContent=v.parent; // This is now the display name
    // We must use the ORIGINAL folder name to find the profile
    artistPfp.src=fileUrl(artistProfiles[v.originalParent]?.pfp)||PLACEHOLDER_PFP;

    pinIcon.hidden = !pinned.has(v.path);
    
    if(v.isCustomTitle) title.classList.add('custom-meta-override');
    else title.classList.remove('custom-meta-override');
    
    if(v.isCustomParent) artistName.classList.add('custom-meta-override');
    else artistName.classList.remove('custom-meta-override');

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
  e.preventDefault();
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  Object.assign(menu.style, {
    position: 'fixed',
    top: `${e.clientY}px`,
    left: `${e.clientX}px`,
    background: '#222',
    padding: '6px',
    borderRadius: '8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    zIndex: '10000',
    whiteSpace: 'nowrap',
    minWidth: '180px',
  });

  const makeItem = (text, onClick, cursor='pointer') => {
    const item = document.createElement('div');
    item.className = 'context-item';
    item.textContent = text;
    Object.assign(item.style, {
      padding: '6px 10px',
      cursor,
    });
    item.addEventListener('mouseenter', ()=> item.style.background = 'rgba(255,255,255,0.04)');
    item.addEventListener('mouseleave', ()=> item.style.background = 'transparent');
    item.addEventListener('click', (ev)=> {
      ev.stopPropagation();
      try { onClick(ev); } catch(err) { console.warn(err); }
    });
    return item;
  };

  // --- options ---
  const pinOption = makeItem(pinned.has(v.path) ? 'Unpin from top' : 'Pin to top', ()=>{
    if(pinned.has(v.path)) pinned.delete(v.path); else pinned.add(v.path);
    saveState();
    renderCurrentView();
    cleanup();
  });
  menu.appendChild(pinOption);

  const thumbOption = makeItem('Set Custom Thumbnail', async ()=>{
    const file = await window.electronAPI.selectThumbnail();
    if(file){ v.customThumbnail = file; customThumbs[v.path] = file; saveState(); renderCurrentView(); }
    cleanup();
  });
  menu.appendChild(thumbOption);

  const removeThumb = makeItem('Remove Custom Thumbnail', ()=>{
    if(customThumbs[v.path]) delete customThumbs[v.path];
    if(v.customThumbnail) delete v.customThumbnail;
    saveState();
    renderCurrentView();
    cleanup();
  });
  menu.appendChild(removeThumb);

  const editMetaOption = makeItem('Edit Title / Artist', ()=>{
    showMetaModal(v);
    cleanup();
  });
  menu.appendChild(editMetaOption);

  // --- Add to Playlist (submenu) ---
  const addToPl = makeItem('Add to playlist ▶', ()=>{}, 'default');
  menu.appendChild(addToPl);

  // Create submenu
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  Object.assign(submenu.style, {
    position: 'fixed',
    background: '#222',
    padding: '6px',
    borderRadius: '8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
    zIndex: '10001',
    minWidth: '180px',
    display: 'none',
  });

  const populateSubmenu = ()=>{
    submenu.innerHTML = '';
    if(playlists.length === 0){
      const noneEl = makeItem('(no playlists)', ()=>{}, 'default');
      submenu.appendChild(noneEl);
    } else {
      for(const p of playlists){
        const inPl = (p.videos||[]).includes(v.path);
        const item = makeItem(`${inPl ? '✓ ' : ''}${p.name} (${(p.videos||[]).length})`, ()=>{
          if(inPl) removeVideoFromPlaylist(p.id, v.path);
          else addVideoToPlaylist(p.id, v.path);
          saveState();
          renderCurrentView();
          cleanup();
        });
        submenu.appendChild(item);
      }
    }

    const newPlItem = makeItem('Create new playlist...', ()=>{
      openPlaylistModalForCreate(v.path);
      cleanup();
    });
    submenu.appendChild(newPlItem);
  };

  populateSubmenu();
  document.body.appendChild(menu);
  document.body.appendChild(submenu);

  // --- submenu hover logic ---
  let hideTimeout = null;
  const clearHide = ()=> { if(hideTimeout){ clearTimeout(hideTimeout); hideTimeout = null; } };

  const showSubmenu = ()=>{
    clearHide();
    submenu.style.display = 'block';
    submenu.style.visibility = 'hidden';

    const parentRect = addToPl.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();

    let left = parentRect.right + 6;
    let top = parentRect.top;

    if(left + submenuRect.width > window.innerWidth - 8){
      left = parentRect.left - submenuRect.width - 6;
    }
    if(top + submenuRect.height > window.innerHeight - 8){
      top = Math.max(8, window.innerHeight - submenuRect.height - 8);
    }
    if(top < 8) top = 8;

    submenu.style.left = `${Math.round(left)}px`;
    submenu.style.top = `${Math.round(top)}px`;
    submenu.style.visibility = 'visible';
  };

  const scheduleHide = ()=>{
    clearHide();
    hideTimeout = setTimeout(()=> submenu.style.display = 'none', 180);
  };

  addToPl.addEventListener('mouseenter', showSubmenu);
  addToPl.addEventListener('mouseleave', scheduleHide);
  submenu.addEventListener('mouseenter', ()=>{ clearHide(); submenu.style.display = 'block'; });
  submenu.addEventListener('mouseleave', scheduleHide);

  // --- cleanup ---
  const cleanup = ()=>{
    clearHide();
    if(submenu && submenu.parentNode) submenu.remove();
    if(menu && menu.parentNode) menu.remove();
    document.removeEventListener('click', clickHandler);
    window.removeEventListener('resize', cleanup);
    window.removeEventListener('scroll', cleanup);
  };

  const clickHandler = (ev)=>{
    if(!menu.contains(ev.target) && !submenu.contains(ev.target)) cleanup();
  };
  document.addEventListener('click', clickHandler);
  window.addEventListener('resize', cleanup);
  window.addEventListener('scroll', cleanup);

});


    visibleCards.push({el:card,path:v.path});
    return card;
  }

  function addVideoCard(v){ grid.appendChild(createCardElement(v)); }

  function renderCurrentView(){
    if(currentView.type==='grid') renderGrid();
    else if(currentView.type==='artist') renderArtist(currentView.name);
    else if(currentView.type==='playlist') renderPlaylist(currentView.id);
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