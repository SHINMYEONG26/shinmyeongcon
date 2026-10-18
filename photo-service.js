(() => {
  const config = window.PHOTO_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url || '') &&
    (config.publishableKey || '').startsWith('sb_publishable_');

  const labels = {
    color: '칼라강판',
    'temba-zinc': '템바/징크',
    'zinc-accessories': '징크부자재',
    'steel-accessories': '강판부자재',
    'gutter-materials': '물받이자재',
    'metal-siding': '메탈사이딩',
    'composite-sheet': '복합판넬/쉬트판넬',
    'sandwich-panel': '샌드위치 판넬',
    'interior-exterior': '내·외부인테리어'
  };

  // Keep the login only in this tab, including navigation and refreshes.
  // Never recover the old persistent login after the tab has been closed.
  const authOptions = () => {
    const project = new URL(config.url).hostname.split('.')[0];
    const legacyKey = `sb-${project}-auth-token`;
    try {
      [legacyKey, `${legacyKey}-code-verifier`, `${legacyKey}-user`]
        .forEach(key => window.localStorage.removeItem(key));
    } catch (_) { /* Storage can be disabled by the browser. */ }

    const memory = new Map();
    let storage = {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: key => memory.delete(key)
    };
    let tabId = window.crypto.randomUUID();
    try {
      const tabKey = `shinmyeong-${project}-admin-tab`;
      const session = window.sessionStorage;
      tabId = session.getItem(tabKey) || tabId;
      session.setItem(tabKey, tabId);
      storage = session;
    } catch (_) { /* Use memory only; do not fall back to persistent storage. */ }
    return { storage, storageKey: `${legacyKey}-tab-${tabId}`, persistSession: true };
  };

  const client = configured && window.supabase
    ? window.supabase.createClient(config.url, config.publishableKey, { auth: authOptions() })
    : null;

  const bucket = 'construction-photos';
  const assertClient = () => {
    if (!client) throw new Error('온라인 사진 저장공간을 먼저 연결해 주세요.');
  };

  const requireAdmin = async () => {
    assertClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error('관리자 로그인이 필요합니다.');

    const member = await client
      .from('photo_admins')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (member.error || !member.data) {
      throw new Error('사진을 추가할 관리자 권한이 없습니다.');
    }
    return data.user;
  };

  const publicUrl = path => {
    if (!/^(color|temba-zinc|zinc-accessories|steel-accessories|gutter-materials|metal-siding|composite-sheet|sandwich-panel|interior-exterior)\/[a-z0-9-]+\.(jpg|png|webp)$/.test(path || '')) {
      return null;
    }
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  window.PhotoService = {
    ready: Boolean(client),
    client,
    labels,
    requireAdmin,

    async login(email, password) {
      assertClient();
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw new Error('이메일 또는 비밀번호를 확인해 주세요.');
      try {
        return await requireAdmin();
      } catch (error) {
        await client.auth.signOut();
        throw error;
      }
    },

    async logout() {
      assertClient();
      const { error } = await client.auth.signOut();
      if (error) throw new Error('로그아웃하지 못했습니다. 다시 시도해 주세요.');
    },

    async list() {
      assertClient();
      const { data, error } = await client
        .from('gallery_photos')
        .select('id,category,title,is_ai,storage_path,created_at')
        .order('created_at', { ascending: false });

      if (error) throw new Error('사진 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');

      return (data || [])
        .map(photo => ({ ...photo, url: publicUrl(photo.storage_path) }))
        .filter(photo => photo.url && labels[photo.category]);
    },

    async deletePhoto(id) {
      await requireAdmin();
      const result = await client
        .from('gallery_photos')
        .delete()
        .eq('id', id)
        .select('storage_path')
        .single();

      if (result.error || !result.data) {
        throw new Error('삭제하지 못했습니다. 관리자 삭제 권한 설정과 연결 상태를 확인해 주세요.');
      }

      const path = result.data.storage_path;
      if (!publicUrl(path)) {
        return { warning: '홈페이지에서 삭제됐습니다. 저장 파일 경로를 확인해 주세요.' };
      }

      const cleanup = await client.storage.from(bucket).remove([path]);
      return cleanup.error
        ? { warning: '홈페이지에서 삭제됐지만 저장 파일 정리는 실패했습니다.' }
        : {};
    },

    async upload(file, category, isAi, title) {
      if (!labels[category]) throw new Error('분야를 선택해 주세요.');

      const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      };

      if (!extensions[file.type] || !file.size || file.size > 8 * 1024 * 1024) {
        throw new Error('JPG·PNG·WEBP 사진을 8MB 이하로 선택해 주세요.');
      }

      const admin = await requireAdmin();
      const path = `${category}/${crypto.randomUUID()}.${extensions[file.type]}`;

      const result = await client.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (result.error) {
        throw new Error('사진을 저장하지 못했습니다. 연결 상태와 저장공간을 확인해 주세요.');
      }

      const record = await client
        .from('gallery_photos')
        .insert({
          category,
          title: title.trim().slice(0, 80) || labels[category],
          is_ai: Boolean(isAi),
          storage_path: path,
          created_by: admin.id
        });

      if (record.error) {
        await client.storage.from(bucket).remove([path]);
        throw new Error('사진 등록에 실패했습니다. 다시 시도해 주세요.');
      }
    }
  };
})();
