(() => {
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 function buildModel(product,variants,label){
  const originalDetail=window.ProductDetailData?.[product.id];
  const detail=originalDetail?{...originalDetail,registeredImagesOnly:true,images:[product.url],visualIntro:originalDetail?.description||product.description,visualGuide:null,visualGuideMobile:null,storyBoard:null,dimensionImage:null,colorImage:null,installedImage:null,benefitImages:[]}:originalDetail;
  const values=key=>[...new Set(variants.map(v=>v[key]).filter(Boolean))];
  const thickness=values('thickness');if(!thickness.length){const value=product.title.match(/\b\d+(?:\.\d+)?T\b/i)?.[0];if(value)thickness.push(value);}
  return {detail,label,rows:[['상품명',product.title],['자재 분류',label],...(detail?.manufacturerSpecs||[]),['두께',thickness.join(' · ')||'선택 옵션 및 상담으로 확인'],[values('length').some(v=>String(v).startsWith('종류:'))?'등록 종류':'판매 길이 옵션',values('length').join(' · ')||'선택 옵션 및 상담으로 확인'],['색상·종류',values('color').join(' · ')||'선택 옵션 및 상담으로 확인'],['판매 단위',ProductOptions.units.includes(product.price_unit)?product.price_unit.split('/')[1]:'장']],colors:values('color')};
 }
 function mount(container,product,variants,label){
  const model=buildModel(product,variants,label),detail=model.detail;container.replaceChildren();
  const nav=el('nav','detail-section-nav');nav.setAttribute('aria-label','상품 상세 안내');
  for(const [id,title] of [['product-overview','상품 설명·장점'],['product-specifications','규격·치수'],['product-installation-guide','시공 방법'],['product-colors','색상 비교'],['product-visuals','상세 이미지'],['product-installations','시공 예시'],['product-delivery','납품·시공 안내']]){if((id==='product-colors'&&!detail?.colorImage)||(id==='product-installations'&&!detail?.installedImage))continue;const link=el('a','',title);link.href='#'+id;nav.append(link);}
  container.append(nav);
  function section(id,kicker,title){const node=el('section','detail-content-block');node.id=id;node.append(el('p','detail-eyebrow',kicker),el('h2','',title));container.append(node);return node;}
  const overview=section('product-overview','PRODUCT DETAIL',detail?.headline||product.title);overview.append(el('p','detail-intro-copy',detail?.visualIntro||detail?.description||product.description));
  if(!detail?.visualGuide&&detail?.features){const list=el('ul','detail-feature-list');for(const text of detail.features)list.append(el('li','',text));overview.append(list);}
  function pictureBlock(node,desktop,mobile,alt,caption,height=1170,mobileHeight=1530){const figure=el('figure','detail-reference-figure'),link=el('a');link.href=desktop;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',alt+' 크게 보기');const picture=el('picture');if(mobile){const source=el('source');source.media='(max-width:760px)';source.srcset=mobile;source.setAttribute('width','600');source.setAttribute('height',String(mobileHeight));picture.append(source);}const image=el('img');image.src=desktop;image.alt=alt;image.width=1200;image.height=height;image.loading='lazy';image.decoding='async';picture.append(image);link.append(picture);figure.append(link);if(caption)figure.append(el('figcaption','detail-source-note',caption));node.append(figure);}
  const guide=el('div','detail-picture-guide');guide.id='product-benefits';
  if(detail?.storyBoard){
   const figure=el('figure','detail-story-figure'),link=el('a');link.href=detail.storyBoard;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',product.title+' 구조·연결·장점·적용 설명 그림 크게 보기');
   const image=el('img');image.src=detail.storyBoard;image.alt=product.title+' 자재 형태 확대, 연결 구조, 제품별 장점과 건물 적용을 보여주는 네 장면 설명';image.width=detail.storyWidth;image.height=detail.storyHeight;image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note','직접 제작한 AI 설명 그림 · 연결 방식은 이해를 돕는 개념이며 실제 시공도면과 시공사진이 아닙니다'));guide.append(figure);
   const more=el('details','detail-spec-fold');more.append(el('summary','','핵심 구조 그림 더보기'));pictureBlock(more,detail.visualGuide,detail.visualGuideMobile,product.title+' 핵심 특징 정리','정확한 치수와 색상은 규격·샘플로 확인');guide.append(more);
  }else if(detail?.visualGuide){pictureBlock(guide,detail.visualGuide,detail.visualGuideMobile,product.title+' 그림으로 보는 특징·장점','정확한 치수와 색상은 규격·샘플로 확인');}
  for(const item of detail?.benefitImages||[])photoBlock(guide,item.src,item.alt,'열반사 원리·구성 개념도');
  if(detail?.storyBoard||detail?.visualGuide)overview.append(guide);
  const extended=el('div','detail-extended-copy'),summary=el('h3','','상품 특징·장점·활용 안내');if(detail?.registeredImagesOnly)extended.open=true;extended.append(summary);overview.append(extended);
  const banner=el('div','detail-consult-banner');banner.append(el('strong','','자재 납품부터 직영 시공까지'),el('p','','신명건설이 필요한 자재와 현장 조건을 함께 살펴봅니다. 규격·수량·현장 위치를 알려주시면 납품과 시공을 상담해 드립니다.'));
  if(detail?.benefits?.length){const benefit=el('div','detail-benefits');benefit.append(el('h2','',detail.benefitsTitle||'이 상품의 장점'));const cards=el('ul','detail-feature-list');for(const item of detail.benefits){const li=el('li');li.append(el('strong','',item.title),el('p','',item.text));cards.append(li);}benefit.append(cards);extended.append(benefit);}
  if(detail?.useCases?.length){const uses=el('div','detail-use-cases');uses.append(el('h2','','추천 용도와 활용 방향'));const cards=el('ul','detail-feature-list');for(const item of detail.useCases){const li=el('li');li.append(el('strong','',item.title),el('p','',item.text));cards.append(li);}uses.append(cards);extended.append(uses);}
  if(detail?.selectionTips?.length){const notes=el('div','detail-selection-guide');notes.append(el('h2','','발주·시공 전에 확인해 주세요'));const list=el('ul','detail-order-notes');for(const tip of detail.selectionTips)list.append(el('li','',tip));notes.append(list);extended.append(notes);}
  if(!detail?.visualGuide)overview.append(banner);

  const installation=section('product-installation-guide','INSTALLATION','시공 방법과 확인 사항');
  installation.append(el('p','detail-caption','아래는 시공 흐름을 이해하기 위한 안내입니다. 고정 간격·체결 방식·하부 구성은 제조사 지침과 현장 조건에 맞춰 확인합니다.'));
  let steps;
  if(/사이딩/.test(product.title))steps=[['바탕과 하부틀 확인','벽체의 상태·수평·수직을 확인하고 방수 및 하부틀 구성을 계획합니다.'],['시작부와 모서리 준비','스타터와 창호·모서리 마감재의 위치를 정하고 기준선을 잡습니다.'],['패널 연결과 고정','제품의 결합 방향에 맞춰 패널을 연결하며 하부틀에 고정합니다. 절단부와 개구부는 전용 마감재 구성을 확인합니다.'],['끝단 마감과 점검','외부 모서리·상부·창호 주변의 마감 및 물이 빠지는 경로를 점검합니다.']];
  else if(/덧방/.test(product.title))steps=[['기존 지붕 점검','누수·부식·처짐과 기존 지붕 하부 구조를 확인해 덧방 시공 가능 여부를 판단합니다.'],['형상과 지지 위치 확인','V115·V250·V330 중 현장 형상과 맞는 제품을 검토하고 고정 가능한 지지 위치를 확인합니다.'],['판재 배치와 체결','물 흐름과 지붕 경사를 고려해 판재를 배치하고 지정된 겹침·체결 방법을 적용합니다.'],['접합부 마감','처마·용마루·벽체 접합부와 관통부의 방수 마감을 점검합니다.']];
  else if(/평잇기/.test(product.title))steps=[['바탕면 준비','하부 구조의 평활도와 방수 구성을 확인합니다.'],['모듈 기준선 설정','정사각 판재의 배열과 줄눈 위치를 정해 개구부·모서리와 균형을 맞춥니다.'],['판재 연결','제조사가 안내하는 평잇기 결합·고정 방식에 맞춰 순서대로 설치합니다.'],['가장자리 마감','끝단·모서리·창호 주변의 마감재와 배수 경로를 확인합니다.']];
  else steps=[['현장과 바탕 확인','지붕 경사 또는 벽체 상태를 확인하고 하부틀·방수·단열 구성을 계획합니다.'],['배치와 수량 산정','제품의 유효폭과 시공 방향을 기준으로 패널 장수·길이 및 창호·모서리 마감 위치를 정합니다.'],['패널 설치와 고정',/인터락/.test(product.title)?'패널 양쪽의 결합 방향을 확인해 맞물림을 유지하며 제조사 지정 방식으로 하부틀에 고정합니다.':/리얼징크/.test(product.title)?'세로 이음선과 판재 배치를 맞추고 해당 제품의 이음·체결 방식에 따라 설치합니다.':'골 방향과 제품별 겹침·연결 방향을 확인한 뒤 지정된 체결재와 방식으로 하부틀에 고정합니다.'],['마감과 최종 점검','처마·용마루·창호·모서리 등 접합부를 마감하고 고정 상태와 배수·방수 구성을 점검합니다.']];
  const installList=el('ol','detail-order-notes');for(const [title,text] of steps){const item=el('li');item.append(el('strong','',title),el('p','',text));installList.append(item);}installation.append(installList);

  const specs=section('product-specifications','SPECIFICATION','선택 가능한 규격과 색상');
  if(detail?.dimensionImage){const figure=el('figure','detail-size-figure'),link=el('a');link.href=detail.dimensionImage;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',product.title+' 입체 치수 이미지 크게 보기');const image=el('img');image.src=detail.dimensionImage;image.alt=product.title+' 전체폭·유효폭 입체 규격 이미지';image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','','AI 제작 입체 예시 · 표기 치수는 제조사 공개 규격 기준 · 형상 및 비례는 실제 제품과 다를 수 있습니다'));specs.append(figure);}
  if(detail?.specImage){const fold=el('details','detail-spec-fold');fold.append(el('summary','','단면 규격도 보기'));const figure=el('figure','detail-size-figure'),link=el('a');link.href=detail.specImage;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',product.title+' 규격 안내도 크게 보기');const image=el('img');image.src=detail.specImage;image.alt=product.title+' 제조사 공개 규격 기준 안내도';image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','','제조사 공개 규격 기준 · 직접 제작한 개념도 · 비례 아님'));fold.append(figure);specs.append(fold);}
  const table=el('table','detail-spec-table');const caption=el('caption','',product.title+' 등록 규격 안내');table.append(caption);const tbody=el('tbody');
  for(const [name,value] of model.rows){const row=el('tr'),th=el('th','',name);th.scope='row';row.append(th,el('td','',value));tbody.append(row);}table.append(tbody);const tableFold=el('details','detail-spec-fold');tableFold.append(el('summary','','전체 규격표·판매 옵션 보기'),table);if(detail?.registeredImagesOnly)tableFold.open=true;specs.append(tableFold);
  if(detail?.specSource){const note=el('p','detail-caption','제조사 공개 규격 · '+(detail.specTolerance?detail.specTolerance+'. ':'')+'발주 전 공급 규격 확인 · '),link=el('a','','규격 출처: HN METALLIC ↗');link.href=detail.specSource;link.target='_blank';link.rel='noopener noreferrer';note.append(link);specs.append(note);}
  specs.append(el('p','detail-caption','색상·두께·길이별 가격은 상단 옵션에서 확인하세요.'));
  function photoBlock(node,url,alt,caption){const figure=el('figure','detail-reference-figure'),link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',alt+' 크게 보기');const image=el('img');image.src=url;image.alt=alt;image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note',caption));node.append(figure);}
  if(detail?.colorImage){const colors=section('product-colors','COLOR COLLECTION',detail.colorTitle||'색상과 표면을 비교해 보세요');colors.append(el('p','detail-caption','현재 등록된 색상을 그림으로 비교하세요. 실제 색상은 샘플로 확인해 주세요.'));photoBlock(colors,detail.colorImage,product.title+' 색상·종류 비교 이미지','AI 제작 비교 예시 · 화면의 색상은 실제 자재와 다를 수 있습니다');}
  const visuals=section('product-visuals','PRODUCT IMAGES','제품 이미지와 적용 예시');
  visuals.append(el('p','detail-caption',detail?.registeredImagesOnly?'등록된 상품 사진입니다.':'AI로 제작한 제품 예시입니다. 실제 형상·색상과 다를 수 있습니다.'));
  const stack=el('div','detail-image-stack');visuals.append(stack);if(!detail?.images?.length)stack.append(el('p','detail-caption','신명건설 전용 제품 예시 이미지를 준비하고 있습니다.'));
  const imageUrls=detail?.images||[];
  imageUrls.forEach((url,i)=>{const figure=el('figure','detail-reference-figure'),link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',product.title+(detail?.registeredImagesOnly?' 제품 사진 크게 보기':' AI 생성 예시 크게 보기'));
   const image=el('img');image.src=url;image.alt=product.title+(detail?.registeredImagesOnly?' 제품 사진 ':' AI 생성 예시 이미지 ')+(i+1);image.loading='lazy';image.decoding='async';link.append(image);figure.append(link,el('figcaption','detail-source-note',detail?.registeredImagesOnly?'등록된 제품 사진':'AI 생성 예시 · 실제 제품 및 시공사진이 아닙니다'));
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



