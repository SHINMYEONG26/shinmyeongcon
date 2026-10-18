(() => {
  const button = document.querySelector('.header-photo-manager');
  const service = window.PhotoService;
  if (!button) return;
  button.hidden = true;
  if (!service?.ready) return;
  let version = 0;
  async function refresh() {
    const current = ++version;
    button.hidden = true;
    try {
      await service.requireAdmin();
      if (current === version) button.hidden = false;
    } catch { /* Visitors and accounts without administrator access keep it hidden. */ }
  }
  service.client.auth.onAuthStateChange(() => {
    ++version;
    button.hidden = true;
    // Verify membership outside the authentication callback.
    setTimeout(refresh, 0);
  });
  refresh();
})();
