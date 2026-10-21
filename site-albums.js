(() => {
 const sep='｜',pattern=/ ⟦([0-9a-z]+)\.([0-9a-z]+)\.([01])⟧$/;
 const metadata=title=>{const m=String(title||'').match(pattern);return m?{albumOrder:parseInt(m[1],36),photoOrder:parseInt(m[2],36),isCover:m[3]==='1',suffix:m[0]}:{};};
 const clean=title=>String(title||'').replace(pattern,'');
 const parse=p=>{const title=clean(p.title),i=title.indexOf(sep);return {...p,...metadata(p.raw_title||p.title),title,site:(i<0?title:title.slice(0,i)).trim(),caption:(i<0?title:title.slice(i+1)).trim()};};
 window.SiteAlbums={parse,clean,metadata,orderedTitle:(title,a,p,c)=>clean(title)+' ⟦'+a.toString(36)+'.'+p.toString(36)+'.'+(c?'1':'0')+'⟧',title:(s,c)=>s.trim().replaceAll('｜','|').slice(0,40)+sep+c.trim().slice(0,30),group(photos){
 const groups=new Map();for(const raw of photos){const p=parse(raw),id=JSON.stringify([p.category,p.site,Boolean(p.is_ai)]);if(!groups.has(id))groups.set(id,{id,name:p.site,isAi:p.is_ai,photos:[]});groups.get(id).photos.push(p);}
 for(const a of groups.values())a.photos.sort((x,y)=>(x.created_at||'').localeCompare(y.created_at||'')||x.id.localeCompare(y.id));
 return [...groups.values()];}};
})();