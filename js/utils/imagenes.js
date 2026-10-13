// Utilidades para las fotos que se suben a Cloudinary (fotos de equipos y evidencias de préstamos).

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Revisa el archivo antes de enviarlo. Devuelve el texto del problema, o null si está bien. La API vuelve a validarlo. */
export function validarImagen(archivo) {
    if (!archivo) return null;
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) return "La foto debe ser una imagen JPG, PNG o WEBP.";
    if (archivo.size > MAX_BYTES) return "La foto es demasiado grande (máximo 5 MB).";
    return null;
}

/** Solo se dibujan imágenes que vienen de Cloudinary: así un dato raro en la base no inyecta una dirección cualquiera. */
export function urlDeImagenSegura(url) {
    return typeof url === "string" && url.startsWith("https://res.cloudinary.com/") ? url : "";
}

/** Versión reducida de la imagen (Cloudinary la recorta al pedirla), para miniaturas de tabla. */
export function miniatura(url, lado = 80) {
    const segura = urlDeImagenSegura(url);
    return segura ? segura.replace("/upload/", `/upload/c_fill,w_${lado},h_${lado},q_auto,f_auto/`) : "";
}
