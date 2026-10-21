(async()=>{
 const service=window.PhotoService,albums=window.SiteAlbums,section=document.querySelector('section[id^="gallery-"]'),grid=section?.querySelector('.gallery-photos');
 if(!grid||!service?.ready||!albums)return;
 const slug=section.id.slice(8),categories=slug==='composite-sheet'?['composite-sheet','temba-zinc','metal-siding','sandwich-panel']:[slug];
 const heading=document.querySelector('h1'),original=heading.textContent,intro=document.querySelector('.intro'),notice=document.querySelector('.notice');
 const make=(t,s)=>{const e=document.createElement(t);if(s)e.textContent=s;return e;},message=make('p');message.setAttribute('role','status');section.before(message);
 const back=make('a','← 현장 목록');back.href=location.pathname;back.className='album-back';back.hidden=true;section.before(back);
 const manage=make('a','현장 사진 관리');manage.href='admin.html?view=photos';manage.className='album-back';manage.hidden=true;section.before(manage);
 const framing=window.SitePhotoFraming;
 const kind=a=>a.isAi?'AI 생성 예시 · 실제 현장 아님':'실제 시공사진';
 try{
 const photos=await service.list();try{await SiteAlbumOrder.load(photos);}catch{}
 const groups=SiteAlbumOrder.apply(albums.group(photos.filter(p=>categories.includes(p.category)))),id=new URLSearchParams(location.search).get('site'),album=groups.find(a=>a.id===id);
 grid.replaceChildren();back.hidden=!id;
 if(id&&!album){heading.textContent='현장을 찾을 수 없습니다';message.textContent='현장 목록으로 돌아가 다시 선택해 주세요.';return;}
 heading.textContent=album?album.name:original;
 intro.textContent=album?'이 현장의 시공 전·중·후 사진을 함께 확인하세요.':'현장 대표사진을 누르면 해당 현장 사진만 볼 수 있습니다.';
 notice.textContent=album?kind(album):'실제 시공현장과 AI 생성 예시는 구분하여 안내합니다.';
 message.textContent=album?album.photos.length+'장':groups.length?groups.length+'개 현장':'아직 등록된 현장이 없습니다.';
 for(const item of album?album.photos:groups){
 const photo=album?item:(item.cover||item.photos[0]),figure=make('figure'),link=make('a'),img=make('img'),caption=make('figcaption');
 img.src=photo.url;img.alt=album?(photo.caption||album.name):item.name;img.loading='lazy';
 if(album){link.href=photo.url;link.target='_blank';link.rel='noopener';caption.textContent=photo.caption||album.name;}
 else{const u=new URL(location.href);u.searchParams.set('site',item.id);link.href=u.pathname+u.search;caption.textContent=item.name;}
 const stage=framing?.get(photo.id).stage;if(album&&stage){const badge=make('span',stage);badge.className='photo-stage';caption.prepend(badge);}
 caption.append(make('small',album?kind(album):item.photos.length+'장 · '+kind(item)));
 const preview=make('span');preview.className='album-uniform-preview';
 const framed=framing?framing.frame(img,photo.id):img;preview.append(framed);link.append(preview);
 const fitPreview=()=>{if(!framing)return;const crop=framing.get(photo.id).crop||[0,0,1,1],ratio=img.naturalWidth*crop[2]/(img.naturalHeight*crop[3]);if(!Number.isFinite(ratio)||ratio<=0)return;framed.style.width=ratio>=4/3?'100%':(ratio/(4/3)*100)+'%';framed.style.height=ratio>=4/3?((4/3)/ratio*100)+'%':'100%';};
 img.addEventListener('load',fitPreview,{once:true});if(img.complete)fitPreview();
 figure.append(link,caption);grid.append(figure);
 }
 }catch(e){grid.replaceChildren();message.textContent=e.message;const retry=make('button','다시 불러오기');retry.addEventListener('click',()=>location.reload());grid.append(retry);}
 try{await service.requireAdmin();manage.hidden=false;}catch{}
})();