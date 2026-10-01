const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/area";


export async function obtenerAreas() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener las areas");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las areas: " + error);
        throw error; 
    }
}

export async function obtenerAreaPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener el area con ID: " + id);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener el area por ID: " + error);
        throw error;
    }
}

export async function agregarArea(area) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(area)
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

export async function actualizarArea(id, area) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(area)
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

export async function eliminarArea(id) {
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
