/* Keep the construction links in step with the portfolio category cards. */
(() => {
 const projects=document.getElementById('projects');
 const list=document.querySelector('.construction-links');
 if(!projects||!list)return;
 let pending=false;
 function sync(){
  pending=false;const items=[],seen=new Set();
  for(const card of projects.querySelectorAll('article[data-category]')){
   const link=card.querySelector('.project-card-hit[href]');
   if(!link)continue;
   const name=(card.querySelector('h3')?.textContent||card.dataset.category||'').trim();
   if(!name)continue;
   let target;try{target=new URL(link.getAttribute('href'),location.href);}catch{continue;}
   const webLink=['http:','https:'].includes(target.protocol)&&target.origin===location.origin;
   const localLink=location.protocol==='file:'&&target.protocol==='file:'&&/^gallery-[a-z0-9-]+\.html(?:[?#].*)?$/.test(link.getAttribute('href'));
   if((!webLink&&!localLink)||seen.has(target.href))continue;
   seen.add(target.href);items.push({name,href:link.getAttribute('href')});
  }
  const fragment=document.createDocumentFragment();
  for(const item of items){const link=document.createElement('a');link.href=item.href;
   const text=document.createElement('span');text.textContent=item.name+' 시공사진';
   const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(text,arrow);fragment.append(link);}
  if(!items.length){const empty=document.createElement('p');empty.className='construction-links-empty';empty.textContent='분야 안내를 준비하고 있습니다.';fragment.append(empty);}
  list.style.setProperty('--guide-rows',String(Math.max(1,Math.ceil(items.length/2))));
  list.replaceChildren(fragment);
 }
 function schedule(){if(pending)return;pending=true;queueMicrotask(sync);}
 // Filtering hides cards temporarily; it must not remove their navigation links.
 new MutationObserver(schedule).observe(projects,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href','data-category']});
 sync();
})();
