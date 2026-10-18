(() => {
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 function buildModel(product,variants,label){
  const detail=window.ProductDetailData?.[product.id];
  const values=key=>[...new Set(variants.map(v=>v[key]).filter(Boolean))];
  const thickness=values('thickness');if(!thickness.length){const value=product.title.match(/\b\d+(?:\.\d+)?T\b/i)?.[0];if(value)thickness.push(value);}
  return {detail,label,rows:[['상품명',product.title],['자재 분류',label],['두께',thickness.join(' · ')||'선택 옵션 및 상담으로 확인'],['길이',values('length').join(' · ')||'선택 옵션 및 상담으로 확인'],['색상·종류',values('color').join(' · ')||'선택 옵션 및 상담으로 확인'],['판매 단위',ProductOptions.units.includes(product.price_unit)?product.price_unit.split('/')[1]:'장']],colors:values('color')};
 }
 function mount(container,product,variants,label){
  const model=buildModel(product,variants,label),detail=model.detail;container.replaceChildren();
  const nav=el('nav','detail-section-nav');nav.setAttribute('aria-label','상품 상세 안내');
  for(const [id,title] of [['product-overview','상품 설명'],['product-specifications','규격·색상'],['product-visuals','상세 사진'],['product-delivery','납품·시공 안내']]){const link=el('a','',title);link.href='#'+id;nav.append(link);}
  container.append(nav);
  function section(id,kicker,title){const node=el('section','detail-content-block');node.id=id;node.append(el('p','detail-eyebrow',kicker),el('h2','',title));container.append(node);return node;}
  const overview=section('product-overview','PRODUCT DETAIL',detail?.headline||product.title);overview.append(el('p','detail-intro-copy',detail?.description||product.description));
  if(detail?.features){const list=el('ul','detail-feature-list');for(const text of detail.features)list.append(el('li','',text));overview.append(list);}
  const banner=el('div','detail-consult-banner');banner.append(el('strong','','자재 납품부터 직영 시공까지'),el('p','','신명건설이 필요한 자재와 현장 조건을 함께 살펴봅니다. 규격·수량·현장 위치를 알려주시면 납품과 시공을 상담해 드립니다.'));overview.append(banner);
  const specs=section('product-specifications','SPECIFICATION','선택 가능한 규격과 색상');
  const table=el('table','detail-spec-table');const caption=el('caption','',product.title+' 등록 규격 안내');table.append(caption);const tbody=el('tbody');
  for(const [name,value] of model.rows){const row=el('tr'),th=el('th','',name);th.scope='row';row.append(th,el('td','',value));tbody.append(row);}table.append(tbody);specs.append(table);
  specs.append(el('p','detail-caption','위 내용은 현재 등록된 판매 옵션을 기준으로 안내합니다. 색상·두께·길이 조합별 가격은 상단 옵션에서 확인해 주세요. 화면의 색상은 실제 자재와 차이가 있을 수 있어 발주 전 샘플 확인을 권합니다.'));
  const visuals=section('product-visuals','PRODUCT IMAGES','제품 이미지와 적용 예시');
  visuals.append(el('p','detail-caption','아래 이미지는 신명건설용으로 제작한 AI 생성 예시입니다. 실제 제품 사진이나 시공사진이 아니며, 제품의 형상·색상·구성과 차이가 있을 수 있습니다. 실제 규격과 색상은 상단 판매 옵션 및 상담을 통해 확인해 주세요.'));
  const stack=el('div','detail-image-stack');visuals.append(stack);if(!detail?.images?.length)stack.append(el('p','detail-caption','신명건설 전용 제품 예시 이미지를 준비하고 있습니다.'));
  const imageUrls=detail?.images||[];
  imageUrls.forEach((url,i)=>{const figure=el('figure','detail-reference-figure'),link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',product.title+' AI 생성 예시 크게 보기');
   const image=el('img');image.src=url;image.alt=product.title+' AI 생성 예시 이미지 '+(i+1);image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note','AI 생성 예시 · 실제 제품 및 시공사진이 아닙니다'));
   const fallback=el('p','detail-image-fallback','이미지를 불러오지 못했습니다. 이미지를 새 창에서 열어 확인해 주세요.');fallback.hidden=true;figure.append(fallback);
   image.addEventListener('error',()=>{image.hidden=true;fallback.hidden=false;const direct=el('a','','이미지 크게 보기 ↗');direct.href=url;direct.target='_blank';direct.rel='noopener noreferrer';fallback.append(' ',direct);});
   stack.append(figure);
  });

  const delivery=section('product-delivery','ORDER & DELIVERY','납품과 시공, 이렇게 상담하세요');
  const list=el('ol','detail-order-steps');
  for(const [title,text] of [['적용 부위 확인','지붕·외벽 등 사용할 위치와 현장 사진, 필요한 자재를 알려주세요.'],['규격·수량 협의','색상·두께·길이와 필요한 수량, 마감 부자재를 함께 확인합니다.'],['납품·시공 일정 상담','현장 위치와 진입·하차 조건을 바탕으로 배송비와 납기, 직영 시공 범위를 협의합니다.']]){const li=el('li');li.append(el('h3','',title),el('p','',text));list.append(li);}delivery.append(list);
  const notes=el('ul','detail-order-notes');for(const text of ['제품 자료의 폭·겹침 치수와 실제 시공 면적을 함께 확인해 수량을 산정해 주세요.','긴 자재는 차량 진입과 하차 공간, 보관 장소를 미리 확인해 주세요.','주문 전 제작·절단 여부와 규격 변경, 교환·반품 가능 조건을 상담해 주세요.'])notes.append(el('li','',text));delivery.append(notes);
  const actions=el('div','detail-guide-actions'),call=el('a','detail-call','전화 상담 010-7502-2856'),inquiry=el('a','detail-email','이 상품 견적 문의 ↗');call.href='tel:01075022856';inquiry.href='inquiry.html?'+new URLSearchParams({product:product.title,category:product.category});actions.append(call,inquiry);delivery.append(actions);
  return model;
 }
 window.ProductDetailContent={buildModel,mount};
})();
