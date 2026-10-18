(async()=>{
 const grid=document.getElementById('products-grid'),notice=document.getElementById('products-notice');if(!grid)return;
 const filters=document.createElement('div');filters.className='product-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label','자재·상품 분야 선택');grid.before(filters);
 let products=[],selected='all';
 function render(){
  grid.replaceChildren();const shown=products.filter(p=>selected==='all'||p.category===selected);
  for(const product of shown){
   const card=document.createElement('article');card.className='product-card';const href='product.html?id='+encodeURIComponent(product.id);
   const imageWrap=document.createElement('a');imageWrap.className='product-image-wrap';imageWrap.href=href;imageWrap.setAttribute('aria-label',product.title+' 상세 보기');
   const image=new Image();image.className='product-image';image.src=product.url;image.alt=product.title+(product.is_ai?' · AI 생성 예시':' · 제품 사진');image.loading='lazy';
   const kind=document.createElement('span');kind.className='product-kind';kind.textContent=product.is_ai?'AI 생성 예시':'제품 사진';imageWrap.append(image,kind);
   const body=document.createElement('div');body.className='product-body';const category=document.createElement('span');category.className='product-category';category.textContent=ProductService.labels[product.category];
   const title=document.createElement('h3'),titleLink=document.createElement('a');titleLink.href=href;titleLink.textContent=product.title;title.append(titleLink);
   const description=document.createElement('p');description.className='product-description';description.textContent=product.description;
   const price=document.createElement('p');price.className='product-price';let variants=[];try{variants=ProductOptions.normalize(product.variants||[])}catch{}
   const prices=variants.map(v=>v.price).filter(v=>v!==null);const minimum=prices.length?Math.min(...prices):null;
   price.textContent=minimum===null?'가격 문의':ProductOptions.priceText(minimum,product.price_unit)+(new Set(prices).size>1?'부터':'');
   const link=document.createElement('a');link.className='product-contact';link.href=href;link.textContent='상품 상세·옵션 보기';const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(arrow);
   body.append(category,title,description,price,link);card.append(imageWrap,body);grid.append(card);
  }
  filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selected)));
  notice.textContent=products.length?`${selected==='all'?'전체':ProductService.labels[selected]} · ${shown.length}개 상품. 상품을 누르면 규격별 가격과 옵션을 볼 수 있습니다.`:'자재·상품 안내를 준비하고 있습니다.';
 }
 try{
  products=await ProductService.list();const categories=['all',...Object.keys(ProductService.labels).filter(key=>products.some(p=>p.category===key))];
  for(const category of categories){const button=document.createElement('button');button.type='button';button.dataset.category=category;button.textContent=category==='all'?'전체':ProductService.labels[category];button.addEventListener('click',()=>{selected=category;render()});filters.append(button)}render();
 }catch(error){filters.hidden=true;notice.textContent='자재·상품 안내를 준비하고 있습니다. 필요한 자재는 전화로 문의해 주세요.';console.warn(error.message)}
})();
