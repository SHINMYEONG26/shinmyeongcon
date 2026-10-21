(() => {
  const service = window.PhotoService;
  const managePhotos = ['photos','inquiries'].includes(new URLSearchParams(location.search).get('view'));
  if (!managePhotos) {
    document.title = '관리자 로그인 | 신명건설';
    document.querySelector('h1').textContent = '관리자 로그인';
    document.querySelector('.intro').textContent = '로그인하면 홈페이지 메인화면에서 내용을 수정할 수 있습니다.';
  }
  const el = id => document.getElementById(id);
  const status = (message, error = false) => { el('status').textContent = message; el('status').classList.toggle('error', error); };
  let previews = [], selected = [], busy = false, coverFile = null;
  let libraryPhotos = [], libraryCategory = 'all';
  let orderGroups=[];const openAlbums=new Set();
 const orderTools=document.createElement('div');orderTools.className='album-order-tools';
 const orderHint=document.createElement('p');orderHint.textContent='앨범과 사진 순서를 바꾼 뒤 저장하세요. 대표사진도 앨범 안에서 선택할 수 있습니다.';
 const saveOrder=document.createElement('button');saveOrder.type='button';saveOrder.textContent='노출 순서 저장';
 const orderStatus=document.createElement('p');orderStatus.setAttribute('role','status');orderStatus.className='album-order-status';
 orderTools.append(orderHint,saveOrder,orderStatus);el('library-filters').before(orderTools);
 saveOrder.addEventListener('click',async()=>{if(busy||!SiteAlbumOrder.dirty)return;setBusy(true);saveOrder.disabled=true;orderStatus.textContent='순서를 저장하는 중입니다…';try{await SiteAlbumOrder.save(orderGroups,(n,total)=>{orderStatus.textContent=n+'/'+total+'장 순서 저장 중…';});await loadLibrary();orderStatus.textContent='노출 순서를 저장했습니다. 홈페이지에 반영됩니다.';}catch(e){orderStatus.textContent=e.message;status(e.message,true);}finally{setBusy(false);saveOrder.disabled=!SiteAlbumOrder.dirty;}});
 const filterButtons = [];
  for (const [category, label] of [['all', '전체'], ...Object.entries({'composite-sheet':'외벽공사',color:'지붕공사','interior-exterior':'내부인테리어'})]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.setAttribute('aria-pressed', String(category === libraryCategory));
    button.addEventListener('click', () => {
      libraryCategory = category;
      filterButtons.forEach(item => item.button.setAttribute('aria-pressed', String(item.category === category)));
      renderLibrary();
    });
    filterButtons.push({category, button});
    el('library-filters').append(button);
  }
  const clearPreviews = () => { previews.forEach(URL.revokeObjectURL); previews = []; el('previews').replaceChildren(); };
  const showLogin = () => { el('login-panel').hidden = false; el('upload-panel').hidden = true; el('library-panel').hidden = true; document.dispatchEvent(new CustomEvent('admin-state',{detail:{loggedIn:false}})); };
  const showAdmin = async () => {
    el('login-panel').hidden = true; el('upload-panel').hidden = false; el('library-panel').hidden = false;
    document.dispatchEvent(new CustomEvent('admin-state',{detail:{loggedIn:true}}));
    await loadLibrary();
  };
  async function enterAfterLogin() {
    if (managePhotos) return showAdmin();
    // Bypass cached home pages that still use persistent, pre-v37 auth.
    location.replace('index.html?v=20261018-v44#home');
  }
  async function loadLibrary() {
    try {
      libraryPhotos = await service.list();
      if(!SiteAlbumOrder.dirty){try{await SiteAlbumOrder.load(libraryPhotos);}catch(e){status(e.message,true);}}
      el('site-names').replaceChildren(...[...new Set(libraryPhotos.map(p=>SiteAlbums.parse(p).site))].map(name=>{const option=document.createElement('option');option.value=name;return option;}));
      renderLibrary();
    } catch (error) { status(error.message,true); }
  }
  function renderLibrary() {
 orderGroups=SiteAlbumOrder.apply(SiteAlbums.group(libraryPhotos));
 const groups=libraryCategory==='all'?orderGroups:orderGroups.filter(a=>libraryCategory==='composite-sheet'?['composite-sheet','temba-zinc','metal-siding','sandwich-panel'].includes(a.photos[0].category):a.photos[0].category===libraryCategory);
 el('library').classList.add('album-library');el('library').replaceChildren();
 el('library-count').textContent=groups.length+'개 앨범 · '+groups.reduce((n,a)=>n+a.photos.length,0)+'장';
 saveOrder.disabled=busy||!SiteAlbumOrder.dirty;
 if(SiteAlbumOrder.dirty)orderStatus.textContent='변경한 순서가 아직 저장되지 않았습니다.';
 if(!groups.length){el('library').textContent='아직 등록된 앨범이 없습니다.';return;}
 for(const album of groups){
 const card=document.createElement('section');card.className='admin-album';card.dataset.albumKey=album.orderKey;
 const header=document.createElement('div');header.className='admin-album-header';
 const coverImg=document.createElement('img');coverImg.src=album.cover.url;coverImg.alt=album.name+' 대표사진';coverImg.loading='lazy';
 const info=document.createElement('div'),title=document.createElement('h3'),count=document.createElement('p'),toggle=document.createElement('button');title.textContent=album.name;count.textContent=album.photos.length+'장 · '+(album.isAi?'AI 생성 예시':'실제 시공사진');
 toggle.type='button';toggle.className='secondary';toggle.textContent=openAlbums.has(album.orderKey)?'사진 접기':'사진 보기';toggle.setAttribute('aria-expanded',String(openAlbums.has(album.orderKey)));toggle.addEventListener('click',()=>{openAlbums.has(album.orderKey)?openAlbums.delete(album.orderKey):openAlbums.add(album.orderKey);renderLibrary();});
 info.append(title,count,toggle);header.append(window.SitePhotoFraming?SitePhotoFraming.frame(coverImg,album.cover.id):coverImg,info);
 const controls=document.createElement('div');controls.className='album-order-controls';const pos=orderGroups.indexOf(album);
 const orderLabel=document.createElement('label');orderLabel.textContent='전체 앨범 노출 순서';const orderInput=document.createElement('input');orderInput.type='number';orderInput.min='1';orderInput.max=orderGroups.length;orderInput.value=pos+1;orderInput.setAttribute('aria-label',album.name+' 앨범 노출 순서');orderLabel.append(orderInput);
 const moveAlbum=(label,getPosition,disabled=false)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=disabled||busy;b.addEventListener('click',()=>{SiteAlbumOrder.moveAlbum(orderGroups,album.orderKey,getPosition());renderLibrary();});return b;};
 controls.append(orderLabel,moveAlbum('앨범 앞으로',()=>pos,pos===0),moveAlbum('앨범 순서 적용',()=>Math.max(1,Math.min(orderGroups.length,Number(orderInput.value)||1))),moveAlbum('앨범 뒤로',()=>pos+2,pos===orderGroups.length-1));
 const grid=document.createElement('div');grid.className='library album-photo-grid';grid.hidden=!openAlbums.has(album.orderKey);grid.setAttribute('aria-label',album.name+' 사진 목록');
 for(const photo of album.photos){
        const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
        figure.dataset.photoId=photo.id;
        img.src = photo.url; img.alt = SiteAlbums.parse(photo).site; img.loading = 'lazy';
        caption.textContent = `${SiteAlbums.parse(photo).caption || album.name} · ${photo.is_ai ? 'AI 생성 예시' : '실제 시공사진'}`;
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'delete-photo'; remove.textContent = '삭제';
        remove.disabled = busy || Boolean(window.adminOperationBusy);
        remove.setAttribute('aria-label', `${photo.title} 사진 삭제`);
        remove.addEventListener('click', async () => {
          if (busy || window.adminOperationBusy || !window.confirm(`「${photo.title}」 사진을 삭제할까요?\n홈페이지에서 사라지며 되돌릴 수 없습니다.`)) return;
          setBusy(true); status('사진을 삭제하는 중입니다…');
          try {
            const result = await service.deletePhoto(photo.id);
            await loadLibrary(); status(result.warning || '사진을 삭제했습니다. 홈페이지를 새로고침하면 반영됩니다.', Boolean(result.warning));
          } catch (error) { status(error.message, true); }
          finally { setBusy(false); }
        });
        const rename=document.createElement('button');rename.type='button';rename.textContent='현장명 수정';
 rename.addEventListener('click',async()=>{if(busy)return;let nameInput=figure.querySelector('[data-site-edit]');if(!nameInput){nameInput=document.createElement('input');nameInput.dataset.siteEdit='true';nameInput.setAttribute('aria-label','수정할 현장명');nameInput.value=SiteAlbums.parse(photo).site;figure.insertBefore(nameInput,rename);rename.textContent='현장명 저장';nameInput.focus();return;}const name=nameInput.value;if(!name?.trim())return;setBusy(true);try{await PhotoEditorService.updatePhoto(photo.id,{title:SiteAlbums.title(name,SiteAlbums.parse(photo).caption),isAi:photo.is_ai});await loadLibrary();status('현장명을 수정했습니다.');}catch(e){status(e.message,true);}finally{setBusy(false);}});
 const replace=document.createElement('button');replace.type='button';replace.textContent='사진 교체';
 const replacement=document.createElement('div');replacement.hidden=true;
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='image/jpeg,image/png,image/webp';fileInput.setAttribute('aria-label','교체할 사진');replacement.append(fileInput);
 replace.addEventListener('click',async()=>{
 if(busy||window.adminOperationBusy)return;
 if(replacement.hidden){replacement.hidden=false;replace.textContent='선택한 사진으로 교체';fileInput.focus();return;}
 const file=fileInput.files[0];if(!file){status('교체할 사진을 선택해 주세요.',true);return;}
 try{PhotoEditorService.validateFile(file);}catch(e){status(e.message,true);return;}
 setBusy(true);status('보정 사진으로 교체하는 중입니다…');
 try{const result=await PhotoEditorService.updatePhoto(photo.id,{title:photo.title,isAi:photo.is_ai,file});await loadLibrary();status(result.warning||'보정 사진으로 교체했습니다.',Boolean(result.warning));}catch(e){status(e.message,true);}finally{setBusy(false);}
 });
 const photoTools=document.createElement('div');photoTools.className='album-photo-tools';
 const index=album.photos.findIndex(p=>p.id===photo.id);
 const number=document.createElement('input');number.type='number';number.min='1';number.max=album.photos.length;number.value=index+1;number.setAttribute('aria-label','사진 노출 순서');
 const move=(label,position,disabled=false)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=disabled||busy;b.addEventListener('click',()=>{SiteAlbumOrder.movePhoto(album,photo.id,position());renderLibrary();});return b};
 const cover=document.createElement('button');cover.type='button';cover.className='secondary';cover.textContent=album.cover.id===photo.id?'현재 대표사진':'대표사진으로 지정';cover.disabled=album.cover.id===photo.id||busy;cover.addEventListener('click',()=>{SiteAlbumOrder.cover(album,photo.id);renderLibrary();});
 photoTools.append(move('사진 앞으로',()=>index,index===0),number,move('사진 순서 적용',()=>Math.max(1,Math.min(album.photos.length,Number(number.value)||1))),move('사진 뒤로',()=>index+2,index===album.photos.length-1),cover);
 const stage=window.SitePhotoFraming?.get(photo.id).stage;if(stage){const badge=document.createElement('strong');badge.textContent=stage;caption.prepend(badge,document.createTextNode(' · '));}
 figure.append(window.SitePhotoFraming?SitePhotoFraming.frame(img,photo.id):img,caption,photoTools,rename,replace,replacement,remove);grid.append(figure);

 }
 card.append(header,controls,grid);el('library').append(card);
 }
 }
  function setBusy(value) {
    busy=value; el('upload-fields').disabled=value; el('logout-button').disabled=value;
    el('refresh-button').disabled=value;
    document.querySelectorAll('#library button,#library input').forEach(button => button.disabled=value);
    window.adminOperationBusy=value;
    document.dispatchEvent(new CustomEvent('admin-busy',{detail:{busy:value}}));
  }
  el('login-form').addEventListener('submit',async event => {
    event.preventDefault(); el('login-button').disabled=true; status('로그인 중입니다…');
    try { await service.login(el('email').value.trim(),el('password').value); el('password').value=''; status(managePhotos ? '사진을 선택해 추가해 주세요.' : '로그인했습니다. 메인화면으로 이동합니다.'); await enterAfterLogin(); }
    catch(error) { status(error.message,true); }
    finally { el('login-button').disabled=false; }
  });
  el('logout-button').addEventListener('click',async()=>{
    if(busy||window.adminOperationBusy)return;
    try { await service.logout(); showLogin(); selected=[]; clearPreviews(); el('upload-form').reset(); status('로그아웃했습니다.'); }
    catch(error) { status(error.message,true); }
  });
  el('refresh-button').addEventListener('click',loadLibrary);
  el('photos').addEventListener('change',async () => {
    clearPreviews(); selected=[]; const files=Array.from(el('photos').files);
    if(files.length>10) { el('photos').value=''; status('한 번에 최대 10장까지 선택해 주세요.',true); return; }
    for(const file of files) {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>8*1024*1024) {
        el('photos').value=''; clearPreviews(); status('JPG·PNG·WEBP 사진을 8MB 이하로 선택해 주세요.',true);return;
      }
    }
    const selectionToken=files;
    selected=selectionToken;
    try {
      for(const file of files) {
        const url=URL.createObjectURL(file); previews.push(url);
        const img=new Image(); img.src=url; await img.decode();
        if(selected!==selectionToken)return;
        const figure=document.createElement('figure'), caption=document.createElement('figcaption');
        img.alt=file.name; caption.textContent=file.name;
 const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='album-cover';radio.checked=file===files[0];if(file===files[0])coverFile=file;radio.addEventListener('change',()=>{coverFile=file;});label.append(radio,document.createTextNode(' 대표사진'));figure.append(img,caption,label); el('previews').append(figure);
      }
      status(files.length ? `${files.length}장을 선택했습니다. 분야와 사진 종류를 확인한 뒤 추가해 주세요.` : '사진을 선택해 주세요.');
    } catch { selected=[]; el('photos').value=''; clearPreviews();status('열 수 없는 사진이 있습니다. 다른 사진을 선택해 주세요.',true); }
  });
  el('upload-form').addEventListener('submit',async event=>{
    event.preventDefault(); if(busy||window.adminOperationBusy||!selected.length)return;
    const category=el('category').value, isAi=el('photo-kind').value==='ai', title=SiteAlbums.title(el('site-name').value,el('title').value);
    const batch=[...selected].sort((a,b)=>Number(b===coverFile)-Number(a===coverFile)), remaining=[], failures=[]; let uploaded=0;
    setBusy(true);
    try {
      for(let i=0;i<batch.length;i++) {
        status(`${i+1}/${batch.length}장 등록 중… 창을 닫지 마세요.`);
        try { await service.upload(batch[i],category,isAi,title); uploaded++; }
        catch(error) { remaining.push(batch[i]); failures.push(`${batch[i].name}: ${error.message}`); }
      }
      selected=remaining;
      if(!remaining.length) { clearPreviews();el('upload-form').reset(); }
      else {
        clearPreviews();
        for(const file of remaining) {
          const figure=document.createElement('figure'),img=new Image(),caption=document.createElement('figcaption');
          const url=URL.createObjectURL(file);previews.push(url);img.src=url;img.alt=file.name;caption.textContent=file.name+' · 재시도 필요';figure.append(img,caption);el('previews').append(figure);
        }
      }
      await loadLibrary();
      status(failures.length ? `${uploaded}장 등록 완료. 실패한 사진만 다시 추가할 수 있습니다.\n${failures.join('\n')}` : `${uploaded}장이 등록됐습니다. 홈페이지를 새로고침하면 사진이 보입니다.`, Boolean(failures.length));
    } finally {setBusy(false);}
  });
  window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
  if(!service?.ready) {
    el('login-button').disabled=true;
    status('사진 관리 화면이 준비되었습니다. 온라인 사진 저장공간을 연결하면 로그인과 사진 추가를 사용할 수 있습니다.');
  } else {
    service.requireAdmin().then(enterAfterLogin).catch(showLogin);
  }
})();
