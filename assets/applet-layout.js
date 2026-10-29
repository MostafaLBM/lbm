/* Shared responsive navigation; calculations remain in each applet. */
(() => {
  const controls = document.querySelector('.controls');
  const results = document.querySelector('.results');
  if (!controls || !results) return;
  results.id = 'cycle-results';
  const query = matchMedia('(max-width: 700px)');
  const nav = document.createElement('div');
  nav.className = 'mobile-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Applet view');
  nav.innerHTML = '<button type="button" role="tab" id="inputs-tab" aria-controls="controls">Inputs</button><button type="button" role="tab" id="results-tab" aria-controls="cycle-results">Results</button>';
  const anchor = document.createElement('div');
  anchor.className = 'mobile-tab-anchor';
  document.querySelector('.workspace').before(anchor, nav);
  const buttons = [...nav.querySelectorAll('button')];
  const panels = [controls, results];
  const originalRoles = panels.map(panel => panel.getAttribute('role'));
  const positions = [0, 0];
  let active = 0;
  function render() {
    document.body.classList.toggle('mobile-applet', query.matches);
    document.body.dataset.appletView = active === 0 ? 'inputs' : 'results';
    panels.forEach((panel, i) => {
      buttons[i].setAttribute('aria-selected', String(i === active));
      buttons[i].tabIndex = i === active ? 0 : -1;
      if (query.matches) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', buttons[i].id);
        panel.removeAttribute('aria-label');
      } else {
        if (originalRoles[i]) panel.setAttribute('role', originalRoles[i]);
        else panel.removeAttribute('role');
        panel.removeAttribute('aria-labelledby');
        panel.setAttribute('aria-label', i === 0 ? 'Cycle controls' : 'Cycle results');
      }
    });
  }
  function select(index) {
    if (!query.matches || index === active) return;
    const top = anchor.getBoundingClientRect().top + scrollY - 8;
    positions[active] = Math.max(0, scrollY - top);
    active = index;
    render();
    window.scrollTo({top: top + positions[active], behavior: 'instant'});
  }
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - active;
      select(next);
      buttons[next].focus({preventScroll:true});
    });
  });
  // The existing skip link must still reach controls when Results is selected.
  document.querySelector('.skip')?.addEventListener('click', () => {
    select(0);
    controls.focus({preventScroll:true});
  });
  query.addEventListener('change', render);
  render();
})();
