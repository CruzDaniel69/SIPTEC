import { obtenerPiezasDisponiblesDeArea } from "../services/inventarioService.js";

/**
 * Al pedir un área pregunta si también se llevan las herramientas que hay en ella.
 * Devuelve las piezas a incluir ([] si no hay o se eligió "solo el área") o null si se canceló.
 */
export async function preguntarHerramientasDelArea(idArea) {
    const piezas = await obtenerPiezasDisponiblesDeArea(idArea);
    if (piezas.length === 0) return [];

    const respuesta = await Swal.fire({
        icon: "question",
        title: "¿Incluir herramientas?",
        text: piezas.length === 1 ? "1 pieza disponible en el área" : `${piezas.length} piezas disponibles en el área`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Sí, incluir",
        denyButtonText: "Solo el área",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#28a745",
        denyButtonColor: "#6c757d",
    });

    if (respuesta.isConfirmed) return piezas;
    if (respuesta.isDenied) return [];
    return null;
}
