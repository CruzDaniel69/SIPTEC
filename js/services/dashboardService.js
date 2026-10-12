const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/dashboard";

export async function obtenerResumenDashboard(desdeISO) {
    const parametros = new URLSearchParams({ desde: desdeISO });
    const response = await fetch(`${API_URL}/resumen?${parametros}`, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Error al obtener el resumen del panel: " + response.status);
    }

    const resultado = await response.json();
    return resultado.data;
}
