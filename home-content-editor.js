(async()=>{
 const photos=window.PhotoService,service=window.HomeContentService;
 if(!photos||!service)return;
 const entries=new Map(),sections=[],labels=photos.labels;
 let admin=false,available=false,busy=false,authVersion=0,editing=null,editOrigin=null,previewUrl=null,photoVersion=0,loginTarget=null;
 function categoryFor(label){return Object.keys(labels).find(key=>labels[key]===label);}
 for(const [sectionId,prefix]of [['projects','portfolio'],['business','materials']]){
  const section=document.getElementById(sectionId);if(!section)continue;
  const heading=section.querySelector('.reference-title');
  const toolbar=document.createElement('div');toolbar.className='home-edit-toolbar';toolbar.hidden=true;
  toolbar.innerHTML='<p></p><button type="button" data-manage aria-label="사진·글씨 관리" title="사진·글씨 관리">편집</button><button type="button" data-heading aria-label="영역 제목 수정" title="영역 제목 수정" hidden>제목 수정</button><button type="button" data-logout hidden>로그아웃</button>';
  const status=document.createElement('p');status.className='home-edit-message';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');heading.after(toolbar,status);
  const state={section,prefix,toolbar,status};sections.push(state);
  entries.set(`${prefix}:heading`,{key:`${prefix}:heading`,state,heading:true,element:heading,title:heading.querySelector('h2').textContent,description:heading.querySelector('p').textContent,eyebrow:'',isAi:null,showText:true});
  const cards=section.querySelectorAll(prefix==='portfolio'?'article[data-category]':'[data-business]');
  for(const card of cards){
   const category=prefix==='portfolio'?categoryFor(card.dataset.category):Object.keys(labels)[Number(card.dataset.business)];if(!category)continue;
   const title=card.querySelector('h3'),description=prefix==='portfolio'?card.querySelector('p:not(.photo-kind)'):card.querySelector('p');
   const image=prefix==='portfolio'?card.querySelector('.project-image'):card.querySelector('img');
   const eyebrow=prefix==='portfolio'?image.querySelector('span'):card.querySelector('span');
   const url=prefix==='portfolio'?new URL((image.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)||[])[1],location.href).href:image.src;
   if(prefix==='portfolio')description.classList.add('home-card-description');
   const entry={key:`${prefix}:${category}`,category,state,element:card,title:title.textContent,description:description.textContent,eyebrow:eyebrow.textContent,isAi:null,showText:title.style.visibility!=='hidden',url,titleNode:title,descriptionNode:description,eyebrowNode:eyebrow,image,badge:card.querySelector('.photo-kind'),more:card.querySelector('.project-more')};
   entries.set(entry.key,entry);
   let target=card;
   if(prefix==='materials'){const wrap=document.createElement('div');wrap.className='home-content-item';card.before(wrap);wrap.append(card);target=wrap;}
   const button=document.createElement('button');button.type='button';button.className='home-card-edit';button.hidden=true;button.textContent='수정';button.title='사진·글씨 수정';button.setAttribute('aria-label',`${prefix==='portfolio'?'PORTFOLIO':'MATERIALS'} ${labels[category]} 사진·글씨 수정`);button.addEventListener('click',()=>openEditor(entry,button));target.append(button);entry.editButton=button;
  }
 }
 function message(state,text,error=false){state.status.textContent=text;state.status.classList.toggle('error',error);}
 function renderEntry(entry){
  if(entry.heading){entry.element.querySelector('h2').textContent=entry.title;entry.element.querySelector('p').textContent=entry.description;return;}
  entry.titleNode.textContent=entry.title;entry.descriptionNode.textContent=entry.description;entry.eyebrowNode.textContent=entry.eyebrow;
  const visibility=entry.showText?'visible':'hidden';
  for(const node of [entry.titleNode,entry.descriptionNode,entry.eyebrowNode,entry.badge,entry.more])if(node)node.style.visibility=visibility;
  const type=entry.isAi===null?'분야 안내 이미지':entry.isAi?'AI 생성 예시 · 실제 시공사진 아님':'실제 시공사진';
  if(entry.badge){entry.badge.textContent=type;entry.badge.classList.toggle('is-actual',entry.isAi===false);}
  if(entry.state.prefix==='portfolio'){entry.image.style.backgroundImage=`url(${JSON.stringify(entry.url)})`;entry.image.setAttribute('aria-label',`${entry.title} · ${type}`);entry.element.querySelector('.project-card-hit').setAttribute('aria-label',`${entry.title} 사진 보기`);}
  else{entry.image.src=entry.url;entry.image.alt=`${entry.title} · ${type}`;}
 }
 function updateBusinessDetail(){const active=document.querySelector('.business-card.active');if(!active)return;document.getElementById('business-title').textContent=active.querySelector('h3').textContent+' 품목 안내';document.getElementById('business-copy').textContent=active.querySelector('p').textContent;}
 function controls(){for(const entry of entries.values())if(entry.editButton){entry.editButton.hidden=!admin;entry.editButton.disabled=busy||!available;}
  for(const s of sections){s.toolbar.hidden=!admin;s.status.hidden=!admin;s.toolbar.querySelector('p').textContent=admin?'각 카드의 사진·글씨 수정 버튼을 이용하세요.':'';s.toolbar.querySelector('[data-heading]').hidden=!admin;s.toolbar.querySelector('[data-heading]').disabled=busy||!available;s.toolbar.querySelector('[data-logout]').hidden=!admin;s.toolbar.querySelector('[data-logout]').disabled=busy;s.toolbar.querySelector('[data-manage]').disabled=busy;}
 }
 const dialog=document.createElement('dialog');dialog.className='home-content-dialog';dialog.setAttribute('aria-labelledby','home-content-dialog-title');
 dialog.innerHTML='<div class="home-dialog-heading"><h2 id="home-content-dialog-title">홈페이지 내용 수정</h2><button type="button" class="home-dialog-close" data-close aria-label="편집창 닫기">×</button></div><div data-login><p class="home-field-note">기존 관리자 계정으로 로그인해 주세요.</p><form data-login-form><fieldset><label>이메일<input name="email" type="email" autocomplete="username" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label><p class="home-dialog-error" role="status"></p><button type="submit">관리자 로그인</button></fieldset></form></div><div data-edit hidden><img class="home-dialog-preview" alt="수정할 카드 사진"><form data-edit-form><fieldset><label>제목<input name="title" maxlength="120" required></label><label>설명<textarea name="description" maxlength="1200" rows="3"></textarea></label><label data-eyebrow>영문·보조 표시<input name="eyebrow" maxlength="80"></label><label data-kind>사진 종류<select name="kind"><option value="guide">분야 안내용 이미지</option><option value="actual">실제 시공사진</option><option value="ai">AI 생성 예시</option></select></label><label data-photo>사진 바꾸기<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><span class="home-field-note">8MB 이하 JPG·PNG·WEBP. 선택하지 않으면 기존 사진을 유지합니다.</span></label><label class="home-show-text"><input name="showText" type="checkbox">카드 글씨 표시</label><p class="home-dialog-error" role="status"></p><div class="home-dialog-actions"><button type="submit">수정 저장</button><button type="button" class="home-secondary" data-close>취소</button></div></fieldset></form></div>';
 document.body.append(dialog);const loginPanel=dialog.querySelector('[data-login]'),editPanel=dialog.querySelector('[data-edit]'),loginForm=dialog.querySelector('[data-login-form]'),form=dialog.querySelector('[data-edit-form]'),preview=dialog.querySelector('img');
 function lock(value){busy=value;dialog.querySelectorAll('fieldset').forEach(f=>f.disabled=value);dialog.querySelector('.home-dialog-close').disabled=value;controls();}
 function clearPreview(){photoVersion++;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;}
 function close(){if(busy)return;dialog.close();clearPreview();form.reset();loginForm.elements.password.value='';editing=null;editOrigin?.focus();}
 function openEditor(entry,origin){if(!admin||busy)return;if(!available){message(entry.state,'홈페이지 편집 설정이 필요합니다. 제공된 Supabase 설정 파일을 먼저 적용해 주세요.',true);return;}
  editing=entry;editOrigin=origin;clearPreview();form.reset();form.elements.title.value=entry.title;form.elements.description.value=entry.description;form.elements.eyebrow.value=entry.eyebrow;form.elements.kind.value=entry.isAi===null?'guide':entry.isAi?'ai':'actual';form.elements.showText.checked=entry.showText;preview.src=entry.url||'';
  preview.hidden=entry.heading;for(const selector of ['[data-eyebrow]','[data-kind]','[data-photo]','.home-show-text'])dialog.querySelector(selector).hidden=entry.heading;
  editPanel.querySelector('.home-dialog-error').textContent='';loginPanel.hidden=true;editPanel.hidden=false;dialog.querySelector('h2').textContent=entry.heading?'영역 제목·설명 수정':`${entry.state.prefix==='portfolio'?'PORTFOLIO':'MATERIALS'} 카드 수정`;if(!dialog.open)dialog.showModal();form.elements.title.focus();
 }
 async function refreshAuth(){const version=++authVersion;let allowed=false;try{await photos.requireAdmin();allowed=true;}catch{}if(version!==authVersion)return;admin=allowed;controls();if(!admin&&!busy&&dialog.open&&!loginTarget)close();}
 async function load(){
  const result=await service.list();available=result.available;
  // Explicit homepage edits take priority over automatic gallery previews.
  for(const row of result.items){const entry=entries.get(row.content_key);if(!entry)continue;Object.assign(entry,{title:row.title,description:row.description,eyebrow:row.eyebrow,isAi:row.is_ai,showText:row.show_text});const url=service.imageUrl(row.image_path);if(url)entry.url=url;renderEntry(entry);}
  updateBusinessDetail();controls();if(admin&&!available)for(const s of sections)message(s,'홈페이지 편집 설정이 필요합니다. 제공된 Supabase 설정 파일을 먼저 적용해 주세요.',true);
 }
 for(const s of sections){s.toolbar.querySelector('[data-manage]').addEventListener('click',()=>{if(busy)return;editOrigin=s.toolbar.querySelector('[data-manage]');if(admin){if(!available)message(s,'홈페이지 편집 설정이 필요합니다. 제공된 Supabase 설정 파일을 먼저 적용해 주세요.',true);else message(s,'수정할 카드의 사진·글씨 수정 버튼 또는 영역 제목 수정 버튼을 눌러 주세요.');return;}loginTarget=s;loginPanel.hidden=false;editPanel.hidden=true;loginPanel.querySelector('.home-dialog-error').textContent='';dialog.querySelector('h2').textContent='홈페이지 관리자 로그인';dialog.showModal();loginForm.elements.email.focus();});
  s.toolbar.querySelector('[data-heading]').addEventListener('click',event=>openEditor(entries.get(`${s.prefix}:heading`),event.currentTarget));
  s.toolbar.querySelector('[data-logout]').addEventListener('click',async()=>{if(busy)return;lock(true);try{await photos.logout();admin=false;await refreshAuth();message(s,'로그아웃했습니다.');}catch(error){message(s,error.message,true);}finally{lock(false);}});
 }
 dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{loginTarget=null;close();}));dialog.addEventListener('cancel',event=>{event.preventDefault();loginTarget=null;close();});
 loginForm.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;lock(true);try{await photos.login(loginForm.elements.email.value.trim(),loginForm.elements.password.value);loginForm.elements.password.value='';await refreshAuth();await load();const target=loginTarget;loginTarget=null;lock(false);close();message(target,available?'관리자로 로그인했습니다. 각 카드의 수정 버튼을 이용하세요.':'홈페이지 편집 설정이 필요합니다. 제공된 Supabase 설정 파일을 먼저 적용해 주세요.',!available);}catch(error){loginPanel.querySelector('.home-dialog-error').textContent=error.message;}finally{lock(false);}});
 form.elements.photo.addEventListener('change',async()=>{clearPreview();const version=photoVersion,file=form.elements.photo.files[0],status=editPanel.querySelector('.home-dialog-error');status.textContent='';preview.src=editing.url;form.querySelector('[type=submit]').disabled=Boolean(file);if(!file)return;try{service.validateFile(file);const url=URL.createObjectURL(file);previewUrl=url;const image=new Image();image.src=url;await image.decode();if(version!==photoVersion)return;preview.src=url;}catch(error){if(version!==photoVersion)return;form.elements.photo.value='';clearPreview();status.textContent=error.message||'사진을 열 수 없습니다.';}finally{if(version===photoVersion||!form.elements.photo.files.length)form.querySelector('[type=submit]').disabled=false;}});
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!admin||!editing)return;const entry=editing,kind=form.elements.kind.value,values={title:form.elements.title.value,description:form.elements.description.value,eyebrow:form.elements.eyebrow.value,isAi:kind==='guide'?null:kind==='ai',showText:form.elements.showText.checked,file:form.elements.photo.files[0],previousKind:entry.isAi};lock(true);
  try{const result=await service.save(entry.key,values);await load();lock(false);close();message(entry.state,result.warning||'변경을 저장했습니다. 홈페이지를 다시 열어도 유지됩니다.',Boolean(result.warning));}catch(error){editPanel.querySelector('.home-dialog-error').textContent=error.message;}finally{lock(false);}
 });
 window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
 if(!photos.ready){for(const s of sections)s.toolbar.querySelector('[data-manage]').disabled=true;return;}
 // Retain the existing automatic use of the latest verified actual photograph.
 try{const list=await photos.list();await Promise.allSettled([...entries.values()].filter(e=>e.state.prefix==='portfolio'&&!e.heading).map(async entry=>{const item=list.find(p=>p.category===entry.category&&p.is_ai===false);if(!item)return;const url=new URL(item.url,location.href);if(url.protocol!=='https:')return;const image=new Image();image.src=url.href;await image.decode();entry.url=url.href;entry.isAi=false;if(item.title)entry.description=item.title;renderEntry(entry);}));}catch{}
 photos.client.auth.onAuthStateChange(()=>setTimeout(()=>refreshAuth(),0));await refreshAuth();await load();
})();
