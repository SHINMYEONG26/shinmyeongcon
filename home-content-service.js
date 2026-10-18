(() => {
 const photos=window.PhotoService,client=photos?.client,table='site_content_overrides',bucket='construction-photos';
 const pathPattern=/^(color|temba-zinc|zinc-accessories|steel-accessories|gutter-materials|metal-siding|composite-sheet|sandwich-panel|interior-exterior)\/[a-z0-9-]+\.(jpg|png|webp)$/;
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const validKey=key=>/^(portfolio|materials):/.test(key)&&['heading',...Object.keys(photos?.labels||{})].includes(key.split(':')[1])&&key.split(':').length===2;
 function validateFile(file){if(!file||!extensions[file.type]||!file.size||file.size>8388608)throw new Error('8MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.');}
 async function cleanup(path){if(!pathPattern.test(path||''))return {};try{const r=await client.storage.from(bucket).remove([path]);return r.error?{warning:'변경은 저장됐지만 이전 사진 파일 정리에 실패했습니다.'}:{};}catch{return {warning:'변경은 저장됐지만 이전 사진 파일 정리에 실패했습니다.'};}}
 window.HomeContentService={
  validateFile,
  imageUrl:path=>pathPattern.test(path||'')?client.storage.from(bucket).getPublicUrl(path).data.publicUrl:null,
  async list(){if(!client)return {available:false,items:[]};try{const r=await client.from(table).select('content_key,title,description,eyebrow,image_path,is_ai,show_text');return r.error?{available:false,items:[]}:{available:true,items:(r.data||[]).filter(row=>validKey(row.content_key))};}catch{return {available:false,items:[]};}},
  async save(key,values){
   if(!validKey(key))throw new Error('수정할 영역을 확인해 주세요.');
   const title=String(values.title||'').trim(),description=String(values.description||'').trim(),eyebrow=String(values.eyebrow||'').trim();
   if(!title||title.length>120||description.length>1200||eyebrow.length>80)throw new Error('제목은 1~120자, 설명은 1200자, 영문 표시는 80자 이내로 입력해 주세요.');
   const admin=await photos.requireAdmin(),category=key.split(':')[1];
   if(category==='heading'&&values.file)throw new Error('영역 제목에는 사진을 추가할 수 없습니다.');
   const current=await client.from(table).select('image_path,is_ai').eq('content_key',key).maybeSingle();
   if(current.error)throw new Error('홈페이지 편집 설정이 필요합니다. 제공된 Supabase 설정 파일을 먼저 적용해 주세요.');
   if(category!=='heading'&&values.isAi===false&&!values.file&&(current.data?current.data.is_ai:values.previousKind)!==false)throw new Error('실제 시공사진으로 표시하려면 실제 사진 파일도 선택해 주세요.');
   let newPath=null;const previous=current.data?.image_path||null;
   if(values.file){validateFile(values.file);newPath=`${category}/${crypto.randomUUID()}.${extensions[values.file.type]}`;const upload=await client.storage.from(bucket).upload(newPath,values.file,{contentType:values.file.type,upsert:false});if(upload.error)throw new Error('사진을 저장하지 못했습니다. 연결 상태를 확인해 주세요.');}
   try{const r=await client.from(table).upsert({content_key:key,title,description,eyebrow,image_path:newPath||previous,is_ai:category==='heading'?null:values.isAi,show_text:category==='heading'?true:Boolean(values.showText),updated_by:admin.id},{onConflict:'content_key'}).select('content_key').single();if(r.error||!r.data)throw new Error('변경을 저장하지 못했습니다. 편집 권한과 연결 상태를 확인해 주세요.');}
   catch(error){if(newPath)await cleanup(newPath);throw error;}
   return newPath&&previous?cleanup(previous):{};
  }
 };
})();
