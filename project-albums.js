(() => {
 const normalize=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ');
 const date=photo=>Date.parse(photo.created_at)||0;
 const order=photo=>Number.isFinite(photo.photoOrder)?photo.photoOrder:Number.MAX_SAFE_INTEGER;
 function parse(photo){
  if(window.SiteAlbums)return window.SiteAlbums.parse(photo);
  const raw=String(photo.raw_title||photo.title||''),match=raw.match(/ ⟦([0-9a-z]+)\.([0-9a-z]+)\.([01])⟧$/);
  const title=raw.replace(/ ⟦([0-9a-z]+)\.([0-9a-z]+)\.([01])⟧$/,'');
  const parts=title.split('｜');
  return {...photo,title,site:parts[0].trim(),caption:parts.slice(1).join('｜').trim(),isCover:match?.[3]==='1',photoOrder:match?parseInt(match[2],36):undefined};
 }
 function identities(photo,fingerprints){
  const keys=[];
  if(photo.id)keys.push('id:'+photo.id);
  if(photo.storage_path)keys.push('path:'+photo.storage_path);
  const hash=photo.content_sha256||fingerprints[photo.storage_path];if(hash)keys.push('hash:'+hash);
  if(photo.url)try{const url=new URL(photo.url,location.href);url.search='';url.hash='';keys.push('url:'+url.href);}catch{}
  return keys;
 }
 function build(rows,categories,fingerprints={}){
  const sites=new Map();
  for(const raw of rows){
   if(raw.is_ai!==false||!categories.includes(raw.category))continue;
   const photo=parse(raw),name=normalize(photo.site)||'현장명 미등록';
   // A site's photos can be assigned to several exterior material categories.
   const key=name.toLocaleLowerCase('ko');
   if(!sites.has(key))sites.set(key,{id:key,name,photos:[],latest:0});
   const album=sites.get(key);album.photos.push(photo);album.latest=Math.max(album.latest,date(photo));
  }
  const albums=[...sites.values()].sort((a,b)=>b.latest-a.latest||a.name.localeCompare(b.name,'ko'));
  const seen=new Map();let duplicates=0;
  for(const album of albums){
   album.photos.sort((a,b)=>order(a)-order(b)||date(a)-date(b)||String(a.id||'').localeCompare(String(b.id||'')));
   const unique=[];
   for(const photo of album.photos){
    const keys=identities(photo,fingerprints),existing=keys.map(k=>seen.get(k)).find(Boolean);
    if(existing){
     duplicates++;
     // Preserve the selected cover when a duplicate record carries that flag.
     if(existing.album===album&&photo.isCover)existing.photo.isCover=true;
     for(const key of keys)seen.set(key,existing);
    }else{
     const entry={album,photo};unique.push(photo);for(const key of keys)seen.set(key,entry);
    }
   }
   album.photos=unique;album.cover=unique.find(p=>p.isCover)||unique[0];
  }
  return {albums:albums.filter(a=>a.photos.length),duplicates};
 }
 window.ProjectAlbums={build};
})();
