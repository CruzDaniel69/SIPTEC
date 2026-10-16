const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/usuarios";

export async function obtenerUsuarios() {
    try {
        const response = await fetch(`${API_URL}?size=50`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener los usuarios");
        }

        const resultado = await response.json();

        return resultado.data ? resultado.data.content : [];
    }
    catch (error) {
        console.error("Error al obtener los usuarios: " + error);
        throw error;
    }
}

export async function obtenerUsuarioPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener el usuario con ID: " + id);
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener el usuario por ID: " + error);
        throw error;
    }
}

export async function agregarUsuario(usuario) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(usuario)
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

export async function actualizarUsuario(id, usuario) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(usuario)
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

export async function eliminarUsuario(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "DELETE"
        });

        if (!response.ok) {
            // La API explica el motivo (por ejemplo "No puedes eliminar tu propia cuenta"): se muestra tal cual
            const resultado = await response.json().catch(() => null);
            throw new Error((resultado && resultado.message) || "Error al eliminar el registro: " + response.status);
        }
        return true;
    }
    catch (error) {
        console.error("Error al eliminar el registro: " + error);
        throw error;
    }
}

export async function obtenerUsuariosPagina({ page = 0, size = 10, q = "" } = {}) {
    const parametros = new URLSearchParams({ page, size, q });
    const response = await fetch(`${API_URL}?${parametros}`, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Error al obtener la página de usuarios: " + response.status);
    }

    const resultado = await response.json();
    return resultado.data;
}
