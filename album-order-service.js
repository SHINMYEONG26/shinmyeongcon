(()=>{
 const page='gallery-album-order',globalKey='e9000:text:0',compact=id=>id.replaceAll('-','');
 let records=new Map(),albumOrder=[],dirty=new Set(),available=false,next=1;
 const key=a=>a.photos.slice().sort((x,y)=>(x.created_at||'').localeCompare(y.created_at||'')||x.id.localeCompare(y.id))[0]?.id;
 const unique=a=>[...new Set(a)];
 const rank=(ids,id)=>{const n=ids.indexOf(id);return n<0?Number.MAX_SAFE_INTEGER:n};
 const record=a=>{const k=key(a);if(!records.has(k))records.set(k,{key:k,field:'e9001:text:'+next++,photos:a.photos.map(p=>p.id),cover:a.photos[0]?.id});return records.get(k)};
 window.SiteAlbumOrder={
 key,
 async load(){const r=await PageContentService.list(page);available=r.available;if(!available)throw Error('앨범 순서를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');records=new Map();albumOrder=[];dirty=new Set();next=1;
 for(const row of r.items){try{const v=JSON.parse(row.value);if(row.field_key===globalKey&&Array.isArray(v))albumOrder=v;else if(v.key&&Array.isArray(v.photos)){records.set(v.key,{...v,field:row.field_key});next=Math.max(next,Number(row.field_key.split(':').pop())+1)}}catch{}} },
 apply(groups){for(const a of groups){a.orderKey=key(a);const r=records.get(a.orderKey);if(r){a.photos.sort((x,y)=>rank(r.photos,x.id)-rank(r.photos,y.id));a.cover=a.photos.find(p=>p.id===r.cover)||a.photos[0]}else a.cover=a.photos[0];}
 return groups.map((a,i)=>({a,i})).sort((x,y)=>rank(albumOrder,compact(x.a.orderKey))-rank(albumOrder,compact(y.a.orderKey))||x.i-y.i).map(x=>x.a);},
 moveAlbum(groups,k,position){const ids=groups.map(a=>compact(a.orderKey)),id=compact(k);ids.splice(ids.indexOf(id),1);ids.splice(Math.max(0,Math.min(ids.length,position-1)),0,id);albumOrder=ids;dirty.add('global');},
 movePhoto(a,id,position){const r=record(a),ids=a.photos.map(p=>p.id);ids.splice(ids.indexOf(id),1);ids.splice(Math.max(0,Math.min(ids.length,position-1)),0,id);r.photos=ids;dirty.add(r.key);},
 cover(a,id){const r=record(a);r.cover=id;dirty.add(r.key);},
 get dirty(){return dirty.size>0},
 async save(groups){if(!available)throw Error('저장공간에 연결되지 않았습니다.');const ids=unique(groups.map(a=>compact(a.orderKey)));if(JSON.stringify(ids).length>4000)throw Error('앨범 수가 많아 순서 저장공간 확장이 필요합니다.');await PhotoService.requireAdmin();
 for(const k of dirty){if(k==='global')continue;const r=records.get(k),value=JSON.stringify({key:r.key,photos:r.photos,cover:r.cover});await PageContentService.save(page,{key:r.field,kind:'text'},{value});}
 if(dirty.has('global'))await PageContentService.save(page,{key:globalKey,kind:'text'},{value:JSON.stringify(ids)});
 dirty.clear();}
 };
})();