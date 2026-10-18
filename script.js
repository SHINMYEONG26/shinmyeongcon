const menu=document.getElementById('menu'),nav=document.getElementById('nav');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');menu.textContent=open?'✕':'☰'});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰'}));const details=[["칼라강판 품목 안내", "징크형 · 전통기와형 · 평기와형 · S골 · 파라펫 · 덧방용"], ["템바/징크 품목 안내", "메탈릭스 단열징크 · 템바징크(루버강판) · 리얼징크 · 인터락징크 · 하비스"], ["징크부자재 품목 안내", "템바징크 · 리얼징크"], ["강판부자재 품목 안내", "용마루 · 박공플레싱 · 망와 · 엔드캡 · 크로자"], ["물받이자재 품목 안내", "물받이 · 걸이쇠 밴드 · 마감캡 · 물받이 코너 · 물모음마스 · 벽부용마스 · 선홈통 · 엘보"], ["메탈사이딩 품목 안내", "롱브릭 · 내추럴스톤 · 아리에따 · 부자재"], ["복합판넬/쉬트판넬 품목 안내", "복합판넬 · 쉬트판넬"], ["샌드위치 판넬 품목 안내", "지붕용 판넬 · 벽체용 판넬"], ["내·외부인테리어 품목 안내", "실내 인테리어 · 외부 인테리어"]];document.querySelectorAll('[data-business]').forEach(b=>{b.setAttribute('aria-pressed',String(b.classList.contains('active')));b.addEventListener('click',()=>{document.querySelectorAll('[data-business]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');document.getElementById('business-title').textContent=b.querySelector('h3').textContent+' 품목 안내';document.getElementById('business-copy').textContent=b.querySelector('p').textContent})});document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');document.querySelectorAll('#projects [data-category]').forEach(x=>x.hidden=b.dataset.filter!=='all'&&x.dataset.category!==b.dataset.filter)}));


// Close the mobile menu with Escape or an outside click; retain focus on Escape.
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && nav.classList.contains('open')){
    nav.classList.remove('open');menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰';menu.focus();
  }
});
document.addEventListener('click',event=>{
  if(nav.classList.contains('open') && !event.target.closest('.site-header')){
    nav.classList.remove('open');menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','메뉴 열기');menu.textContent='☰';
  }
});

// Three image banners, matching the reference's navigation pattern.
(() => {
 const hero=document.querySelector('.reference-hero');if(!hero)return;
 const slides=[...(hero.closest('.hero-intro')||hero).querySelectorAll('.hero-slide')],dots=[...hero.querySelectorAll('[data-slide]')],pause=hero.querySelector('.slide-pause');
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let index=0,paused=motion.matches,timer=null,hovering=false;
 function show(next){index=(next+slides.length)%slides.length;slides.forEach((slide,i)=>slide.classList.toggle('is-current',i===index));dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));}
 function schedule(){clearInterval(timer);if(!paused&&!hovering&&!document.hidden&&!hero.contains(document.activeElement))timer=setInterval(()=>show(index+1),6000);}
 function syncPause(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'배너 자동 재생 시작':'배너 자동 재생 멈추기');schedule();}
 hero.querySelector('.slide-prev').addEventListener('click',()=>{show(index-1);schedule();});hero.querySelector('.slide-next').addEventListener('click',()=>{show(index+1);schedule();});
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);schedule();}));pause.addEventListener('click',()=>{paused=!paused;syncPause();});
 hero.addEventListener('mouseenter',()=>{hovering=true;schedule();});hero.addEventListener('mouseleave',()=>{hovering=false;schedule();});hero.addEventListener('focusin',schedule);hero.addEventListener('focusout',()=>setTimeout(schedule,0));document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',()=>{paused=motion.matches;syncPause();});syncPause();
})();
