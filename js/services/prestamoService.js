const API_URL = "http://localhost:8080/api/prestamo";

export async function obtenerPrestamos() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Error al obtener los prestamos");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener los prestamos: " + error);
        throw error;
    }
}

export async function obtenerPrestamoPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);

        if (!response.ok) {
            throw new Error("Error al obtener el prestamo con ID: " + id);
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener el prestamo por ID: " + error);
        throw error;
    }
}

export async function agregarPrestamo(prestamo) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(prestamo)
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

export async function actualizarPrestamo(id, prestamo) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(prestamo)
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

export async function eliminarPrestamo(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
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
