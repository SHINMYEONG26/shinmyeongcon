(async()=>{
 const grid=document.getElementById('products-grid'),notice=document.getElementById('products-notice');if(!grid)return;
 const filters=document.createElement('div');filters.className='product-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label','자재·상품 분야 선택');grid.before(filters);
 const search=document.createElement('div');search.className='product-search';
 const label=document.createElement('label');label.htmlFor='product-search-input';label.textContent='상품 검색';
 const input=document.createElement('input');input.id='product-search-input';input.type='search';input.placeholder='상품명·규격 검색 (예: 징크, 용마루)';input.autocomplete='off';input.setAttribute('aria-controls','products-grid');
 const clear=document.createElement('button');clear.type='button';clear.textContent='검색 지우기';clear.hidden=true;
 search.append(label,input,clear);filters.before(search);
 const more=document.createElement('button');more.type='button';more.className='products-more';more.setAttribute('aria-controls','products-grid');more.hidden=true;grid.after(more);
 const empty=document.createElement('p');empty.className='products-empty';empty.hidden=true;empty.textContent='검색 결과가 없습니다. 다른 검색어를 입력하거나 분야를 전체로 바꿔보세요.';grid.before(empty);
 const catalogLabels=ProductService.catalogLabels;
 const pageSize=12;let products=[],selected='all',query='',limit=pageSize;
 const searchable=p=>[p.title,p.description,catalogLabels[p.category],...(p.variants||[]).flatMap(v=>[v.color,v.thickness,v.length])].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR');
 function updateSearch(){query=input.value.trim().normalize('NFKC').toLocaleLowerCase('ko-KR');limit=pageSize;render()}
 input.addEventListener('input',updateSearch);
 clear.addEventListener('click',()=>{input.value='';updateSearch();input.focus()});
 more.addEventListener('click',()=>{limit+=pageSize;render();if(more.hidden)notice.focus()});
 notice.tabIndex=-1;
 function render(){
  grid.replaceChildren();const terms=query.split(/\s+/).filter(Boolean);
  const matches=products.filter(p=>(selected==='all'||p.category===selected)&&terms.every(term=>searchable(p).includes(term)));
  const shown=matches.slice(0,limit);
  for(const product of shown){
   const card=document.createElement('article');card.className='product-card';const href='product.html?id='+encodeURIComponent(product.id);
   const imageWrap=document.createElement('a');imageWrap.className='product-image-wrap';imageWrap.href=href;imageWrap.setAttribute('aria-label',product.title+' 상세 보기');
   const image=new Image();image.className='product-image';image.src=product.url;image.alt=product.title+(product.is_ai?' · AI 생성 예시':' · 제품 사진');image.loading='lazy';
   const kind=document.createElement('span');kind.className='product-kind';kind.textContent=product.is_ai?'AI 생성 예시':'제품 사진';imageWrap.append(image,kind);
   const body=document.createElement('div');body.className='product-body';const category=document.createElement('span');category.className='product-category';category.textContent=catalogLabels[product.category];
   const title=document.createElement('h3'),titleLink=document.createElement('a');titleLink.href=href;titleLink.textContent=product.title;title.append(titleLink);
   const description=document.createElement('p');description.className='product-description';description.textContent=product.description;
   const price=document.createElement('p');price.className='product-price';let variants=[];try{variants=ProductOptions.normalize(product.variants||[])}catch{}
   const prices=variants.map(v=>v.price).filter(v=>v!==null);const minimum=prices.length?Math.min(...prices):null;
   const priceLabel=document.createElement('span');priceLabel.className='product-price-label';priceLabel.textContent=minimum===null?'가격 안내':'판매 단가';price.append(priceLabel);
   const amount=document.createElement('strong');amount.textContent=minimum===null?'가격 문의':new Intl.NumberFormat('ko-KR').format(minimum)+'원';price.append(amount);
   if(minimum!==null){const unit=document.createElement('span');unit.className='product-price-unit';unit.textContent='/ '+(ProductOptions.units.includes(product.price_unit)?product.price_unit:'원/장').split('/')[1]+(new Set(prices).size>1?'부터':'');price.append(unit)}
   const specs=document.createElement('p');specs.className='product-card-specs';
   const axes=[['thickness','두께'],['length','길이']];const summary=axes.map(([key,label])=>{const values=[...new Set(variants.map(v=>v[key]).filter(Boolean))];return values.length?label+' '+values.slice(0,2).join(' · ')+(values.length>2?' 외':''):''}).filter(Boolean);
   specs.textContent=summary.join(' / ')||(variants.length?`규격·색상 ${variants.length}개 옵션`:'규격·공급 가능 여부 상담');
   if(minimum!==null&&prices.length<variants.length){const note=document.createElement('small');note.textContent='일부 옵션은 가격 문의';price.append(note)}
   const link=document.createElement('a');link.className='product-contact';link.href=href;link.textContent='상품 상세·옵션 보기';const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(arrow);
   body.append(category,title,specs,description,price,link);card.append(imageWrap,body);grid.append(card);
  }
  filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selected)));
  clear.hidden=!input.value;empty.hidden=!products.length||matches.length>0;more.hidden=shown.length>=matches.length;more.textContent=`상품 더 보기 (${shown.length} / ${matches.length})`;
  notice.textContent=products.length?`${selected==='all'?'전체':catalogLabels[selected]}${query?' · 검색 결과':''} · ${matches.length}개 중 ${shown.length}개 표시. 상품을 누르면 규격별 가격과 옵션을 볼 수 있습니다.`:'자재·상품 안내를 준비하고 있습니다.';
 }
 try{
  const rank=category=>category==='louver-steel'?0:category==='zinc'?1:category==='color'?2:3;
  products=(await ProductService.list()).map(ProductService.catalogProduct).filter(Boolean);
  const categories=['all',...Object.keys(catalogLabels).filter(key=>products.some(p=>p.category===key)).sort((a,b)=>rank(a)-rank(b))];
  for(const category of categories){const button=document.createElement('button');button.type='button';button.dataset.category=category;button.textContent=category==='all'?'전체':catalogLabels[category];button.addEventListener('click',()=>{selected=category;limit=pageSize;render()});filters.append(button)}render();
 }catch(error){filters.hidden=true;search.hidden=true;more.hidden=true;notice.textContent='자재·상품 안내를 준비하고 있습니다. 필요한 자재는 전화로 문의해 주세요.';console.warn(error.message)}
})();
