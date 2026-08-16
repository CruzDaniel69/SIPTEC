document.addEventListener('DOMContentLoaded', () => {
  // Este archivo ahora SOLO se carga desde pages/dashboard.html
  // (index.html ya no lo necesita: el login es un <a href> normal que navega de verdad).

  const viewRoot = document.getElementById('viewRoot');
  const navItems = document.querySelectorAll('.nav-item');
  const appShell = document.getElementById('appShell');

  // ---------- Roles ----------
  // Por ahora el rol se lee de localStorage para poder probarlo fácilmente.
  // Cuando el login real esté conectado, reemplaza esta línea por lo que
  // devuelva tu backend/sesión (ej. el rol del usuario autenticado).
  // Para probar otro rol en la consola: localStorage.setItem('siptec-role', 'EMPLEADO')
  const ROLE = (localStorage.getItem('siptec-role') || 'ADMINISTRADOR').toUpperCase();
  document.body.dataset.role = ROLE;

  // Oculta cualquier elemento con data-roles="ROL1,ROL2" que no incluya el rol actual.
  // Se usa tanto en el sidebar (fijo) como en contenido recién cargado en #viewRoot
  // (por ejemplo, la pestaña "Devoluciones" dentro de Préstamos, que solo ve el Admin).
  function applyRoleVisibility(scope) {
    scope.querySelectorAll('[data-roles]').forEach((el) => {
      const allowed = el.getAttribute('data-roles').split(',').map(r => r.trim());
      el.style.display = allowed.includes(ROLE) ? '' : 'none';
    });
  }

  applyRoleVisibility(document);

  // ---------- Modo oscuro ----------
  // Se guarda en localStorage para que se recuerde entre visitas.
  const DARK_MODE_KEY = 'siptec-dark-mode';

  function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    // Si el switch ya está en el DOM (estamos en la vista Configuración), lo sincronizamos.
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
  }

  // Aplica la preferencia guardada apenas carga la página.
  applyDarkMode(localStorage.getItem(DARK_MODE_KEY) === 'true');

  // Delegación de eventos: el switch #darkModeToggle vive dentro de #viewRoot,
  // que se reemplaza con fetch() cada vez que cambias de vista, así que un
  // addEventListener normal sobre el switch se perdería al recargar la vista.
  // Escuchando en document, seguimos capturando el evento sin importar cuántas
  // veces se haya reemplazado el HTML de adentro.
  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'darkModeToggle') {
      const isDark = event.target.checked;
      localStorage.setItem(DARK_MODE_KEY, isDark);
      applyDarkMode(isDark);
    }
  });

  // Función para cargar una vista dentro del panel
  async function loadView(viewName, subtabId) {
    if (!viewRoot) return;
    try {
      const response = await fetch(`${viewName}.html`);

      if (!response.ok) {
        throw new Error('No se pudo cargar la vista');
      }

      const html = await response.text();
      viewRoot.innerHTML = html; // Inyectamos el HTML en el contenedor principal

      // Si la vista trae tabs internas (Préstamos/Devoluciones/Historial, Reportes, etc.)
      // y nos pidieron abrir una pestaña específica, marcamos ese radio como checked.
      if (subtabId) {
        const subtabInput = viewRoot.querySelector(`#${subtabId}`);
        if (subtabInput) subtabInput.checked = true;
      }

      // Si la vista trae elementos con data-roles (como la pestaña "Devoluciones"
      // dentro de Préstamos, que solo ve el Administrador), los filtramos.
      applyRoleVisibility(viewRoot);

      // Si la vista recién cargada trae el switch de apariencia, lo sincronizamos
      // con la preferencia guardada (por si el usuario ya lo había activado antes).
      applyDarkMode(document.body.classList.contains('dark-mode'));

      // Actualizamos la clase activa en el menú lateral
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

  // Escuchar clics en los botones del menú
  navItems.forEach(button => {
    button.addEventListener('click', () => {
      const viewName = button.getAttribute('data-view');
      if (viewName) {
        loadView(viewName);
      }
    });
  });

  // Delegación de eventos para CUALQUIER botón con data-view, no solo los del sidebar.
  // Esto permite que botones como "Registrar devolución" o "Generar reporte" (en
  // Acciones rápidas del dashboard) también naveguen a su vista correspondiente,
  // incluso si se cargan dinámicamente dentro de #viewRoot.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-view]');
    if (!trigger) return;
    // Si ya tiene su propio listener (los del sidebar), evitamos duplicar la carga.
    if (trigger.classList.contains('nav-item')) return;

    const viewName = trigger.getAttribute('data-view');
    const subtabId = trigger.getAttribute('data-subtab');
    if (viewName) {
      loadView(viewName, subtabId);
    }
  });

  // Si estamos en dashboard.html, mostramos el panel y cargamos la vista inicial.
  // (El "d-none" ya no se quita desde el login, porque el login vive en otra página/archivo).
  if (appShell) {
    appShell.classList.remove('d-none');

    // Panel de control es solo del Administrador. Si el rol actual no lo tiene
    // (Empleado, IT), aterrizamos en la primera vista que sí le toca según el sidebar.
    const landingButton = document.querySelector('.nav-item[data-view="loadDashboard"]')?.style.display !== 'none'
      ? document.querySelector('.nav-item[data-view="loadDashboard"]')
      : document.querySelector('.nav-item:not([style*="display: none"])');

    const landingView = landingButton ? landingButton.getAttribute('data-view') : 'loadDashboard';
    navItems.forEach(item => item.classList.toggle('active', item === landingButton));
    loadView(landingView);
  }
});
