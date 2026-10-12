export const TAMANO_PAGINA = 10;

function numerosVisibles(actual, total) {
    const numeros = new Set([0, total - 1, actual - 1, actual, actual + 1]);
    return Array.from(numeros).filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
}

export function pintarPaginador(contenedor, pagina, irAPagina) {
    if (!contenedor) return;

    const total = pagina ? pagina.totalElements : 0;
    if (!pagina || total === 0) {
        contenedor.innerHTML = "";
        return;
    }

    const actual = pagina.page;
    const desde = actual * pagina.size + 1;
    const hasta = Math.min(desde + pagina.content.length - 1, total);

    let botones = "";
    if (pagina.totalPages > 1) {
        const numeros = numerosVisibles(actual, pagina.totalPages);
        let anterior = -1;
        const items = numeros.map((n) => {
            const separador = anterior !== -1 && n - anterior > 1 ? '<span class="paginador-puntos">…</span>' : "";
            anterior = n;
            return `${separador}<button type="button" class="${n === actual ? "activa" : ""}" data-pagina="${n}" ${n === actual ? 'aria-current="page"' : ""}>${n + 1}</button>`;
        }).join("");

        botones = `
            <button type="button" data-pagina="${actual - 1}" ${actual === 0 ? "disabled" : ""} aria-label="Página anterior">‹ Anterior</button>
            ${items}
            <button type="button" data-pagina="${actual + 1}" ${actual >= pagina.totalPages - 1 ? "disabled" : ""} aria-label="Página siguiente">Siguiente ›</button>`;
    }

    contenedor.innerHTML = `
        <span class="paginador-info">Mostrando ${desde}–${hasta} de ${total}</span>
        <div class="paginador-botones">${botones}</div>`;

    contenedor.querySelectorAll("button[data-pagina]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const destino = Number(boton.dataset.pagina);
            if (destino >= 0 && destino < pagina.totalPages && destino !== actual) irAPagina(destino);
        });
    });
}

export function retrasar(funcion, milisegundos = 300) {
    let temporizador = null;
    return (...argumentos) => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => funcion(...argumentos), milisegundos);
    };
}
