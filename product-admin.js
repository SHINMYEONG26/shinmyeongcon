(() => {
  const el=id=>document.getElementById(id),service=window.ProductService;
  const status=(message,error=false)=>{el('status').textContent=message;el('status').classList.toggle('error',error);};
  let loggedIn=false,mode='photos',file=null,previewUrl=null,busy=false,selectionId=0,editingId=null;
  let orderedProducts=[],orderDirty=false;
  const orderTools=document.createElement('div');orderTools.className='product-order-tools';
  const orderHint=document.createElement('p');orderHint.textContent='위·아래 버튼이나 순번으로 위치를 바꾼 뒤 저장하세요. 1번이 홈페이지에 먼저 표시됩니다.';
  const orderSave=document.createElement('button');orderSave.type='button';orderSave.textContent='노출 순서 저장';orderSave.disabled=true;
  const orderStatus=document.createElement('p');orderStatus.className='product-order-status';orderStatus.setAttribute('role','status');orderStatus.setAttribute('aria-live','polite');
  orderTools.append(orderHint,orderSave,orderStatus);el('product-library').before(orderTools);
  function markOrderDirty(value){orderDirty=value;orderSave.disabled=!value||busy;orderStatus.textContent=value?'순서가 변경되었습니다. 저장해야 홈페이지에 반영됩니다.':'';}
  function moveProduct(id,target){
    if(window.adminOperationBusy)return;
    const index=orderedProducts.findIndex(product=>product.id===id);
    if(index<0||!Number.isInteger(target)||target<0||target>=orderedProducts.length||target===index)return;
    const [product]=orderedProducts.splice(index,1);orderedProducts.splice(target,0,product);markOrderDirty(true);renderProducts();
    el('product-library').querySelector(`[data-order-id="${id}"]`)?.focus();
  }
  orderSave.addEventListener('click',async()=>{
    if(window.adminOperationBusy||!orderDirty)return;
    setBusy(true);orderStatus.textContent='노출 순서를 저장하는 중입니다…';
    try{await service.saveOrder(orderedProducts.map(product=>product.id));markOrderDirty(false);orderStatus.textContent='노출 순서를 저장했습니다. 홈페이지를 새로고침하면 반영됩니다.';}
    catch(error){orderStatus.textContent=error.message;status(error.message,true);}
    finally{setBusy(false);}
  });
  const clearPreview=()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;file=null;el('product-preview').replaceChildren();};
  function addVariant(values={}) {
    const host=el('product-variant-rows');
    if(host.children.length>=100){status('옵션은 최대 100개까지 추가할 수 있습니다.',true);return;}
    const row=document.createElement('div');row.className='variant-row';
    for(const [key,label] of [...ProductOptions.axes,['price','가격']]){
      const field=document.createElement('label');field.textContent=label;
      const input=document.createElement('input');input.dataset.variantField=key;
      if(key==='price'){input.type='number';input.min='0';input.max='9999999999';input.step='1';input.placeholder='미입력: 가격 문의';}
      else{input.type='text';input.maxLength=60;input.placeholder={color:'예: 차콜',thickness:'예: 0.5T',length:'예: 3m'}[key];}
      input.value=values[key]??'';field.append(input);row.append(field);
    }
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='조합 삭제';
    remove.addEventListener('click',()=>{if(window.adminOperationBusy)return;row.remove();if(!host.children.length)addVariant();});
    row.append(remove);host.append(row);
  }
  function readVariants(){return ProductOptions.normalize([...el('product-variant-rows').children].map(row=>Object.fromEntries([...row.querySelectorAll('input')].map(input=>[input.dataset.variantField,input.value]))));}
  function resetProductForm(){
    editingId=null;selectionId++;clearPreview();el('product-form').reset();el('product-photo').required=true;
    el('product-form-heading').textContent='자재·상품 추가';el('product-submit').textContent='홈페이지에 상품 등록';el('product-cancel-edit').hidden=true;
    el('product-variant-rows').replaceChildren();addVariant();
  }
  function editProduct(product){
    if(window.adminOperationBusy)return;
    selectionId++;clearPreview();editingId=product.id;el('product-form').reset();
    el('product-category').value=product.category;el('product-title').value=product.title;el('product-description').value=product.description;
    el('product-kind').value=product.is_ai?'ai':'actual';el('product-price-unit').value=ProductOptions.units.includes(product.price_unit)?product.price_unit:'원/장';
    el('product-photo').required=false;el('product-form-heading').textContent='자재·상품 수정';el('product-submit').textContent='변경 내용 저장';el('product-cancel-edit').hidden=false;
    el('product-variant-rows').replaceChildren();
    const rows=product.variants?.length?product.variants:[{}];rows.forEach(addVariant);
    const image=new Image();image.src=product.url;image.alt=product.title+' 현재 상품 사진';el('product-preview').append(image);
    status('사진을 바꾸려면 새 사진을 선택하세요. 옵션과 가격을 수정한 뒤 저장해 주세요.');el('product-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  el('product-add-variant').addEventListener('click',()=>{if(!window.adminOperationBusy)addVariant();});
  el('product-cancel-edit').addEventListener('click',()=>{if(!window.adminOperationBusy){resetProductForm();status('상품 수정을 취소했습니다.');}});
  addVariant();
  const updateView=()=>{
    el('manager-tabs').hidden=!loggedIn;
    el('upload-panel').hidden=!loggedIn||mode!=='photos';el('library-panel').hidden=!loggedIn||mode!=='photos';
    el('product-panel').hidden=!loggedIn||mode!=='products';el('product-library-panel').hidden=!loggedIn||mode!=='products';
    if(el('inquiry-panel'))el('inquiry-panel').hidden=!loggedIn||mode!=='inquiries';
    document.querySelectorAll('[data-manager-view]').forEach(button=>button.setAttribute('aria-pressed',String(mode===button.dataset.managerView)));
  };
  const syncDisabled=value=>{
    el('product-fields').disabled=value;el('product-refresh').disabled=value;el('product-logout').disabled=value;
    document.querySelectorAll('.delete-product,.edit-product,[data-manager-view],#product-cancel-edit').forEach(button=>button.disabled=value);
    orderSave.disabled=value||!orderDirty;
    el('product-library').querySelectorAll('[data-order-control]').forEach(control=>control.disabled=value||control.dataset.orderEdge==='true');
  };
  const setBusy=value=>{
    busy=value;window.adminOperationBusy=value;
    el('upload-fields').disabled=value;el('logout-button').disabled=value;el('refresh-button').disabled=value;
    document.querySelectorAll('.delete-photo').forEach(button=>button.disabled=value);syncDisabled(value);
  };
  async function loadProducts(){
    if(orderDirty&&!window.confirm('저장하지 않은 상품 순서가 있습니다. 순서 변경을 취소하고 목록을 새로 불러올까요?'))return;
    try{
      orderedProducts=await service.list();markOrderDirty(false);renderProducts();
    }catch(error){status(error.message,true);}
  }
  function renderProducts(){
      el('product-library').replaceChildren();orderTools.hidden=!orderedProducts.length;
      if(!orderedProducts.length){el('product-library').textContent='등록된 상품이 없습니다. 위에서 첫 상품을 추가해 주세요.';return;}
      for(const [index,product] of orderedProducts.entries()){
        const figure=document.createElement('figure'),image=new Image(),caption=document.createElement('figcaption'),remove=document.createElement('button');
        image.src=product.url;image.alt=product.title;image.loading='lazy';caption.textContent=`${service.labels[product.category]} · ${product.title}\n${product.is_ai?'AI 생성 예시':'제품 사진'}`;
        remove.type='button';remove.className='delete-product';remove.textContent='삭제';remove.setAttribute('aria-label',product.title+' 상품 삭제');
        remove.addEventListener('click',async()=>{
          if(window.adminOperationBusy||!confirm(`「${product.title}」 상품을 삭제할까요?\n홈페이지에서 사라지며 되돌릴 수 없습니다.`))return;
          setBusy(true);status('상품을 삭제하는 중입니다…');
          try{const result=await service.remove(product.id);if(editingId===product.id)resetProductForm();await loadProducts();status(result.warning||'상품을 삭제했습니다. 홈페이지를 새로고침하면 반영됩니다.',Boolean(result.warning));}
          catch(error){status(error.message,true);}finally{setBusy(false);}
        });
        const edit=document.createElement('button');edit.type='button';edit.className='secondary edit-product';edit.textContent='수정';edit.setAttribute('aria-label',product.title+' 상품 수정');edit.addEventListener('click',()=>editProduct(product));
        const info=document.createElement('p');info.className='variant-summary';info.textContent=(product.variants?.length||0)+'개 옵션 조합';
        const order=document.createElement('div');order.className='product-order-controls';
        const positionLabel=document.createElement('label');positionLabel.textContent='노출 순번';
        const position=document.createElement('input');position.type='number';position.min='1';position.max=String(orderedProducts.length);position.step='1';position.value=String(index+1);position.dataset.orderControl='';position.dataset.orderId=product.id;position.setAttribute('aria-label',product.title+' 노출 순번');position.disabled=Boolean(window.adminOperationBusy);
        position.addEventListener('change',()=>{const value=Number(position.value);if(!Number.isInteger(value)||value<1||value>orderedProducts.length){position.value=String(index+1);orderStatus.textContent=`순번은 1~${orderedProducts.length} 사이로 입력해 주세요.`;return;}moveProduct(product.id,value-1)});positionLabel.append(position);order.append(positionLabel);
        for(const [text,offset] of [['위로',-1],['아래로',1]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=text;button.dataset.orderControl='';const edge=index+offset<0||index+offset>=orderedProducts.length;button.dataset.orderEdge=String(edge);button.disabled=edge||Boolean(window.adminOperationBusy);button.setAttribute('aria-label',product.title+' '+text);button.addEventListener('click',()=>moveProduct(product.id,index+offset));order.append(button)}
        figure.append(image,caption,info,order,edit,remove);el('product-library').append(figure);
      }
  }
  document.addEventListener('admin-state',event=>{
    loggedIn=event.detail.loggedIn;
    if(!loggedIn){mode='photos';selectionId++;resetProductForm();orderedProducts=[];markOrderDirty(false);el('product-library').replaceChildren();}
    if(loggedIn&&new URLSearchParams(location.search).get('view')==='inquiries')mode='inquiries';
    updateView();if(loggedIn&&mode==='inquiries')document.dispatchEvent(new CustomEvent('inquiry-open'));
  });
  document.addEventListener('admin-busy',event=>syncDisabled(event.detail.busy));
  document.querySelectorAll('[data-manager-view]').forEach(button=>button.addEventListener('click',async()=>{
    if(window.adminOperationBusy)return;mode=button.dataset.managerView;updateView();
    status(mode==='inquiries'?'접수된 온라인 문의를 확인해 주세요.':mode==='products'?'상품 사진·이름·설명과 색상·두께·길이별 가격을 입력해 주세요.':'시공사진을 선택해 추가해 주세요.');
    if(mode==='products')await loadProducts();
    if(mode==='inquiries')document.dispatchEvent(new CustomEvent('inquiry-open'));
  }));
  el('product-logout').addEventListener('click',()=>el('logout-button').click());
  el('product-refresh').addEventListener('click',loadProducts);
  el('product-photo').addEventListener('change',async()=>{
    const ticket=++selectionId;clearPreview();const chosen=el('product-photo').files[0];if(!chosen)return;
    if(!['image/jpeg','image/png','image/webp'].includes(chosen.type)||!chosen.size||chosen.size>8*1024*1024){el('product-photo').value='';status('8MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.',true);return;}
    const url=URL.createObjectURL(chosen);previewUrl=url;const image=new Image();image.src=url;
    try{await image.decode();if(ticket!==selectionId)return;file=chosen;image.alt='등록할 상품 사진 미리보기';el('product-preview').append(image);status('사진을 선택했습니다. 이름과 설명을 확인한 뒤 등록해 주세요.');}
    catch{if(ticket!==selectionId)return;clearPreview();el('product-photo').value='';status('열 수 없는 사진입니다. 다른 사진을 선택해 주세요.',true);}
  });
  el('product-form').addEventListener('submit',async event=>{
    event.preventDefault();if(window.adminOperationBusy)return;
    if(!file&&!editingId){status('상품 사진을 선택하고 미리보기가 표시될 때까지 기다려 주세요.',true);return;}
    setBusy(true);status('상품을 등록하는 중입니다…');
    try{
      const args=[file,el('product-category').value,el('product-title').value,el('product-description').value,el('product-kind').value==='ai',readVariants(),el('product-price-unit').value];
      const result=editingId?await service.update(editingId,...args):await service.add(...args);
      resetProductForm();await loadProducts();status(result?.warning||'상품과 옵션·가격을 저장했습니다. 홈페이지를 새로고침하면 반영됩니다.',Boolean(result?.warning));
    }catch(error){status(error.message,true);}finally{setBusy(false);}
  });
  window.addEventListener('beforeunload',event=>{if(busy||orderDirty){event.preventDefault();event.returnValue='';}});
  loggedIn=!el('upload-panel').hidden;if(loggedIn&&new URLSearchParams(location.search).get('view')==='inquiries')mode='inquiries';updateView();if(loggedIn&&mode==='inquiries')document.dispatchEvent(new CustomEvent('inquiry-open'));
})();
