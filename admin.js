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
  let previews = [], selected = [], busy = false;
  let libraryPhotos = [], libraryCategory = 'all';
  const filterButtons = [];
  for (const [category, label] of [['all', '전체'], ...Object.entries(service.labels)]) {
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
    location.replace('index.html?v=20261018-session-v38#home');
  }
  async function loadLibrary() {
    try {
      libraryPhotos = await service.list();
      renderLibrary();
    } catch (error) { status(error.message,true); }
  }
  function renderLibrary() {
      const photos = libraryCategory === 'all' ? libraryPhotos : libraryPhotos.filter(photo => photo.category === libraryCategory);
      el('library').replaceChildren();
      el('library-count').textContent = `${libraryCategory === 'all' ? '전체' : service.labels[libraryCategory]} ${photos.length}장`;
      if (!photos.length) { el('library').textContent = libraryCategory === 'all' ? '아직 추가한 사진이 없습니다.' : '이 분야에 추가한 사진이 없습니다.'; return; }
      for (const photo of photos) {
        const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
        img.src = photo.url; img.alt = photo.title; img.loading = 'lazy';
        caption.textContent = `${service.labels[photo.category]} · ${photo.title}\n${photo.is_ai ? 'AI 생성 예시' : '실제 시공사진'}`;
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
        figure.append(img,caption,remove); el('library').append(figure);
      }
  }
  function setBusy(value) {
    busy=value; el('upload-fields').disabled=value; el('logout-button').disabled=value;
    el('refresh-button').disabled=value;
    document.querySelectorAll('.delete-photo').forEach(button => button.disabled=value);
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
        img.alt=file.name; caption.textContent=file.name; figure.append(img,caption); el('previews').append(figure);
      }
      status(files.length ? `${files.length}장을 선택했습니다. 분야와 사진 종류를 확인한 뒤 추가해 주세요.` : '사진을 선택해 주세요.');
    } catch { selected=[]; el('photos').value=''; clearPreviews();status('열 수 없는 사진이 있습니다. 다른 사진을 선택해 주세요.',true); }
  });
  el('upload-form').addEventListener('submit',async event=>{
    event.preventDefault(); if(busy||window.adminOperationBusy||!selected.length)return;
    const category=el('category').value, isAi=el('photo-kind').value==='ai', title=el('title').value;
    const batch=[...selected], remaining=[], failures=[]; let uploaded=0;
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
