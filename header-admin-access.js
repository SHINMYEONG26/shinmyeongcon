(() => {
  const button = document.querySelector('.header-photo-manager');
  const loginLink = document.querySelector('.site-header a.header-admin:not(.header-photo-manager)');
  const service = window.PhotoService;
  if (!button) return;
  button.hidden = true;
  if (!service?.ready) return;
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'header-admin header-logout';
  logout.hidden = true;
  logout.innerHTML = '<span aria-hidden="true">↪</span>로그아웃';
  logout.setAttribute('aria-label', '관리자 로그아웃');
  button.before(logout);
  const status = document.createElement('p');
  status.className = 'header-session-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  button.after(status);
  let signingOut = false;
  logout.addEventListener('click', async () => {
    if (signingOut || window.adminOperationBusy) return;
    signingOut = true;
    logout.disabled = true;
    logout.setAttribute('aria-busy', 'true');
    status.hidden = true;
    try {
      await service.logout();
      // Reload clears every open editor and any administrator-only content.
      window.location.reload();
    } catch (error) {
      status.textContent = error?.message || '로그아웃하지 못했습니다. 다시 시도해 주세요.';
      status.hidden = false;
      signingOut = false;
      logout.disabled = false;
      logout.removeAttribute('aria-busy');
    }
  });
  function display(isAdmin) {
    button.hidden = !isAdmin;
    logout.hidden = !isAdmin;
    if (loginLink) loginLink.hidden = isAdmin;
  }
  let version = 0;
  async function refresh() {
    const current = ++version;
    display(false);
    try {
      await service.requireAdmin();
      if (current === version) display(true);
    } catch { /* Visitors and accounts without administrator access keep it hidden. */ }
  }
  service.client.auth.onAuthStateChange(() => {
    ++version;
    display(false);
    // Verify membership outside the authentication callback.
    setTimeout(refresh, 0);
  });
  refresh();
})();
