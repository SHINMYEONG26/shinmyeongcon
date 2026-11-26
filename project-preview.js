// Select the newest uploaded actual project, then its designated album cover.
(() => {
 const groups={exterior:['real','exterior','temba-zinc','metal-siding','composite-sheet','sandwich-panel'],roofing:['color'],tent:['tent']};
 function parse(photo){
  if(window.SiteAlbums)return window.SiteAlbums.parse(photo);
  const raw=String(photo.raw_title||photo.title||''),match=raw.match(/ ⟦([0-9a-z]+)\.([0-9a-z]+)\.([01])⟧$/);
  const title=raw.replace(/ ⟦([0-9a-z]+)\.([0-9a-z]+)\.([01])⟧$/,'');
  return {...photo,title,site:title.split('｜')[0].trim(),isCover:match?.[3]==='1'};
 }
 function pick(photos,group){
  const categories=groups[group];if(!categories||!Array.isArray(photos))return null;
  const sorted=photos.filter(p=>p.is_ai===false&&categories.includes(p.category)&&Number.isFinite(Date.parse(p.created_at))).map(parse)
   .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id)));
  const newest=sorted[0];if(!newest)return null;
  const cover=sorted.find(p=>p.category===newest.category&&p.site===newest.site&&p.isCover);
  return {...(cover||newest),latestUploadAt:newest.created_at};
 }
 window.ProjectCoverService={pick,groups};
})();
