(async () => {
  if (!window.PhotoService?.ready) return;
  try {
    const photos = await PhotoService.list();
    for (const category of Object.keys(PhotoService.labels)) {
      const grid = document.querySelector(`#gallery-${category} .gallery-photos`);
      if (!grid) continue;
      const fragment = document.createDocumentFragment();
      for (const photo of photos.filter(p => p.category === category)) {
        const figure = document.createElement('figure');
        figure.className = 'uploaded-photo';
        const link = document.createElement('a');
        link.href = photo.url; link.target = '_blank'; link.rel = 'noopener';
        const image = document.createElement('img');
        const kind = photo.is_ai ? 'AI 생성 예시 · 실제 시공사진 아님' : '실제 시공사진';
        image.src = photo.url; image.alt = `${photo.title} · ${kind}`; image.loading = 'lazy';
        const caption = document.createElement('figcaption');
        caption.textContent = `${photo.title} · ${kind}`;
        link.append(image); figure.append(link,caption); fragment.append(figure);
      }
      grid.prepend(fragment);
    }
  } catch (error) {
    // Existing sample photographs remain visible if the storage service is unavailable.
    console.warn(error.message);
  }
})();
