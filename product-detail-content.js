(() => {
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 function buildModel(product,variants,label){
  const detail=window.ProductDetailData?.[product.id];
  const values=key=>[...new Set(variants.map(v=>v[key]).filter(Boolean))];
  const thickness=values('thickness');if(!thickness.length){const value=product.title.match(/\b\d+(?:\.\d+)?T\b/i)?.[0];if(value)thickness.push(value);}
  return {detail,label,rows:[['상품명',product.title],['자재 분류',label],...(detail?.manufacturerSpecs||[]),['두께',thickness.join(' · ')||'선택 옵션 및 상담으로 확인'],[values('length').some(v=>String(v).startsWith('종류:'))?'등록 종류':'판매 길이 옵션',values('length').join(' · ')||'선택 옵션 및 상담으로 확인'],['색상·종류',values('color').join(' · ')||'선택 옵션 및 상담으로 확인'],['판매 단위',ProductOptions.units.includes(product.price_unit)?product.price_unit.split('/')[1]:'장']],colors:values('color')};
 }
 function mount(container,product,variants,label){
  const model=buildModel(product,variants,label),detail=model.detail;container.replaceChildren();
  const nav=el('nav','detail-section-nav');nav.setAttribute('aria-label','상품 상세 안내');
  for(const [id,title] of [['product-overview','상품 설명·장점'],['product-specifications','규격·치수'],['product-colors','색상 비교'],['product-visuals','상세 이미지'],['product-installations','시공 예시'],['product-delivery','납품·시공 안내']]){const link=el('a','',title);link.href='#'+id;nav.append(link);}
  container.append(nav);
  function section(id,kicker,title){const node=el('section','detail-content-block');node.id=id;node.append(el('p','detail-eyebrow',kicker),el('h2','',title));container.append(node);return node;}
  const overview=section('product-overview','PRODUCT DETAIL',detail?.headline||product.title);overview.append(el('p','detail-intro-copy',detail?.visualIntro||detail?.description||product.description));
  if(!detail?.visualGuide&&detail?.features){const list=el('ul','detail-feature-list');for(const text of detail.features)list.append(el('li','',text));overview.append(list);}
  function pictureBlock(node,desktop,mobile,alt,caption,height=1170,mobileHeight=1530){const figure=el('figure','detail-reference-figure'),link=el('a');link.href=desktop;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',alt+' 크게 보기');const picture=el('picture');if(mobile){const source=el('source');source.media='(max-width:760px)';source.srcset=mobile;source.setAttribute('width','600');source.setAttribute('height',String(mobileHeight));picture.append(source);}const image=el('img');image.src=desktop;image.alt=alt;image.width=1200;image.height=height;image.loading='lazy';image.decoding='async';picture.append(image);link.append(picture);figure.append(link);if(caption)figure.append(el('figcaption','detail-source-note',caption));node.append(figure);}
  const guide=el('div','detail-picture-guide');guide.id='product-benefits';if(detail?.visualGuide){pictureBlock(guide,detail.visualGuide,detail.visualGuideMobile,product.title+' 그림으로 보는 특징·장점','그림 설명 · 정확한 치수와 색상은 규격·샘플로 확인');for(const item of detail.benefitImages||[])photoBlock(guide,item.src,item.alt,'열반사 원리·구성 개념도');overview.append(guide);}
  const extended=el('details','detail-extended-copy'),summary=el('summary','','자세한 설명 펼쳐보기');extended.append(summary);overview.append(extended);
  const banner=el('div','detail-consult-banner');banner.append(el('strong','','자재 납품부터 직영 시공까지'),el('p','','신명건설이 필요한 자재와 현장 조건을 함께 살펴봅니다. 규격·수량·현장 위치를 알려주시면 납품과 시공을 상담해 드립니다.'));
  if(detail?.benefits?.length){const benefit=el('div','detail-benefits');benefit.append(el('h2','',detail.benefitsTitle||'이 상품의 장점'));const cards=el('ul','detail-feature-list');for(const item of detail.benefits){const li=el('li');li.append(el('strong','',item.title),el('p','',item.text));cards.append(li);}benefit.append(cards);extended.append(benefit);}
  if(detail?.useCases?.length){const uses=el('div','detail-use-cases');uses.append(el('h2','','추천 용도와 활용 방향'));const cards=el('ul','detail-feature-list');for(const item of detail.useCases){const li=el('li');li.append(el('strong','',item.title),el('p','',item.text));cards.append(li);}uses.append(cards);extended.append(uses);}
  if(detail?.selectionTips?.length){const notes=el('div','detail-selection-guide');notes.append(el('h2','','발주·시공 전에 확인해 주세요'));const list=el('ul','detail-order-notes');for(const tip of detail.selectionTips)list.append(el('li','',tip));notes.append(list);extended.append(notes);}
  if(!detail?.visualGuide)overview.append(banner);
  const specs=section('product-specifications','SPECIFICATION','선택 가능한 규격과 색상');
  if(detail?.dimensionImage){const figure=el('figure','detail-size-figure'),link=el('a');link.href=detail.dimensionImage;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',product.title+' 입체 치수 이미지 크게 보기');const image=el('img');image.src=detail.dimensionImage;image.alt=product.title+' 전체폭·유효폭 입체 규격 이미지';image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','','AI 제작 입체 예시 · 표기 치수는 제조사 공개 규격 기준 · 형상 및 비례는 실제 제품과 다를 수 있습니다'));specs.append(figure);}
  if(detail?.specImage){const fold=el('details','detail-spec-fold');fold.append(el('summary','','단면 규격도 보기'));const figure=el('figure','detail-size-figure'),link=el('a');link.href=detail.specImage;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',product.title+' 규격 안내도 크게 보기');const image=el('img');image.src=detail.specImage;image.alt=product.title+' 제조사 공개 규격 기준 안내도';image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','','제조사 공개 규격 기준 · 직접 제작한 개념도 · 비례 아님'));fold.append(figure);specs.append(fold);}
  const table=el('table','detail-spec-table');const caption=el('caption','',product.title+' 등록 규격 안내');table.append(caption);const tbody=el('tbody');
  for(const [name,value] of model.rows){const row=el('tr'),th=el('th','',name);th.scope='row';row.append(th,el('td','',value));tbody.append(row);}table.append(tbody);const tableFold=el('details','detail-spec-fold');tableFold.append(el('summary','','전체 규격표·판매 옵션 보기'),table);specs.append(tableFold);
  if(detail?.specSource){const note=el('p','detail-caption','제조사 공개 규격 · '+(detail.specTolerance?detail.specTolerance+'. ':'')+'발주 전 공급 규격 확인 · '),link=el('a','','규격 출처: HN METALLIC ↗');link.href=detail.specSource;link.target='_blank';link.rel='noopener noreferrer';note.append(link);specs.append(note);}
  specs.append(el('p','detail-caption','색상·두께·길이별 가격은 상단 옵션에서 확인하세요.'));
  function photoBlock(node,url,alt,caption){const figure=el('figure','detail-reference-figure'),link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',alt+' 크게 보기');const image=el('img');image.src=url;image.alt=alt;image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note',caption));node.append(figure);}
  if(detail?.colorImage){const colors=section('product-colors','COLOR COLLECTION',detail.colorTitle||'색상과 표면을 비교해 보세요');colors.append(el('p','detail-caption','현재 등록된 색상을 그림으로 비교하세요. 실제 색상은 샘플로 확인해 주세요.'));photoBlock(colors,detail.colorImage,product.title+' 색상·종류 비교 이미지','AI 제작 비교 예시 · 화면의 색상은 실제 자재와 다를 수 있습니다');}
  const visuals=section('product-visuals','PRODUCT IMAGES','제품 이미지와 적용 예시');
  visuals.append(el('p','detail-caption','AI로 제작한 제품 예시입니다. 실제 형상·색상과 다를 수 있습니다.'));
  const stack=el('div','detail-image-stack');visuals.append(stack);if(!detail?.images?.length)stack.append(el('p','detail-caption','신명건설 전용 제품 예시 이미지를 준비하고 있습니다.'));
  const imageUrls=detail?.images||[];
  imageUrls.forEach((url,i)=>{const figure=el('figure','detail-reference-figure'),link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',product.title+' AI 생성 예시 크게 보기');
   const image=el('img');image.src=url;image.alt=product.title+' AI 생성 예시 이미지 '+(i+1);image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note','AI 생성 예시 · 실제 제품 및 시공사진이 아닙니다'));
   const fallback=el('p','detail-image-fallback','이미지를 불러오지 못했습니다. 이미지를 새 창에서 열어 확인해 주세요.');fallback.hidden=true;figure.append(fallback);
   image.addEventListener('error',()=>{image.hidden=true;fallback.hidden=false;const direct=el('a','','이미지 크게 보기 ↗');direct.href=url;direct.target='_blank';direct.rel='noopener noreferrer';fallback.append(' ',direct);});
   stack.append(figure);
  });

  if(detail?.installedImage){const installed=section('product-installations','APPLICATION VIEW','시공 후 모습을 미리 살펴보세요');installed.append(el('p','detail-caption','시공 후 분위기를 보여주는 AI 적용 예시입니다. 실제 시공사진이 아닙니다.'));photoBlock(installed,detail.installedImage,product.title+' 시공 후 AI 적용 예시','AI 제작 시공 후 예시 · 실제 시공사진이 아닙니다');}
  const delivery=section('product-delivery','ORDER & DELIVERY','납품과 시공, 이렇게 상담하세요');
  pictureBlock(delivery,'assets/product-guides/order-flow.svg','assets/product-guides/order-flow-mobile.svg','현장 확인부터 납품·시공까지','',350,900);
  const actions=el('div','detail-guide-actions'),call=el('a','detail-call','전화 상담 010-7502-2856'),inquiry=el('a','detail-email','이 상품 견적 문의 ↗');call.href='tel:01075022856';inquiry.href='inquiry.html?'+new URLSearchParams({product:product.title,category:product.category});actions.append(call,inquiry);delivery.append(actions);
  return model;
 }
 window.ProductDetailContent={buildModel,mount};
})();


