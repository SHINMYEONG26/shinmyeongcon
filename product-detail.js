(async()=>{
 const q=s=>document.querySelector(s),status=q('.detail-status'),id=new URLSearchParams(location.search).get('id');
 if(!id){status.textContent='선택된 상품이 없습니다. 자재·상품 목록에서 상품을 선택해 주세요.';return}
 try{
  const product=(await ProductService.list()).map(ProductService.catalogProduct).filter(Boolean).find(p=>String(p.id)===id);if(!product){status.textContent='상품을 찾을 수 없습니다. 목록에서 다른 상품을 선택해 주세요.';return}
  document.title=product.title+' | 신명건설';const label=ProductService.catalogLabels[product.category];q('[data-detail-category]').textContent=label;
  q('#detail-product-title').textContent=product.title;q('[data-spec-category]').textContent=label;q('[data-spec-description]').textContent=product.description;
  const image=q('.detail-photo');image.src=product.url;image.alt=product.title+(product.is_ai?' · AI 생성 예시':' · 제품 사진');q('.detail-photo-link').href=product.url;q('.detail-photo-link').setAttribute('aria-label',product.title+' 사진 크게 보기 (새 창)');q('.detail-image-kind').textContent=product.is_ai?'AI 생성 예시':'제품 사진';
  let variants=[];try{variants=ProductOptions.normalize(product.variants||[])}catch{}
  const prices=variants.map(v=>v.price).filter(v=>v!==null);const minimum=prices.length?Math.min(...prices):null;
  q('.detail-base-price strong').textContent=minimum===null?'가격 문의':ProductOptions.priceText(minimum,product.price_unit)+(new Set(prices).size>1?'부터':'');
  let selection={complete:false,price:null,summary:''};const quantity=q('#detail-quantity-input'),optionContent=q('.detail-option-content');
  function calculate(){const amount=Math.max(1,Math.min(9999,Math.trunc(Number(quantity.value)||1)));quantity.value=String(amount);q('.detail-total strong').textContent=!selection.complete?'옵션을 선택해 주세요':selection.price===null?'가격 문의':new Intl.NumberFormat('ko-KR').format(selection.price*amount)+'원';q('.detail-selection').textContent=selection.complete?[selection.summary,`수량 ${amount}개`].filter(Boolean).join(' · '):'색상과 규격을 선택해 주세요.';q('.detail-email').href='inquiry.html?'+new URLSearchParams({product:product.title,category:product.category,selection:q('.detail-selection').textContent}).toString();}
  optionContent.addEventListener('product-price-change',e=>{selection=e.detail;calculate()});ProductOptions.mount(optionContent,product);quantity.addEventListener('change',calculate);quantity.addEventListener('input',calculate);
  for(const select of optionContent.querySelectorAll('select')){const labelNode=select.parentElement.firstChild;const optionLabels=[...select.options].map(o=>o.textContent).filter(t=>t.includes(': '));if(optionLabels.length&&optionLabels.length===select.options.length-1){const names=new Set(optionLabels.map(t=>t.split(': ')[0]));if(names.size===1){const name=[...names][0];labelNode.nodeValue=name;select.setAttribute('aria-label',product.title+' '+name+' 선택');select.options[0].textContent=name+' 선택';for(const option of [...select.options].slice(1))option.textContent=option.textContent.slice(name.length+2);}}}
  q('.detail-description-section p').textContent=product.description;q('.detail-layout').hidden=false;q('.detail-description-section').hidden=false;status.hidden=true;
 }catch{status.textContent='상품을 불러오지 못했습니다. 잠시 후 새로고침하거나 전화로 문의해 주세요.'}
})();
