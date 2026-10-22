(() => {
  const service = window.PageContentService;
  const pageFor = id => 'gallery-product-' + id;
  const orderField = {key:'e0000:text:0',kind:'text'};
  async function read(id) {
    const result = await service.list(pageFor(id));
    if (!result.available) throw new Error('상세 이미지 저장공간에 연결하지 못했습니다. 다시 시도해 주세요.');
    const manifest = result.items.find(x => x.field_key === orderField.key);
    let order = [];
    if (manifest) { try { order = JSON.parse(manifest.value); } catch { throw new Error('저장된 상세 이미지 순서를 읽지 못했습니다.'); } }
    if (!Array.isArray(order) || order.length > 20) throw new Error('상세 이미지 목록을 확인해 주세요.');
    return {items:order.map(key=>result.items.find(x=>x.field_key===key)).filter(x=>x&&service.imageUrl(x.image_path)),all:result.items};
  }
  window.ProductDetailImages = {read};
  if (!document.getElementById('product-form')) return;
  const box=document.createElement('section');box.className='product-detail-editor';
  const heading=document.createElement('h3');heading.textContent='상품 상세 이미지';
  const hint=document.createElement('p');hint.textContent='상품을 먼저 저장한 뒤 상세 이미지를 추가하세요. 최대 20장, JPG·PNG·WEBP 각 8MB. 순서대로 상품 상세에 표시됩니다. 저장한 이미지가 있으면 기존 자동 상세 안내 대신 표시됩니다.';
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','상세 이미지 여러 장 추가');
  const list=document.createElement('div');list.className='detail-editor-list';
  const save=document.createElement('button');save.type='button';save.textContent='상세 이미지 저장';
  const message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  box.append(heading,hint,input,list,save,message);document.getElementById('product-form').after(box);
  let product=null,rows=[],all=[],busy=false,ticket=0,dirty=false,loaded=false;
  const urls=new Set();
  function release(){for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
  function controls(){input.disabled=save.disabled=busy||!product||!loaded;if(busy)box.querySelectorAll('button,input').forEach(x=>x.disabled=true);}
  function render(){list.replaceChildren();rows.forEach((row,index)=>{
    const card=document.createElement('article'),image=new Image();image.src=row.url||service.imageUrl(row.image_path);image.alt=row.alt_text||'상세 이미지 '+(index+1);image.style.cssText='max-width:180px;max-height:180px;object-fit:contain';
    const caption=document.createElement('input');caption.value=row.alt_text||'';caption.maxLength=250;caption.setAttribute('aria-label','상세 이미지 '+(index+1)+' 설명');caption.placeholder='이미지 설명 (선택)';caption.oninput=()=>{row.alt_text=caption.value;dirty=true;};
    card.append(image,caption);
    for(const [label,offset] of [['위로',-1],['아래로',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy||index+offset<0||index+offset>=rows.length;b.onclick=()=>{[rows[index],rows[index+offset]]=[rows[index+offset],rows[index]];dirty=true;render();};card.append(b);}
    const replace=document.createElement('input');replace.type='file';replace.accept=input.accept;replace.setAttribute('aria-label','상세 이미지 '+(index+1)+' 교체');replace.onchange=async()=>{const f=replace.files[0];if(!f)return;try{service.validateFile(f);const u=URL.createObjectURL(f),probe=new Image();probe.src=u;await probe.decode();urls.add(u);rows[index]={file:f,url:u,alt_text:row.alt_text};dirty=true;render();}catch(e){message.textContent=e.message;}};
    const remove=document.createElement('button');remove.type='button';remove.textContent='목록에서 제거';remove.onclick=()=>{rows.splice(index,1);dirty=true;render();};card.append(replace,remove);list.append(card);
  });controls();}
  async function load(p){const current=++ticket;release();product=p;rows=[];all=[];loaded=false;dirty=false;message.textContent=p?'상세 이미지를 불러오는 중입니다.':'상품을 선택하거나 먼저 등록해 주세요.';render();if(!p)return true;
    try{const data=await read(p.id);if(current!==ticket)return false;rows=data.items.map(x=>({...x}));all=data.all;loaded=true;message.textContent='상세 이미지 '+rows.length+'장. 이미지 전체를 제거하고 저장하면 기존 안내가 다시 표시됩니다.';render();}catch(e){if(current===ticket)message.textContent=e.message;}return true;
  }
  window.ProductDetailEditor={load,canLeave:()=>!dirty||confirm('저장하지 않은 상세 이미지 변경을 버릴까요?')};
  input.onchange=async()=>{const files=[...input.files];input.value='';if(rows.length+files.length>20){message.textContent='상세 이미지는 최대 20장입니다.';return;}try{const next=[];for(const f of files){service.validateFile(f);const u=URL.createObjectURL(f);urls.add(u);const im=new Image();im.src=u;await im.decode();next.push({file:f,url:u,alt_text:''});}rows.push(...next);dirty=true;render();}catch(e){message.textContent=e.message;}};
  save.onclick=async()=>{if(busy||!product||!loaded)return;busy=true;window.adminOperationBusy=true;controls();message.textContent='상세 이미지를 저장하는 중입니다.';
    try{await PhotoService.requireAdmin();let serial=Math.max(0,...all.map(x=>Number(x.field_key.match(/^e(\d{4}):/)?.[1]||0)));const keys=[];
      for(const row of rows){if(row.file){if(++serial>9999)throw new Error('이미지 저장 한도에 도달했습니다.');row.field_key='e'+String(serial).padStart(4,'0')+':image';await service.save(pageFor(product.id),{key:row.field_key,kind:'image'},{file:row.file,alt:row.alt_text});delete row.file;}else{await service.save(pageFor(product.id),{key:row.field_key,kind:'image'},{alt:row.alt_text});}keys.push(row.field_key);}
      await service.save(pageFor(product.id),orderField,{value:JSON.stringify(keys)});const fresh=await read(product.id);all=fresh.all;rows=fresh.items.map(x=>({...x}));release();dirty=false;message.textContent='상세 이미지 '+rows.length+'장을 저장했습니다. 상품 상세 페이지에서 확인하세요.';
    }catch(e){message.textContent='저장 실패: '+e.message;}finally{busy=false;window.adminOperationBusy=false;render();}
  };
  window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});load(null);
})();
