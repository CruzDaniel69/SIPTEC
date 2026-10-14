import { obtenerRechazosPendientes, marcarRechazosAvisados } from "../services/prestamoService.js";

let consultando = false;

/**
 * Si algún préstamo del empleado fue rechazado, se lo avisa una sola vez
 * (la API recuerda cuáles ya se mostraron). Nunca interrumpe la pantalla si falla.
 */
export async function mostrarAvisosRechazo() {
    if (consultando) return;
    consultando = true;

    try {
        const rechazados = await obtenerRechazosPendientes();
        if (rechazados.length === 0) return;

        // Se arma con nodos de texto: el motivo lo escribió otra persona
        const contenido = document.createElement("div");
        contenido.style.textAlign = "left";
        rechazados.forEach((prestamo) => {
            const bloque = document.createElement("p");
            const titulo = document.createElement("b");
            titulo.textContent = "PR-" + String(prestamo.id).padStart(3, "0");
            bloque.appendChild(titulo);
            bloque.appendChild(document.createTextNode(prestamo.motivoRechazo
                ? " — Motivo: " + prestamo.motivoRechazo
                : " — Sin motivo indicado."));
            contenido.appendChild(bloque);
        });

        await Swal.fire({
            icon: "info",
            title: rechazados.length === 1 ? "Tu préstamo fue rechazado" : "Tus préstamos fueron rechazados",
            html: contenido,
            confirmButtonText: "Entendido",
            confirmButtonColor: "#28a745",
        });

        await marcarRechazosAvisados();
    } catch (error) {
        console.error(error);
    } finally {
        consultando = false;
    }
}
