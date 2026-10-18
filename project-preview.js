// Keep the local category image until a verified actual photograph loads.
(async () => {
  const service = window.PhotoService;
  if (!service?.ready) return;
  try {
    const photos = await service.list();
    const updates = [];
    for (const card of document.querySelectorAll('#projects article[data-category]')) {
      const category = Object.keys(service.labels).find(key => service.labels[key] === card.dataset.category);
      const photo = photos.find(item => item.category === category && item.is_ai === false);
      if (!photo) continue;
      const url = new URL(photo.url, window.location.href);
      if (url.protocol !== 'https:') continue;
      updates.push((async () => {
        const image = new Image();
        image.src = url.href;
        await image.decode();
        const cover = card.querySelector('.project-image');
        cover.style.backgroundImage = `url(${JSON.stringify(url.href)})`;
        cover.setAttribute('aria-label', `${card.dataset.category} 실제 시공사진`);
        const badge = card.querySelector('.photo-kind');
        badge.textContent = '실제 시공사진';
        badge.classList.add('is-actual');
        if (photo.title) card.querySelector('p:not(.photo-kind)').textContent = photo.title;
      })());
    }
    await Promise.allSettled(updates);
  } catch {
    // Local category images and gallery links remain available offline.
  }
})();
