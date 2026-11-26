(() => {
 const section=document.querySelector('#projects');
 const overview=section?.querySelector('.project-grid');
 if(!overview)return;
 const groups={'외벽공사':['real','exterior','temba-zinc','metal-siding','composite-sheet','sandwich-panel'],'지붕공사':['color'],'천막':['tent']};
 const panel=document.createElement('div');panel.className='project-saved-panel';panel.hidden=true;
 const status=document.createElement('p');status.className='project-saved-status';status.setAttribute('role','status');
 const back=document.createElement('button');back.type='button';back.className='project-album-back';back.hidden=true;
 const grid=document.createElement('div');grid.className='project-saved-grid';panel.append(back,status,grid);overview.after(panel);
 let request=0,pending;
 const safeUrl=value=>{try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
 async function load(){
  let timer;
  try{return {rows:await Promise.race([Promise.resolve().then(()=>PhotoService.list()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),3000);})]),backup:false};}
  catch{
   const response=await fetch('./gallery-static.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('backup');
   const rows=await response.json();if(!Array.isArray(rows))throw Error('backup');
   for(const row of rows)row.url=new URL(row.url,'https://shinmyeongcon.pages.dev/').href;
   const verified=[{id:'f612655e-ca9b-4400-a79c-1cca23f12e5c',category:'composite-sheet',title:'용인 펜션 수영장 울타리 시공｜ ⟦1.1.1⟧',is_ai:false,created_at:'2026-11-10T08:45:38.076627Z',storage_path:'composite-sheet/02e23fd0-ee8a-49b0-86c3-4429d74aa078.png',url:'assets/corporate/latest-exterior.jpg'},{id:'612c744f-bc75-4133-a2f4-86a69d7deaac',category:'color',title:'건물 옥상 징크 지붕｜ ⟦3.5.1⟧',is_ai:false,created_at:'2026-10-21T05:33:53.733403Z',storage_path:'color/928e6984-18fa-4813-b23b-862db3db76ab.jpg',url:'assets/corporate/latest-roofing.jpg'}];
   for(const row of verified){const i=rows.findIndex(p=>p.id===row.id);if(i<0)rows.push(row);else rows[i]={...rows[i],url:row.url};}
   return {rows,backup:true};
  }finally{clearTimeout(timer);}
 }
 async function select(category){
  const current=++request;
  section.querySelectorAll('.filters [data-filter]').forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  overview.hidden=category!=='all';panel.hidden=category==='all';
  if(category==='all'){overview.querySelectorAll('article').forEach(a=>a.hidden=false);return;}
  back.hidden=true;grid.replaceChildren();status.textContent=category+' 현장을 불러오는 중입니다…';panel.setAttribute('aria-busy','true');
  try{
   const result=await (pending ||= load().catch(error=>{pending=null;throw error;}));if(current!==request)return;
   const {albums}=ProjectAlbums.build(result.rows,groups[category]);
   const backupNote=result.backup?' 현재 사진 저장소 연결 제한으로 백업된 사진을 표시합니다.':'';
   const makeImage=photo=>{
    const img=document.createElement('img');img.src=safeUrl(photo.url);img.alt=photo.site||photo.title||category+' 시공사진';img.loading='lazy';img.decoding='async';return img;
   };
   const showAlbum=album=>{
    grid.replaceChildren();back.hidden=false;back.textContent='← '+category+' 현장 목록';
    status.textContent=album.name+' · '+album.photos.length+'장 · 사진을 누르면 크게 볼 수 있습니다.'+backupNote;
    for(const photo of album.photos){
    const url=safeUrl(photo.url);if(!url)continue;
    const figure=document.createElement('figure'),link=document.createElement('a'),caption=document.createElement('figcaption');
    const title=photo.site||album.name;
    link.href=url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',title+' 사진 크게 보기');
    caption.textContent=photo.caption&&photo.caption!==title?photo.caption:title;
    link.append(makeImage(photo));figure.append(link,caption);grid.append(figure);
    }
    back.focus({preventScroll:true});panel.scrollIntoView({block:'start'});
   };
   const showSites=()=>{
    grid.replaceChildren();back.hidden=true;
    status.textContent=albums.length?category+' · '+albums.length+'개 현장 · 대표 사진을 누르면 해당 현장의 사진을 볼 수 있습니다.'+backupNote:'아직 등록된 '+category+' 시공사진이 없습니다.';
    for(const album of albums){
     if(!safeUrl(album.cover?.url))continue;
     const figure=document.createElement('figure'),button=document.createElement('button'),caption=document.createElement('span'),count=document.createElement('small');
     button.type='button';button.className='project-album-open';button.setAttribute('aria-label',album.name+' 현장 사진 '+album.photos.length+'장 보기');
     caption.className='project-album-caption';caption.textContent=album.name;count.textContent='사진 '+album.photos.length+'장 · 현장 사진 보기 ↗';caption.append(count);
     button.append(makeImage(album.cover),caption);button.addEventListener('click',()=>showAlbum(album));figure.append(button);grid.append(figure);
    }
   };
   back.onclick=()=>{showSites();section.querySelector('.filters [data-filter="'+category+'"]').focus({preventScroll:true});panel.scrollIntoView({block:'start'});};
   showSites();
  }catch{if(current===request){status.textContent='사진을 불러오지 못했습니다. 항목을 다시 눌러 주세요.';}}
  finally{if(current===request)panel.removeAttribute('aria-busy');}
 }
 section.addEventListener('click',event=>{
  const button=event.target.closest('.filters [data-filter]');
  const card=event.target.closest('.project-card-hit');
  const category=button?.dataset.filter||card?.closest('article')?.dataset.category;
  if(category&&(category==='all'||groups[category])){event.preventDefault();event.stopImmediatePropagation();select(category);}
 },true);
})();
