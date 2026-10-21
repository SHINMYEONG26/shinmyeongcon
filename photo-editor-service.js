/* Gallery editing uses the existing authenticated Supabase client and storage. */
(() => {
  const photos = window.PhotoService;
  const client = photos?.client;
  const bucket = 'construction-photos';
  const pathPattern = /^(color|temba-zinc|zinc-accessories|steel-accessories|gutter-materials|metal-siding|composite-sheet|sandwich-panel|interior-exterior)\/[a-z0-9-]+\.(jpg|png|webp)$/;
  const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const table = 'gallery_sample_overrides';
  const validateFile = file => {
    if (!file || !extensions[file.type] || !file.size || file.size > 8 * 1024 * 1024)
      throw new Error('8MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.');
  };
  const titleValue = title => {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 80)
      throw new Error('사진 설명을 1~80자로 입력해 주세요.');
    return title.trim();
  };
  const imageUrl = path => path && pathPattern.test(path)
    ? client.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
  async function uploadFile(file, category) {
    validateFile(file);
    if (!photos.labels[category]) throw new Error('지원하지 않는 사진 분야입니다.');
    const path = `${category}/${crypto.randomUUID()}.${extensions[file.type]}`;
    const result = await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
    if (result.error) throw new Error('사진 파일을 저장하지 못했습니다. 연결 상태를 확인해 주세요.');
    return path;
  }
  async function cleanup(path) {
    if (!path || !pathPattern.test(path)) return {};
    try {
      const result = await client.storage.from(bucket).remove([path]);
      return result.error ? {warning:'변경은 저장됐지만 이전 사진 파일 정리에 실패했습니다.'} : {};
    } catch { return {warning:'변경은 저장됐지만 이전 사진 파일 정리에 실패했습니다.'}; }
  }
  window.PhotoEditorService = {
    validateFile,
    imageUrl,
    async updatePhoto(id, {title,isAi,file}) {
      title = titleValue(title);
      await photos.requireAdmin();
      const current = await client.from('gallery_photos').select('category,is_ai,storage_path,title').eq('id',id).single();
      if (current.error || !current.data) throw new Error('수정할 사진을 찾지 못했습니다. 새로고침해 주세요.');
      if (current.data.is_ai && !isAi && !file)
        throw new Error('AI 예시를 실제 시공사진으로 바꾸려면 실제 사진을 함께 선택해 주세요.');
      const suffix=window.SiteAlbums?.metadata(current.data.title).suffix||'';
      if(suffix&&!window.SiteAlbums.metadata(title).suffix)title=titleValue(title+suffix);
      const path = file ? await uploadFile(file,current.data.category) : null;
      try {
        const result = await client.from('gallery_photos').update({title,is_ai:Boolean(isAi),...(path?{storage_path:path}:{})}).eq('id',id).select('id').single();
        if (result.error || !result.data) throw new Error('사진을 수정하지 못했습니다. 사진 수정 권한 설정과 연결 상태를 확인해 주세요.');
      } catch (error) { if (path) await cleanup(path); throw error; }
      return path ? cleanup(current.data.storage_path) : {};
    },
    async listSamples(category) {
      if (!client) return {available:false,items:[]};
      try {
        const result = await client.from(table).select('sample_key,category,title,is_ai,storage_path,hidden').eq('category',category);
        if (result.error) return {available:false,items:[]};
        return {available:true,items:result.data||[]};
      } catch { return {available:false,items:[]}; }
    },
    async saveSample(sample, {title,isAi,file,hidden}) {
      title = titleValue(title);
      if (!photos.labels[sample.category] || !/^[a-z0-9-]+\.html:[a-z0-9-]+\.(jpg|png|webp)$/.test(sample.key))
        throw new Error('안내사진 정보를 확인해 주세요.');
      const admin = await photos.requireAdmin();
      // Re-read shared state before writing; never rely on a stale page's image path.
      const current = await client.from(table).select('storage_path,is_ai').eq('sample_key',sample.key).maybeSingle();
      if (current.error) throw new Error('안내사진 관리 설정이 필요합니다. 제공된 Supabase 설정 SQL을 먼저 적용해 주세요.');
      const previousPath = current.data?.storage_path || null;
      const previousKind = current.data ? current.data.is_ai : sample.isAi;
      if (!hidden && previousKind !== false && isAi === false && !file)
        throw new Error('실제 시공사진으로 바꾸려면 실제 사진을 함께 선택해 주세요.');
      const path = file ? await uploadFile(file,sample.category) : previousPath;
      try {
        const result = await client.from(table).upsert({sample_key:sample.key,category:sample.category,title,is_ai:isAi,storage_path:path,hidden:Boolean(hidden),updated_by:admin.id},{onConflict:'sample_key'}).select('sample_key').single();
        if (result.error || !result.data) throw new Error('안내사진 변경을 저장하지 못했습니다. 관리 설정과 연결 상태를 확인해 주세요.');
      } catch (error) { if (file && path) await cleanup(path); throw error; }
      return file && previousPath ? cleanup(previousPath) : {};
    }
  };
})();
