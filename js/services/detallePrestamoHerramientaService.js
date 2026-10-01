const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/detallePrestamoHerramienta";

export async function obtenerDetallePrestamoHerramientas() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener los detalles de prestamo-herramienta");
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener los detalles de prestamo-herramienta: " + error);
        throw error;
    }
}

export async function obtenerDetallePrestamoHerramientaPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener el detalle de prestamo-herramienta con ID: " + id);
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener el detalle de prestamo-herramienta por ID: " + error);
        throw error;
    }
}

export async function agregarDetallePrestamoHerramienta(detallePrestamoHerramienta) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detallePrestamoHerramienta)
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

export async function actualizarDetallePrestamoHerramienta(id, detallePrestamoHerramienta) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detallePrestamoHerramienta)
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

export async function eliminarDetallePrestamoHerramienta(id) {
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
