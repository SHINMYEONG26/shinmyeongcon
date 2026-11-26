(() => {
  const path=location.pathname.split('/').pop()||'index.html';
  for (const a of document.querySelectorAll('.nav-link')) {
    if(a.getAttribute('href')===path)a.setAttribute('aria-current','page');
  }
  // FAQs use native details/summary controls, including keyboard interaction.
})();
