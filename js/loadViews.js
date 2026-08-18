document.addEventListener('DOMContentLoaded', () => {

  const viewRoot = document.getElementById('viewRoot');
  const navItems = document.querySelectorAll('.nav-item');
  const appShell = document.getElementById('appShell');

  const ROLE = (localStorage.getItem('siptec-role') || 'ADMINISTRADOR').toUpperCase();
  document.body.dataset.role = ROLE;

  function applyRoleVisibility(scope) {
    scope.querySelectorAll('[data-roles]').forEach((el) => {
      const allowed = el.getAttribute('data-roles').split(',').map(r => r.trim());
      el.style.display = allowed.includes(ROLE) ? '' : 'none';
    });
  }

  applyRoleVisibility(document);

  const DARK_MODE_KEY = 'siptec-dark-mode';

  function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
  }

  applyDarkMode(localStorage.getItem(DARK_MODE_KEY) === 'true');

  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'darkModeToggle') {
      const isDark = event.target.checked;
      localStorage.setItem(DARK_MODE_KEY, isDark);
      applyDarkMode(isDark);
    }
  });

  async function loadView(viewName, subtabId) {
    if (!viewRoot) return;
    try {
      const response = await fetch(`${viewName}.html`);

      if (!response.ok) {
        throw new Error('No se pudo cargar la vista');
      }

      const html = await response.text();
      viewRoot.innerHTML = html;

      if (subtabId) {
        const subtabInput = viewRoot.querySelector(`#${subtabId}`);
        if (subtabInput) subtabInput.checked = true;
      }

      applyRoleVisibility(viewRoot);
      applyDarkMode(document.body.classList.contains('dark-mode'));

      navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    } catch (error) {
      console.error('Error cargando la vista:', error);
      viewRoot.innerHTML = `<div class="p-4 text-danger">Error al cargar la página: ${viewName}</div>`;
    }
  }

  navItems.forEach(button => {
    button.addEventListener('click', () => {
      const viewName = button.getAttribute('data-view');
      if (viewName) {
        loadView(viewName);
      }
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-view]');
    if (!trigger) return;
    if (trigger.classList.contains('nav-item')) return;

    const viewName = trigger.getAttribute('data-view');
    const subtabId = trigger.getAttribute('data-subtab');
    if (viewName) {
      loadView(viewName, subtabId);
    }
  });

  if (appShell) {
    appShell.classList.remove('d-none');

    const landingButton = document.querySelector('.nav-item[data-view="loadDashboard"]')?.style.display !== 'none'
      ? document.querySelector('.nav-item[data-view="loadDashboard"]')
      : document.querySelector('.nav-item:not([style*="display: none"])');

    const landingView = landingButton ? landingButton.getAttribute('data-view') : 'loadDashboard';
    navItems.forEach(item => item.classList.toggle('active', item === landingButton));
    loadView(landingView);
  }
});
