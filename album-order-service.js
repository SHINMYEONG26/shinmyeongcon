(()=>{
 let records=new Map(),albumOrder=[],dirty=new Set(),originals=new Map();
 const key=a=>a.photos.slice().sort((x,y)=>(x.created_at||'').localeCompare(y.created_at||'')||x.id.localeCompare(y.id))[0]?.id;
 const rank=(ids,id)=>{const n=ids.indexOf(id);return n<0?Number.MAX_SAFE_INTEGER:n};
 const record=a=>{const k=key(a);if(!records.has(k))records.set(k,{key:k,photos:a.photos.map(p=>p.id),cover:a.photos.find(p=>p.isCover)?.id||a.photos[0]?.id});return records.get(k)};
 window.SiteAlbumOrder={key,
 async load(photos=[]){records=new Map();dirty=new Set();originals=new Map(photos.map(p=>[p.id,p]));const groups=SiteAlbums.group(photos);
 for(const a of groups){const r=record(a);r.photos=a.photos.slice().sort((x,y)=>(x.photoOrder||Number.MAX_SAFE_INTEGER)-(y.photoOrder||Number.MAX_SAFE_INTEGER)).map(p=>p.id);}
 albumOrder=groups.map((a,i)=>({a,i,rank:Math.min(...a.photos.map(p=>p.albumOrder||Number.MAX_SAFE_INTEGER))})).sort((x,y)=>x.rank-y.rank||x.i-y.i).map(x=>key(x.a));},
 apply(groups){for(const a of groups){a.orderKey=key(a);const r=records.get(a.orderKey);if(r){a.photos.sort((x,y)=>rank(r.photos,x.id)-rank(r.photos,y.id));a.cover=a.photos.find(p=>p.id===r.cover)||a.photos[0]}else a.cover=a.photos.find(p=>p.isCover)||a.photos[0];}
 return groups.map((a,i)=>({a,i})).sort((x,y)=>rank(albumOrder,x.a.orderKey)-rank(albumOrder,y.a.orderKey)||x.i-y.i).map(x=>x.a);},
 moveAlbum(groups,k,position){const ids=groups.map(a=>a.orderKey);ids.splice(ids.indexOf(k),1);ids.splice(Math.max(0,Math.min(ids.length,position-1)),0,k);albumOrder=ids;dirty.add('global');},
 movePhoto(a,id,position){const r=record(a),ids=a.photos.map(p=>p.id);ids.splice(ids.indexOf(id),1);ids.splice(Math.max(0,Math.min(ids.length,position-1)),0,id);r.photos=ids;dirty.add(r.key);},
 cover(a,id){record(a).cover=id;dirty.add(key(a));},
 get dirty(){return dirty.size>0},
 async save(groups,onProgress=()=>{}){await PhotoService.requireAdmin();const client=PhotoService.client,changes=[];
 for(let ai=0;ai<groups.length;ai++){const a=groups[ai];for(let pi=0;pi<a.photos.length;pi++){const p=a.photos[pi],old=originals.get(p.id);if(!old)throw Error('사진 목록이 바뀌었습니다. 새로고침한 뒤 다시 저장해 주세요.');const title=SiteAlbums.orderedTitle(old.title,ai+1,pi+1,p.id===a.cover.id);if(title.length>80)throw Error('「'+a.name+'」의 현장명 또는 사진 설명을 조금 줄인 뒤 다시 저장해 주세요.');if(title!==(old.raw_title||old.title))changes.push({id:p.id,old:old.raw_title||old.title,title});}}
 const done=[];try{for(let n=0;n<changes.length;n+=4){const results=await Promise.all(changes.slice(n,n+4).map(async c=>{try{const r=await client.from('gallery_photos').update({title:c.title}).eq('id',c.id).eq('title',c.old).select('id').single();if(r.error||!r.data)return false;done.push(c);return true;}catch{return false;}}));if(results.some(ok=>!ok))throw Error('사진 목록이 바뀌었거나 연결이 끊겼습니다. 다시 불러온 뒤 저장해 주세요.');onProgress(done.length,changes.length);}}
 catch(e){let failed=0;for(const c of done){try{const r=await client.from('gallery_photos').update({title:c.old}).eq('id',c.id).eq('title',c.title).select('id').single();if(r.error||!r.data)failed++;}catch{failed++;}}throw Error(e.message+(failed?' 일부 순서는 저장됐을 수 있으니 새로고침해 확인해 주세요.':' 기존 순서는 유지했습니다.'));}
 dirty.clear();}
 };
})();