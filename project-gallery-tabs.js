(() => {
 const section=document.querySelector('#projects');
 const overview=section?.querySelector('.project-grid');
 if(!overview)return;
 const groups={'외벽공사':['real','exterior','temba-zinc','metal-siding','composite-sheet','sandwich-panel'],'지붕공사':['color'],'천막':['tent']};
 const panel=document.createElement('div');panel.className='project-saved-panel';panel.hidden=true;
 const status=document.createElement('p');status.className='project-saved-status';status.setAttribute('role','status');
 const grid=document.createElement('div');grid.className='project-saved-grid';panel.append(status,grid);overview.after(panel);
 let request=0,pending;
 const safeUrl=value=>{try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
 async function load(){
  let timer;
  try{return {rows:await Promise.race([Promise.resolve().then(()=>PhotoService.list()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),3000);})]),backup:false};}
  catch{
   const response=await fetch('./gallery-static.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('backup');
   const rows=await response.json();if(!Array.isArray(rows))throw Error('backup');
   for(const row of rows)row.url=new URL(row.url,'https://shinmyeongcon.pages.dev/').href;
   const verified=[{id:'f612655e-ca9b-4400-a79c-1cca23f12e5c',category:'composite-sheet',title:'용인 펜션 수영장 울타리 시공',is_ai:false,created_at:'2026-11-10T08:45:38.076627Z',url:'assets/corporate/latest-exterior.jpg'},{id:'612c744f-bc75-4133-a2f4-86a69d7deaac',category:'color',title:'건물 옥상 징크 지붕',is_ai:false,created_at:'2026-10-21T05:33:53.733403Z',url:'assets/corporate/latest-roofing.jpg'}];
   for(const row of verified){const i=rows.findIndex(p=>p.id===row.id);if(i<0)rows.push(row);else rows[i]={...rows[i],url:row.url};}
   return {rows,backup:true};
  }finally{clearTimeout(timer);}
 }
 async function select(category){
  const current=++request;
  section.querySelectorAll('.filters [data-filter]').forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  overview.hidden=category!=='all';panel.hidden=category==='all';
  if(category==='all'){overview.querySelectorAll('article').forEach(a=>a.hidden=false);return;}
  grid.replaceChildren();status.textContent=category+' 사진을 불러오는 중입니다…';panel.setAttribute('aria-busy','true');
  try{
   const result=await (pending ||= load().catch(error=>{pending=null;throw error;}));if(current!==request)return;
   const photos=result.rows.filter(p=>groups[category]?.includes(p.category)&&p.is_ai===false).sort((a,b)=>(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0));
   status.textContent=photos.length?category+' · '+photos.length+'장 · 사진을 누르면 크게 볼 수 있습니다.':'아직 등록된 '+category+' 시공사진이 없습니다.';
   if(result.backup&&photos.length)status.textContent+=' 현재 사진 저장소 연결 제한으로 백업된 사진을 표시합니다.';
   for(const photo of photos){
    const url=safeUrl(photo.url);if(!url)continue;
    const parsed=window.SiteAlbums?SiteAlbums.parse(photo):photo;
    const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
    const title=parsed.site||parsed.title||category+' 시공사진';
    link.href=url;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',title+' 사진 크게 보기');
    img.src=url;img.alt=title;img.loading='lazy';img.decoding='async';
    caption.textContent=title+(parsed.caption?' · '+parsed.caption:'');
    link.append(img);figure.append(link,caption);grid.append(figure);
   }
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
