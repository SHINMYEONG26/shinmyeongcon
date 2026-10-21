(() => {
 const sep='｜';
 const parse=p=>{const i=(p.title||'').indexOf(sep);return {...p,site:(i<0?p.title:p.title.slice(0,i)).trim(),caption:(i<0?p.title:p.title.slice(i+sep.length)).trim()};};
 window.SiteAlbums={parse,title:(s,c)=>s.trim().replaceAll('｜','|').slice(0,40)+sep+c.trim().slice(0,30),group(photos){
 const groups=new Map();for(const raw of photos){const p=parse(raw),id=JSON.stringify([p.category,p.site,Boolean(p.is_ai)]);if(!groups.has(id))groups.set(id,{id,name:p.site,isAi:p.is_ai,photos:[]});groups.get(id).photos.push(p);}
 for(const a of groups.values())a.photos.sort((x,y)=>(x.created_at||'').localeCompare(y.created_at||'')||x.id.localeCompare(y.id));
 return [...groups.values()];}};
})();