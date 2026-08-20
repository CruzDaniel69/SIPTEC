const API_URL = "http://localhost:8080/api/rolPermiso";

export async function obtenerRolPermisos() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Error al obtener las relaciones rol-permiso");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las relaciones rol-permiso: " + error);
        throw error;
    }
}

export async function obtenerRolPermisoPorIdRol(idRol) {
    try {
        const response = await fetch(`${API_URL}/${idRol}`);

        if (!response.ok) {
            throw new Error("Error al obtener la relacion rol-permiso con idRol: " + idRol);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener la relacion rol-permiso por idRol: " + error);
        throw error;
    }
}

export async function agregarRolPermiso(rolPermiso) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(rolPermiso)
        });

        if (!response.ok) {
            throw new Error("Error al agregar el registro: " + response.status);
        }
        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al agregar el registro: " + error);
        throw error;
    }
}

export async function eliminarRolPermisoPorIdRol(idRol) {
    try {
        const response = await fetch(`${API_URL}/${idRol}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Error al eliminar el registro: " + response.status);
        }
        return true;
    }
    catch (error) {
        console.error("Error al eliminar el registro: " + error);
        throw error;
    }
}
