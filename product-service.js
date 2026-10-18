(() => {
  const photos=window.PhotoService,client=photos?.client,bucket='product-photos';
  const labels={real:'리얼징크',...(photos?.labels||{})};
  const categoryRank=category=>['temba-zinc','real'].includes(category)?0:category==='color'?1:2;
  const validIds=ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id))&&new Set(ids).size===ids.length;
  const imageUrl=product=>{
    if(product.image_source==='sample'&&['real-1.jpg','color-1.jpg'].includes(product.storage_path))return product.storage_path;
    if(product.image_source==='upload'&&/^products\/[a-z0-9-]+\.(jpg|png|webp)$/.test(product.storage_path||''))return client.storage.from(bucket).getPublicUrl(product.storage_path).data.publicUrl;
    return null;
  };
  const validate=(category,title,description,variants,unit)=>{
    if(!labels[category]||!title.trim()||title.trim().length>80||description.trim().length>1200)throw new Error('분야, 상품명과 설명을 확인해 주세요.');
    if(!ProductOptions.units.includes(unit))throw new Error('가격 단위를 선택해 주세요.');
    return {category,title:title.trim(),description:description.trim(),variants:ProductOptions.normalize(variants),price_unit:unit};
  };
  async function upload(file){
    const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!file||!extensions[file.type]||!file.size||file.size>8*1024*1024)throw new Error('8MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.');
    const path=`products/${crypto.randomUUID()}.${extensions[file.type]}`;
    const result=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
    if(result.error)throw new Error('상품 사진을 저장하지 못했습니다. 저장공간과 연결 상태를 확인해 주세요.');
    return path;
  }
  window.ProductService={
    ready:Boolean(client),labels,
    async list(){
      if(!client)throw new Error('상품 저장공간이 아직 연결되지 않았습니다.');
      const fields='id,category,title,description,is_ai,image_source,storage_path,created_at,variants,price_unit,display_order';
      let result=await client.from('products').select(fields).order('created_at',{ascending:false});
      if(result.error&&['42703','PGRST204'].includes(result.error.code))result=await client.from('products').select('id,category,title,description,is_ai,image_source,storage_path,created_at').order('created_at',{ascending:false});
      if(result.error)throw new Error('상품 목록을 불러오지 못했습니다. 연결 상태를 확인해 주세요.');
      return (result.data||[]).map(product=>({...product,url:imageUrl(product)})).filter(product=>product.url&&labels[product.category]).sort((a,b)=>{
        const aSaved=Number.isInteger(a.display_order)&&a.display_order>0,bSaved=Number.isInteger(b.display_order)&&b.display_order>0;
        if(aSaved||bSaved)return aSaved&&bSaved?a.display_order-b.display_order:aSaved?-1:1;
        return categoryRank(a.category)-categoryRank(b.category);
      });
    },
    async saveOrder(ids){
      if(!validIds(ids)||!ids.length||ids.length>5000)throw new Error('저장할 상품 순서를 확인해 주세요. 상품은 최대 5,000개까지 정렬할 수 있습니다.');
      await photos.requireAdmin();
      const result=await client.rpc('set_product_display_order',{product_ids:ids});
      if(result.error||result.data!==ids.length){console.warn('상품 순서 저장 오류',result.error?.code,result.error?.message);throw new Error(result.error?.code==='40001'?'상품 목록이 바뀌었습니다. 새로고침한 뒤 순서를 다시 저장해 주세요.':'노출 순서를 저장하지 못했습니다. 연결 상태와 관리자 권한을 확인한 뒤 다시 저장해 주세요.');}
    },
    async add(file,category,title,description,isAi,variants=[],unit='원/장'){
      const values=validate(category,title,description,variants,unit),admin=await photos.requireAdmin(),path=await upload(file);
      const record=await client.from('products').insert({...values,is_ai:Boolean(isAi),image_source:'upload',storage_path:path,created_by:admin.id});
      if(record.error){await client.storage.from(bucket).remove([path]);throw new Error('상품 등록에 실패했습니다. 상품 가격·옵션 저장 설정을 확인해 주세요.');}
      return {};
    },
    async update(id,file,category,title,description,isAi,variants=[],unit='원/장'){
      const values=validate(category,title,description,variants,unit);await photos.requireAdmin();
      const current=await client.from('products').select('image_source,storage_path').eq('id',id).single();
      if(current.error||!current.data)throw new Error('수정할 상품을 찾지 못했습니다. 새로고침해 주세요.');
      if(!file&&current.data.image_source==='sample'&&!isAi)throw new Error('AI 예시를 실제 제품 사진으로 바꾸려면 실제 사진도 함께 선택해 주세요.');
      const path=file?await upload(file):null;
      const result=await client.from('products').update({...values,is_ai:Boolean(isAi),...(path?{image_source:'upload',storage_path:path}:{})}).eq('id',id).select('id').single();
      if(result.error){if(path)await client.storage.from(bucket).remove([path]);throw new Error('상품을 수정하지 못했습니다. 관리자 수정 권한과 가격·옵션 저장 설정을 확인해 주세요.');}
      if(path&&current.data.image_source==='upload'&&imageUrl(current.data)){
        const cleanup=await client.storage.from(bucket).remove([current.data.storage_path]);
        if(cleanup.error)return {warning:'상품은 수정됐지만 이전 사진 파일 정리는 실패했습니다.'};
      }
      return {};
    },
    async remove(id){
      await photos.requireAdmin();
      const result=await client.from('products').delete().eq('id',id).select('image_source,storage_path').single();
      if(result.error||!result.data)throw new Error('상품을 삭제하지 못했습니다. 관리자 권한과 연결 상태를 확인해 주세요.');
      if(result.data.image_source==='sample')return {};
      if(!imageUrl(result.data))return {warning:'상품은 삭제됐습니다. 사진 파일 경로를 확인해 주세요.'};
      const cleanup=await client.storage.from(bucket).remove([result.data.storage_path]);
      return cleanup.error?{warning:'상품은 삭제됐지만 사진 파일 정리에 실패했습니다.'}:{};
    }
  };
})();
