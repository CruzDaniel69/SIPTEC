export function obtenerRolActual() {
    return (localStorage.getItem("siptec-role") || "ADMINISTRADOR").toUpperCase();
}

export function puedeGestionar(rolesPermitidos) {
    return rolesPermitidos.includes(obtenerRolActual());
}
