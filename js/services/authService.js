const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/auth";

export async function iniciarSesion(correo, clave) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ correo, clave })
        });

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error("Error al iniciar sesión: " + response.status);
        }

        return await response.json();
    }
    catch (error) {
        console.error("Error al iniciar sesión: " + error);
        throw error;
    }
}
