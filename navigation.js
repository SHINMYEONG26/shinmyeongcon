(() => {
 const nav=document.getElementById('nav'),menu=document.getElementById('menu');if(!nav)return;
 const items=[...nav.querySelectorAll('.nav-item')],desktop=window.matchMedia('(min-width:761px) and (hover:hover) and (pointer:fine)');
 function close(item){item.classList.remove('is-open');item.querySelector('.nav-expand').setAttribute('aria-expanded','false');item.querySelector('.nav-submenu').hidden=true;}
 function closeAll(){items.forEach(close);}
 function open(item){items.forEach(other=>{if(other!==item)close(other);});item.classList.add('is-open');item.querySelector('.nav-expand').setAttribute('aria-expanded','true');item.querySelector('.nav-submenu').hidden=false;}
 for(const item of items){const button=item.querySelector('.nav-expand');
  item.addEventListener('mouseenter',()=>{if(desktop.matches)open(item);});item.addEventListener('mouseleave',()=>{if(desktop.matches&&!item.contains(document.activeElement))close(item);});
  item.addEventListener('focusin',event=>{if(desktop.matches&&!event.target.closest('.nav-expand'))open(item);});
  item.addEventListener('focusout',event=>{if(!item.contains(event.relatedTarget)&&!item.matches(':hover'))close(item);});
  button.addEventListener('click',()=>item.classList.contains('is-open')?close(item):open(item));
  item.addEventListener('keydown',event=>{if(event.key==='ArrowDown'&&event.target.closest('.nav-main-row')){event.preventDefault();open(item);item.querySelector('.nav-submenu a')?.focus();}});
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const current=items.find(item=>item.classList.contains('is-open'));if(current){event.preventDefault();event.stopImmediatePropagation();close(current);current.querySelector('.nav-expand').focus();}}},true);
 document.addEventListener('click',event=>{if(!nav.contains(event.target))closeAll();});
 menu?.addEventListener('click',()=>{if(!nav.classList.contains('open'))closeAll();});
 nav.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;closeAll();nav.classList.remove('open');if(menu){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰';}
  if(link.dataset.businessTarget!==undefined){const card=document.querySelector(`[data-business="${link.dataset.businessTarget}"]`);if(card){event.preventDefault();card.click();if(location.hash!=='#business')history.pushState(null,'','#business');card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'center'});}}
 });
 window.matchMedia('(max-width:760px)').addEventListener('change',closeAll);
 function syncBusiness(){const list=nav.querySelector('[data-business-menu]');if(!list)return;const fragment=document.createDocumentFragment();for(const card of document.querySelectorAll('#business [data-business]')){const title=card.querySelector('h3')?.textContent.trim();if(!title)continue;const a=document.createElement('a');a.href='#business';a.dataset.businessTarget=card.dataset.business;a.textContent=title;fragment.append(a);}list.replaceChildren(fragment);}
 function syncProjects(){const list=nav.querySelector('[data-project-menu]');if(!list)return;const fragment=document.createDocumentFragment();for(const card of document.querySelectorAll('#projects article[data-category]')){const source=card.querySelector('.project-card-hit[href]'),title=card.querySelector('h3')?.textContent.trim();if(!source||!title)continue;let url;try{url=new URL(source.getAttribute('href'),location.href);}catch{continue;}const webLink=['http:','https:'].includes(url.protocol)&&url.origin===location.origin;const localLink=location.protocol==='file:'&&url.protocol==='file:'&&/^gallery-[a-z0-9-]+\.html(?:[?#].*)?$/.test(source.getAttribute('href'));if(!webLink&&!localLink)continue;const a=document.createElement('a');a.href=source.getAttribute('href');a.textContent=title;fragment.append(a);}list.replaceChildren(fragment);}
 for(const [id,fn]of [['business',syncBusiness],['projects',syncProjects]]){const section=document.getElementById(id);if(section)new MutationObserver(fn).observe(section,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','data-business','data-category']});fn();}
})();
