(async()=>{
  const section=document.querySelector('section[id^="gallery-"]');
  const grid=section?.querySelector('.gallery-photos');
  if(!grid)return;

  const service=window.PhotoService;
  const albums=window.SiteAlbums;
  const heading=document.querySelector('h1');
  const intro=document.querySelector('.intro');
  const notice=document.querySelector('.notice');
  const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};

  const status=make('p','사진을 불러오는 중입니다…');
  status.setAttribute('role','status');
  status.className='gallery-load-status';
  section.before(status);

  const retry=()=>{
    const button=make('button','다시 불러오기');
    button.type='button';
    button.addEventListener('click',()=>location.reload());
    grid.replaceChildren(button);
  };

  if(!albums){
    status.textContent='사진 연결을 불러오지 못했습니다.';
    retry();
    return;
  }

  const slug=section.id.slice(8);
  const categoryMap={
    'color':['color'],
    'composite-sheet':['composite-sheet','temba-zinc','metal-siding','sandwich-panel','real','exterior'],
    'interior-exterior':['interior-exterior']
  };
  const categories=categoryMap[slug]||[slug];
  const originalHeading=heading?.textContent||'';
  const kind=a=>a.isAi?'AI 생성 예시 · 실제 현장 아님':'실제 시공사진';

  const back=make('a','← 현장 목록');
  back.href=location.pathname;
  back.className='album-back';
  back.hidden=true;
  section.before(back);

  try{
    const getBackup=async()=>{
      const response=await fetch('./gallery-static.json',{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('사진 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      const rows=await response.json();
      if(!Array.isArray(rows))throw Error('사진 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return rows.map(row=>({...row,url:new URL(row.url,'https://shinmyeongcon.pages.dev/').href}));
    };
    let timer;
    let photos;
    try{
      photos=await Promise.race([
        Promise.resolve().then(()=>service.list()),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Photo service timed out')),3000);})
      ]);
    }catch{
      photos=await getBackup();
    }finally{
      clearTimeout(timer);
    }
    const filtered=photos.filter(p=>categories.includes(p.category));
    let groups=albums.group(filtered);

    if(window.SiteAlbumOrder){
      try{
        await window.SiteAlbumOrder.load(filtered);
        groups=window.SiteAlbumOrder.apply(groups);
      }catch(error){
        console.warn('사진 순서 기능을 건너뜁니다.',error);
      }
    }

    const id=new URLSearchParams(location.search).get('site');
    const album=groups.find(a=>a.id===id);
    grid.replaceChildren();
    back.hidden=!id;

    if(id&&!album){
      if(heading)heading.textContent='현장을 찾을 수 없습니다';
      status.textContent='현장 목록으로 돌아가 다시 선택해 주세요.';
      return;
    }

    if(heading)heading.textContent=album?album.name:originalHeading;
    if(intro)intro.textContent=album?'이 현장의 시공 전·중·후 사진을 함께 확인하세요.':'현장 대표사진을 누르면 해당 현장 사진만 볼 수 있습니다.';
    if(notice)notice.textContent=album?kind(album):'실제 시공현장과 AI 생성 예시는 구분하여 안내합니다.';
    status.textContent=album?album.photos.length+'장':groups.length?groups.length+'개 현장':'아직 등록된 시공사진이 없습니다.';

    const items=album?album.photos:groups;
    for(const item of items){
      const photo=album?item:(item.cover||item.photos[0]);
      if(!photo?.url)continue;

      const figure=make('figure');
      const link=make('a');
      const img=make('img');
      const caption=make('figcaption');
      img.src=photo.url;
      img.alt=album?(photo.caption||album.name):item.name;
      img.loading='lazy';

      if(album){
        link.href=photo.url;
        link.target='_blank';
        link.rel='noopener';
        caption.textContent=photo.caption||album.name;
      }else{
        const url=new URL(location.href);
        url.searchParams.set('site',item.id);
        link.href=url.pathname+url.search;
        caption.textContent=item.name;
      }

      const small=make('small',album?kind(album):item.photos.length+'장 · '+kind(item));
      caption.append(small);
      link.append(img);
      figure.append(link,caption);
      grid.append(figure);
    }

    if(!grid.children.length&&filtered.length){
      status.textContent='사진 목록을 구성하지 못했습니다. 다시 불러와 주세요.';
      retry();
    }
  }catch(error){
    console.error(error);
    status.textContent=error?.message||'사진을 불러오지 못했습니다.';
    retry();
  }
})();
