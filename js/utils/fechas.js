// Fechas de préstamos: la API las entrega como "2026-10-12T14:30:00" (filas antiguas: "2026-10-12T00:00:00")
// y las recibe como "2026-10-12T14:30". Se manejan siempre en hora local, sin conversión de zona.

const DIA_EN_MS = 86400000;

function dosDigitos(n) {
    return String(n).padStart(2, "0");
}

/** Convierte el texto de la API (con o sin hora) en un Date local; null si no hay fecha. */
export function aFecha(texto) {
    if (!texto) return null;
    const valor = String(texto);
    return new Date(valor.length === 10 ? valor + "T00:00:00" : valor);
}

/** Formato que entiende <input type="datetime-local">: "2026-10-12T14:30" en hora local. */
export function aValorInput(fecha) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`
        + `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function ahoraLocalISO() {
    return aValorInput(new Date());
}

function tieneHora(fecha) {
    return fecha.getHours() !== 0 || fecha.getMinutes() !== 0;
}

/** "12 oct 2026" o, si el préstamo tiene hora, "12 oct 2026, 02:30 p. m.". Sin fecha devuelve "-". */
export function formatearFechaHora(texto) {
    const fecha = aFecha(texto);
    if (!fecha || Number.isNaN(fecha.getTime())) return "-";

    const dia = fecha.toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });
    if (!tieneHora(fecha)) return dia;

    return `${dia}, ${fecha.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Igual que formatearFechaHora pero sin año ("12 oct, 02:30 p. m."), para tarjetas pequeñas. */
export function formatearFechaHoraCorta(texto) {
    const fecha = aFecha(texto);
    if (!fecha || Number.isNaN(fecha.getTime())) return "-";

    const dia = fecha.toLocaleDateString("es-SV", { day: "2-digit", month: "short" });
    if (!tieneHora(fecha)) return dia;

    return `${dia}, ${fecha.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Milisegundos que faltan para la devolución esperada (negativo si ya venció). */
export function msHastaVencer(esperadaTexto) {
    const esperada = aFecha(esperadaTexto);
    return esperada ? esperada.getTime() - Date.now() : Infinity;
}

export function estaVencido(esperadaTexto) {
    return msHastaVencer(esperadaTexto) < 0;
}

/** "Vence en 3 días", "Vence en 5 h", "Venció hace 2 días"… */
export function textoVencimiento(esperadaTexto) {
    const ms = msHastaVencer(esperadaTexto);
    if (!Number.isFinite(ms)) return "";

    const horas = Math.round(Math.abs(ms) / 3600000);
    const dias = Math.round(Math.abs(ms) / DIA_EN_MS);
    const cantidad = horas < 24 ? `${Math.max(horas, 1)} h` : `${dias} ${dias === 1 ? "día" : "días"}`;
    return ms < 0 ? `Venció hace ${cantidad}` : `Vence en ${cantidad}`;
}

export const DIAS_AVISO_VENCIMIENTO = 3;

/** Clase de color según el tiempo restante: "rojo" vencido, "amarillo" si faltan 3 días o menos, "verde" el resto. */
export function colorVencimiento(esperadaTexto) {
    const ms = msHastaVencer(esperadaTexto);
    if (ms < 0) return "rojo";
    if (ms <= DIAS_AVISO_VENCIMIENTO * DIA_EN_MS) return "amarillo";
    return "verde";
}

/**
 * Reglas del préstamo: la devolución debe ser posterior al inicio (se permite el mismo día con otra hora)
 * y no puede pasar de 1 mes. Recibe los valores de dos <input type="datetime-local">.
 */
export function fechasPrestamoValidas(inicioTexto, esperadaTexto) {
    const inicio = aFecha(inicioTexto);
    const esperada = aFecha(esperadaTexto);

    if (!inicio || !esperada || Number.isNaN(inicio.getTime()) || Number.isNaN(esperada.getTime())) {
        return { valido: false, mensaje: "Indica la fecha y la hora de inicio y de devolución." };
    }

    if (esperada <= inicio) {
        return { valido: false, mensaje: "La devolución debe ser posterior al inicio (puede ser el mismo día, con una hora mayor)." };
    }

    const unMesDespues = new Date(inicio);
    unMesDespues.setMonth(unMesDespues.getMonth() + 1);
    if (esperada > unMesDespues) {
        return { valido: false, mensaje: "El préstamo no puede exceder 1 mes desde el inicio." };
    }

    return { valido: true };
}
