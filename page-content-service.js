(() => {
 const photos=window.PhotoService,client=photos?.client,table='page_content_overrides',bucket='construction-photos';
 const types=['text','link','image','background'],fileTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const imagePattern=/^interior-exterior\/[a-z0-9-]+\.(jpg|png|webp)$/;
 function validLink(value){if(value.startsWith('#'))return true;if(/^mailto:[^\s]+@[^\s]+$/.test(value)||/^tel:\+?[\d\s()-]+$/.test(value))return true;try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)||(location.protocol==='file:'&&url.protocol==='file:'&&/^[a-z0-9-]+\.html(?:[?#].*)?$/i.test(value));}catch{return false;}}
 function validateFile(file){if(!file||!fileTypes[file.type]||!file.size||file.size>8388608)throw new Error('8MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.');}
 async function cleanup(path){if(!imagePattern.test(path||''))return {};try{const r=await client.storage.from(bucket).remove([path]);return r.error?{warning:'저장은 완료됐지만 이전 사진 정리에 실패했습니다.'}:{};}catch{return {warning:'저장은 완료됐지만 이전 사진 정리에 실패했습니다.'};}}
 window.PageContentService={validateFile,validLink,
  imageUrl:path=>imagePattern.test(path||'')?client.storage.from(bucket).getPublicUrl(path).data.publicUrl:null,
  async list(page){if(!client)return {available:false,items:[]};try{const r=await client.from(table).select('field_key,kind,value,image_path,alt_text').eq('page',page);return r.error?{available:false,items:[]}:{available:true,items:r.data||[]};}catch{return {available:false,items:[]};}},
  async save(page,field,values){
   if(!/^(index|gallery-[a-z0-9-]+)$/.test(page)||!/^e\d{4}:(text:\d+|link|image|background)$/.test(field.key)||!types.includes(field.kind))throw new Error('편집할 항목을 확인해 주세요.');
   const value=String(values.value||'').trim(),alt=String(values.alt||'').trim();
   if(value.length>4000||alt.length>250)throw new Error('글씨는 4000자, 사진 설명은 250자 이내로 입력해 주세요.');
   if(field.kind==='link'&&!validLink(value))throw new Error('홈페이지 주소, #영역, 전화번호 또는 이메일 연결 주소를 입력해 주세요.');
   const admin=await photos.requireAdmin();
   const current=await client.from(table).select('image_path').eq('page',page).eq('field_key',field.key).maybeSingle();
   if(current.error)throw new Error('전체 내용 편집 설정이 필요합니다. 최초 설정 파일을 적용해 주세요.');
   const previous=current.data?.image_path||null;let path=null;
   if(values.file){if(!['image','background'].includes(field.kind))throw new Error('이 항목에는 사진을 저장할 수 없습니다.');validateFile(values.file);path=`interior-exterior/${crypto.randomUUID()}.${fileTypes[values.file.type]}`;const r=await client.storage.from(bucket).upload(path,values.file,{contentType:values.file.type,upsert:false});if(r.error)throw new Error('사진 파일을 저장하지 못했습니다.');}
   try{const r=await client.from(table).upsert({page,field_key:field.key,kind:field.kind,value,image_path:path||previous,alt_text:alt,updated_by:admin.id},{onConflict:'page,field_key'}).select('field_key').single();if(r.error||!r.data)throw new Error('저장하지 못했습니다. 관리자 권한과 연결 상태를 확인해 주세요.');}catch(error){if(path)await cleanup(path);throw error;}
   return path&&previous?cleanup(previous):{};
  }
 };
})();
