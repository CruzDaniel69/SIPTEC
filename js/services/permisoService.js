const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/permisos";

export async function obtenerPermisos() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener los permisos");
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener los permisos: " + error);
        throw error;
    }
}

export async function agregarPermiso(permiso) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(permiso)
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

export async function actualizarPermiso(id, permiso) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(permiso)
        });

        if (!response.ok) {
            throw new Error("Error al actualizar el registro: " + response.status);
        }
        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al actualizar el registro: " + error);
        throw error;
    }
}

export async function eliminarPermiso(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
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
