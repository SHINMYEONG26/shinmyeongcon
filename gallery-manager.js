/* In-page gallery management. All writes are checked by Supabase admin policies. */
(async () => {
  const service = window.PhotoService, editor = window.PhotoEditorService;
  const section = document.querySelector('section[id^="gallery-"]');
  const grid = section?.querySelector('.gallery-photos');
  if (!grid) return;
  const slug = section.id.slice(8);
  const category = ({real:'temba-zinc',exterior:'interior-exterior'})[slug] || slug;
  const page = `gallery-${slug}.html`;
  const label = service?.labels[category] || document.querySelector('h1').textContent;
  const samples = [...grid.querySelectorAll('.sample-photo')].map(figure => {
    const image = figure.querySelector('img'), caption = figure.querySelector('figcaption');
    const source = image.getAttribute('src');
    const text = caption.textContent;
    return {key:`${page}:${source}`,category,source,title:caption.childNodes[0]?.textContent.trim() || image.alt,isAi:text.includes('AI') ? true : null};
  });
  let photos = [], overrides = [], samplesAvailable = false, admin = false, busy = false;
  let authVersion = 0, loadVersion = 0, selected = [], previewUrls = [], editing = null, editUrl = null, editTrigger = null;
  const toolbar = document.createElement('div'); toolbar.className='gallery-toolbar';toolbar.hidden=true;
  toolbar.innerHTML='<p>사진을 크게 보거나, 관리자 로그인 후 이 페이지에서 관리할 수 있습니다.</p><button type="button" aria-expanded="false" aria-controls="gallery-manager">사진 관리</button>';
  const panel = document.createElement('section'); panel.id='gallery-manager';panel.className='gallery-manager';panel.hidden=true;
  panel.setAttribute('aria-label','이 분야 사진 관리');
  panel.innerHTML=`<div class="manager-heading"><h2>이 분야 사진 관리</h2><button type="button" data-close aria-label="사진 관리 닫기">×</button></div>
    <div data-login><p>기존 관리자 계정으로 로그인하면 사진 추가·수정·삭제를 할 수 있습니다.</p><form data-login-form><div class="manager-row"><label>이메일<input name="email" type="email" autocomplete="username" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label></div><div class="manager-buttons"><button type="submit">관리자 로그인</button></div></form></div>
    <div data-admin hidden><div class="manager-account"><span>관리자 로그인 상태</span><div class="manager-buttons"><button type="button" class="secondary" data-refresh>새로고침</button><button type="button" class="secondary" data-logout>로그아웃</button></div></div><p data-category></p>
    <form data-upload-form><fieldset><div class="manager-row"><label>사진 설명<input name="title" maxlength="80" placeholder="예: 공장 지붕 칼라강판 마감"></label><label>사진 종류<select name="kind" required><option value="">선택해 주세요</option><option value="actual">실제 시공사진</option><option value="ai">AI 생성 예시</option></select></label></div><label>추가할 사진<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required><span class="manager-file-help">JPG · PNG · WEBP / 사진당 8MB 이하 / 한 번에 최대 10장</span></label><div class="manager-preview"></div><div class="manager-buttons"><button type="submit">이 분야에 사진 추가</button></div></fieldset></form>
    <p class="manager-setup" hidden>기본 안내사진까지 수정·삭제하려면 함께 제공된 Supabase 설정 SQL을 한 번 적용해 주세요.</p><div class="hidden-samples" hidden><h3>삭제한 기본 안내사진</h3><div data-hidden-list></div></div></div>`;
  const status = document.createElement('p');status.className='manager-status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  section.before(toolbar,panel,status);
  const toggle=toolbar.querySelector('button'), login=panel.querySelector('[data-login]'), adminPanel=panel.querySelector('[data-admin]');
  const loginForm=panel.querySelector('[data-login-form]'), uploadForm=panel.querySelector('[data-upload-form]');
  panel.querySelector('[data-category]').textContent=`${label} 사진을 관리합니다. 아래 사진의 수정·삭제 버튼을 이용하세요.`;
  const dialog=document.createElement('dialog');dialog.className='gallery-edit';dialog.setAttribute('aria-labelledby','gallery-edit-heading');
  dialog.innerHTML=`<div class="manager-heading"><h2 id="gallery-edit-heading">사진 수정</h2><button type="button" data-cancel aria-label="사진 수정 닫기">×</button></div><img class="edit-preview" alt="수정할 사진"><form><fieldset><label>사진 설명<input name="title" maxlength="80" required></label><label>사진 종류<select name="kind" required><option value="actual">실제 시공사진</option><option value="ai">AI 생성 예시</option><option value="guide">분야 안내용 이미지</option></select></label><label>사진 바꾸기 <span class="manager-file-help">기존 사진을 유지하려면 선택하지 마세요.</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="edit-status" role="status" aria-live="polite"></p><div class="manager-buttons"><button type="submit">수정 저장</button><button type="button" class="secondary" data-cancel>취소</button></div></fieldset></form>`;
  document.body.append(dialog);
  const editForm=dialog.querySelector('form'), editStatus=dialog.querySelector('.edit-status');
  function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
  function openPanel(open=true){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)(admin?uploadForm.elements.title:loginForm.elements.email).focus();}
  function setBusy(value){
    busy=value;panel.querySelectorAll('button').forEach(b=>b.disabled=value);
    uploadForm.querySelector('fieldset').disabled=value;loginForm.querySelectorAll('input').forEach(i=>i.disabled=value);
    dialog.querySelector('fieldset').disabled=value;dialog.querySelector('[data-cancel]').disabled=value;
    document.querySelectorAll('.photo-actions button,.hidden-sample-row button').forEach(b=>b.disabled=value || (b.dataset.sample==='true' && !samplesAvailable));
  }
  function clearPreviews(){previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];panel.querySelector('.manager-preview').replaceChildren();}
  function closeEditor(){if(busy)return;dialog.close();if(editUrl)URL.revokeObjectURL(editUrl);editUrl=null;editing=null;editForm.reset();editTrigger?.focus();}
  function kindText(isAi){return isAi===null?'분야 안내용 이미지':isAi?'AI 생성 예시 · 실제 시공사진 아님':'실제 시공사진';}
  function currentSample(base){const row=overrides.find(x=>x.sample_key===base.key);return {...base,...(row?{title:row.title,isAi:row.is_ai,hidden:row.hidden,url:editor.imageUrl(row.storage_path)||base.source}:{}),url:(row&&editor.imageUrl(row.storage_path))||base.source,sample:true};}
  function render(){
    const fragment=document.createDocumentFragment();
    const items=[...photos.map(p=>({...p,isAi:p.is_ai})),...samples.map(currentSample).filter(p=>!p.hidden)];
    for(const item of items){
      const figure=document.createElement('figure');figure.className=item.sample?'sample-photo':'uploaded-photo';
      const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',`${item.title} 크게 보기 (새 창)`);
      const image=document.createElement('img');image.src=item.url;image.alt=`${item.title} · ${kindText(item.isAi)}`;image.loading='lazy';link.append(image);
      const caption=document.createElement('figcaption');caption.textContent=item.title;const kind=document.createElement('small');kind.textContent=kindText(item.isAi);caption.append(kind);figure.append(link,caption);
      if(admin){
        const actions=document.createElement('div');actions.className='photo-actions';
        const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.setAttribute('aria-label',`${item.title} 사진 수정`);
        const remove=document.createElement('button');remove.type='button';remove.className='photo-remove';remove.textContent='삭제';remove.setAttribute('aria-label',`${item.title} 사진 삭제`);
        for(const b of [edit,remove]){b.disabled=busy || (item.sample && !samplesAvailable);b.dataset.sample=String(Boolean(item.sample));if(item.sample&&!samplesAvailable)b.title='기본 안내사진 관리 설정이 필요합니다.';}
        edit.addEventListener('click',()=>openEditor(item,edit));remove.addEventListener('click',()=>removeItem(item));actions.append(edit,remove);figure.append(actions);
      }
      fragment.append(figure);
    }
    if(!items.length){const empty=document.createElement('p');empty.textContent='등록된 사진이 없습니다.';fragment.append(empty);}
    grid.replaceChildren(fragment);
    const hidden=samples.map(currentSample).filter(p=>p.hidden), list=panel.querySelector('[data-hidden-list]');list.replaceChildren();
    panel.querySelector('.hidden-samples').hidden=!admin||!hidden.length;
    for(const item of hidden){const row=document.createElement('div');row.className='hidden-sample-row';const text=document.createElement('span');text.textContent=item.title;const restore=document.createElement('button');restore.className='secondary';restore.type='button';restore.textContent='복원';restore.disabled=busy;restore.addEventListener('click',()=>restoreItem(item));row.append(text,restore);list.append(row);}
    panel.querySelector('.manager-setup').hidden=!admin||samplesAvailable;
  }
  async function load(){
    const version=++loadVersion;
    const results=await Promise.allSettled([service.list(),editor.listSamples(category)]);
    if(version!==loadVersion)return;
    if(results[0].status==='fulfilled')photos=results[0].value.filter(p=>p.category===category);
    const result=results[1].status==='fulfilled'?results[1].value:{available:false,items:[]};
    // Preserve known shared overrides across a temporary connection failure.
    if(result.available)overrides=result.items;
    samplesAvailable=result.available;render();
    if(results[0].status==='rejected')throw results[0].reason;
  }
  async function refreshAuth(){
    const version=++authVersion;
    let allowed=false;try{await service.requireAdmin();allowed=true;}catch{}
    if(version!==authVersion)return;
    admin=allowed;toolbar.hidden=!admin;status.hidden=!admin;login.hidden=admin;adminPanel.hidden=!admin;
    if(!admin){panel.hidden=true;toggle.setAttribute('aria-expanded','false');loginForm.elements.password.value='';selected=[];clearPreviews();uploadForm.reset();if(dialog.open&&!busy)closeEditor();}
    render();
  }
  function openEditor(item,trigger){
    if(busy||!admin)return;editing=item;editTrigger=trigger;editForm.reset();editStatus.textContent='';
    editForm.elements.title.value=item.title;editForm.elements.kind.value=item.isAi===null?'guide':item.isAi?'ai':'actual';
    editForm.elements.kind.querySelector('[value="guide"]').hidden=!item.sample;
    dialog.querySelector('.edit-preview').src=item.url;dialog.showModal();editForm.elements.title.focus();
  }
  async function removeItem(item){
    if(busy||!admin)return;
    const hint=item.sample?'기본 안내사진은 이 페이지에서 숨겨지며 사진 관리에서 복원할 수 있습니다.':'등록된 사진과 저장 파일을 삭제합니다. 되돌릴 수 없습니다.';
    if(!window.confirm(`「${item.title}」 사진을 삭제할까요?\n${hint}`))return;
    setBusy(true);message('사진을 삭제하는 중입니다…');
    try{const result=item.sample?await editor.saveSample(item,{title:item.title,isAi:item.isAi,hidden:true}):await service.deletePhoto(item.id);await load();message(result.warning||'사진을 삭제했습니다.',Boolean(result.warning));}
    catch(error){message(error.message,true);}finally{setBusy(false);}
  }
  async function restoreItem(item){if(busy||!admin)return;setBusy(true);try{await editor.saveSample(item,{title:item.title,isAi:item.isAi,hidden:false});await load();message('기본 안내사진을 복원했습니다.');}catch(error){message(error.message,true);}finally{setBusy(false);}}
  toggle.addEventListener('click',()=>openPanel(panel.hidden));panel.querySelector('[data-close]').addEventListener('click',()=>{if(!busy){openPanel(false);toggle.focus();}});
  dialog.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',closeEditor));dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  loginForm.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;setBusy(true);message('로그인 중입니다…');try{await service.login(loginForm.elements.email.value.trim(),loginForm.elements.password.value);loginForm.elements.password.value='';await refreshAuth();await load();message('관리자로 로그인했습니다. 사진을 추가하거나 아래 사진의 수정·삭제를 이용하세요.');}catch(error){message(error.message,true);}finally{setBusy(false);}});
  panel.querySelector('[data-logout]').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{await service.logout();await refreshAuth();message('로그아웃했습니다.');}catch(error){message(error.message,true);}finally{setBusy(false);}});
  panel.querySelector('[data-refresh]').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{await load();message('사진 목록을 새로 불러왔습니다.');}catch(error){message(error.message,true);}finally{setBusy(false);}});
  uploadForm.elements.photos.addEventListener('change',()=>{
    clearPreviews();selected=[];
    try{const files=[...uploadForm.elements.photos.files];if(files.length>10)throw new Error('한 번에 최대 10장까지 선택해 주세요.');files.forEach(editor.validateFile);selected=files;
      for(const file of selected){const image=new Image();const url=URL.createObjectURL(file);previewUrls.push(url);image.src=url;image.alt=file.name;panel.querySelector('.manager-preview').append(image);}message(selected.length?`${selected.length}장을 선택했습니다.`:'사진을 선택해 주세요.');
    }catch(error){uploadForm.elements.photos.value='';message(error.message,true);}
  });
  uploadForm.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!admin||!selected.length)return;
    const files=[...selected],title=uploadForm.elements.title.value,isAi=uploadForm.elements.kind.value==='ai';let count=0;const failures=[];
    setBusy(true);
    try{for(let i=0;i<files.length;i++){message(`${i+1}/${files.length}장 등록 중…`);try{await service.upload(files[i],category,isAi,title);count++;}catch(error){failures.push({file:files[i],message:error.message});}}
      selected=failures.map(f=>f.file);clearPreviews();if(!selected.length)uploadForm.reset();else{for(const file of selected){const image=new Image();const url=URL.createObjectURL(file);previewUrls.push(url);image.src=url;image.alt=file.name;panel.querySelector('.manager-preview').append(image);}}
      await load();message(failures.length?`${count}장 등록 완료. 실패한 사진만 다시 시도할 수 있습니다.\n${failures.map(f=>`${f.file.name}: ${f.message}`).join('\n')}`:`${count}장을 추가했습니다.`,Boolean(failures.length));
    }catch(error){message(error.message,true);}finally{setBusy(false);}
  });
  editForm.elements.photo.addEventListener('change',()=>{const file=editForm.elements.photo.files[0];editStatus.textContent='';if(editUrl)URL.revokeObjectURL(editUrl);editUrl=null;try{if(file){editor.validateFile(file);editUrl=URL.createObjectURL(file);}dialog.querySelector('.edit-preview').src=editUrl||editing.url;}catch(error){editForm.elements.photo.value='';dialog.querySelector('.edit-preview').src=editing.url;editStatus.textContent=error.message;}});
  editForm.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!admin||!editing)return;
    const item=editing,kind=editForm.elements.kind.value,values={title:editForm.elements.title.value,isAi:kind==='guide'?null:kind==='ai',file:editForm.elements.photo.files[0]};
    setBusy(true);editStatus.textContent='저장 중입니다…';
    try{const result=item.sample?await editor.saveSample(item,{...values,hidden:false}):await editor.updatePhoto(item.id,values);await load();setBusy(false);closeEditor();message(result.warning||'사진을 수정했습니다.',Boolean(result.warning));toggle.focus();}
    catch(error){editStatus.textContent=error.message;}finally{setBusy(false);}
  });
  window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
  if(!service?.ready||!editor){toggle.disabled=true;message('사진 관리 연결을 확인해 주세요. 기본 안내사진은 계속 볼 수 있습니다.');return;}
  service.client.auth.onAuthStateChange(()=>{setTimeout(()=>refreshAuth(),0);});
  await refreshAuth();try{await load();}catch(error){message(error.message,true);}
})();
