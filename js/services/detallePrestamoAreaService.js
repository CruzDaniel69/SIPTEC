const API_URL = "http://localhost:8080/api/detallePrestamoArea";

export async function obtenerDetallePrestamoAreas() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Error al obtener las relaciones prestamo-area");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las relaciones prestamo-area: " + error);
        throw error;
    }
}

export async function obtenerDetallePrestamoAreaPorId(idArea, idPrestamo) {
    try {
        const response = await fetch(`${API_URL}/${idArea}/${idPrestamo}`);

        if (!response.ok) {
            throw new Error("Error al obtener la relacion prestamo-area con ID: " + idArea + "-" + idPrestamo);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener la relacion prestamo-area por ID: " + error);
        throw error;
    }
}

export async function obtenerAreasPorPrestamo(idPrestamo) {
    try {
        const response = await fetch(`${API_URL}/prestamo/${idPrestamo}`);

        if (!response.ok) {
            throw new Error("Error al obtener las areas del prestamo con ID: " + idPrestamo);
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las areas del prestamo: " + error);
        throw error;
    }
}

export async function agregarDetallePrestamoArea(detallePrestamoArea) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detallePrestamoArea)
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

export async function eliminarDetallePrestamoArea(idArea, idPrestamo) {
    try {
        const response = await fetch(`${API_URL}/${idArea}/${idPrestamo}`, {
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
