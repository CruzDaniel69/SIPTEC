import { rolActual } from "./sesion.js";

export function obtenerRolActual() {
    return rolActual();
}

export function puedeGestionar(rolesPermitidos) {
    return rolesPermitidos.includes(obtenerRolActual());
}
