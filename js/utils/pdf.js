// Generador de reportes PDF de SIPTEC (jsPDF + autoTable, guardados en js/vendor para no depender de internet).
// Las librerías se cargan solo la primera vez que se exporta un PDF.

const AZUL_MARINO = [0, 31, 61];
const GRIS_TEXTO = [90, 104, 120];
const TINTA = [28, 39, 51];
const FILA_ALTERNA = [243, 246, 250];
const COLORES_ESTADO = {
    "DAÑADO": [185, 28, 28],
    "DISPONIBLE": [21, 128, 61],
    "EN PRESTAMO": [180, 83, 9],
};

const MARGEN = 15;

function cargarScript(ruta) {
    return new Promise((resolver, rechazar) => {
        const script = document.createElement("script");
        script.src = new URL(ruta, import.meta.url).href;
        script.onload = resolver;
        script.onerror = () => rechazar(new Error("No se pudo cargar " + ruta));
        document.head.appendChild(script);
    });
}

let librerias = null;

async function cargarLibrerias() {
    if (!librerias) {
        librerias = (async () => {
            if (!window.jspdf) await cargarScript("../vendor/jspdf.umd.min.js");
            await cargarScript("../vendor/jspdf.plugin.autotable.min.js");
        })();
    }
    await librerias;
}

/** El logo es de 2000 px: se reduce para que el PDF no pese de más. */
function logoComoDataUrl() {
    return new Promise((resolver) => {
        const imagen = new Image();
        imagen.onload = () => {
            const lienzo = document.createElement("canvas");
            lienzo.width = 240;
            lienzo.height = 240;
            const contexto = lienzo.getContext("2d");
            contexto.fillStyle = "#fff";
            contexto.fillRect(0, 0, 240, 240);
            contexto.drawImage(imagen, 0, 0, 240, 240);
            resolver(lienzo.toDataURL("image/jpeg", 0.88));
        };
        imagen.onerror = () => resolver(null);
        imagen.src = new URL("../../img/SIPTEC logos.png", import.meta.url).href;
    });
}

function fechaHoraActual() {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
    const hora = ahora.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
    return `${fecha}, ${hora}`;
}

function dibujarEncabezado(doc, logo, generadoPor) {
    const ancho = doc.internal.pageSize.getWidth();

    if (logo) doc.addImage(logo, "JPEG", MARGEN, 11, 18, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...AZUL_MARINO);
    doc.text("SIPTEC", MARGEN + 22, 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text("Sistema de préstamo e inventario de área técnica", MARGEN + 22, 24.5);

    doc.text(`Generado el ${fechaHoraActual()}`, ancho - MARGEN, 18, { align: "right" });
    if (generadoPor) doc.text(`Por: ${generadoPor}`, ancho - MARGEN, 23, { align: "right" });

    doc.setDrawColor(...AZUL_MARINO);
    doc.setLineWidth(0.7);
    doc.line(MARGEN, 33, ancho - MARGEN, 33);
}

function dibujarPies(doc) {
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const paginas = doc.internal.getNumberOfPages();

    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 208, 218);
        doc.setLineWidth(0.3);
        doc.line(MARGEN, alto - 14, ancho - MARGEN, alto - 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRIS_TEXTO);
        doc.text("SIPTEC · Instituto Técnico Ricaldone", MARGEN, alto - 9);
        doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 9, { align: "right" });
    }
}

/** Bloque gris con pares "etiqueta: valor" en dos columnas. Devuelve la posición vertical donde termina. */
function dibujarResumen(doc, resumen, y) {
    const ancho = doc.internal.pageSize.getWidth() - MARGEN * 2;
    const filas = Math.ceil(resumen.length / 2);
    const alto = filas * 12 + 5;

    doc.setFillColor(...FILA_ALTERNA);
    doc.roundedRect(MARGEN, y, ancho, alto, 2, 2, "F");

    resumen.forEach(([etiqueta, valor], indice) => {
        const x = MARGEN + 5 + (indice % 2) * (ancho / 2);
        const yFila = y + 10 + Math.floor(indice / 2) * 12;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRIS_TEXTO);
        doc.text(etiqueta.toUpperCase(), x, yFila - 3);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...TINTA);
        doc.text(String(valor ?? "-"), x, yFila + 2.5);
    });

    return y + alto;
}

/**
 * Crea y descarga un PDF de reporte.
 * @param {object} datos
 * @param {string} datos.titulo      Título grande del reporte.
 * @param {string} [datos.subtitulo] Línea descriptiva bajo el título.
 * @param {string} [datos.generadoPor] Nombre de quien lo genera.
 * @param {Array<[string, string]>} [datos.resumen] Pares etiqueta/valor para el bloque de datos clave.
 * @param {string[]} [datos.columnas] Encabezados de la tabla (si se omite, no hay tabla).
 * @param {Array<Array<string>>} [datos.filas] Filas de la tabla.
 * @param {string} [datos.nota] Párrafo de texto después del bloque de datos.
 * @param {string[]} [datos.firmas] Etiquetas de las líneas de firma al final (por ejemplo "Reportado por").
 * @param {number} [datos.columnaEstado] Índice de la columna cuyo texto se colorea según el estado.
 * @param {string} datos.nombreArchivo Nombre del archivo, con .pdf.
 */
export async function crearPdf(datos) {
    await cargarLibrerias();
    const logo = await logoComoDataUrl();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    dibujarEncabezado(doc, logo, datos.generadoPor);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...TINTA);
    doc.text(datos.titulo, MARGEN, 45);

    let y = 49;
    if (datos.subtitulo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRIS_TEXTO);
        doc.text(datos.subtitulo, MARGEN, 50);
        y = 55;
    }

    if (datos.resumen && datos.resumen.length > 0) {
        y = dibujarResumen(doc, datos.resumen, y) + 10;
    }

    if (datos.nota) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...TINTA);
        const lineas = doc.splitTextToSize(datos.nota, doc.internal.pageSize.getWidth() - MARGEN * 2);
        doc.text(lineas, MARGEN, y);
        y += lineas.length * 5 + 6;
    }

    if (datos.firmas && datos.firmas.length > 0) {
        // Líneas de firma al final del contenido, con la etiqueta debajo de cada una
        const ancho = doc.internal.pageSize.getWidth() - MARGEN * 2;
        const separacion = 12;
        const anchoFirma = (ancho - separacion * (datos.firmas.length - 1)) / datos.firmas.length;
        const yFirma = y + 34;
        doc.setDrawColor(...GRIS_TEXTO);
        doc.setLineWidth(0.3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRIS_TEXTO);
        datos.firmas.forEach((etiqueta, i) => {
            const x = MARGEN + i * (anchoFirma + separacion);
            doc.line(x, yFirma, x + anchoFirma, yFirma);
            doc.text(etiqueta, x + anchoFirma / 2, yFirma + 5, { align: "center" });
        });
    }

    if (datos.columnas && datos.filas) {
        doc.autoTable({
            startY: y,
            head: [datos.columnas],
            body: datos.filas,
            margin: { left: MARGEN, right: MARGEN, top: 38, bottom: 20 },
            styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.6, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
            headStyles: { fillColor: AZUL_MARINO, textColor: 255, fontStyle: "bold", halign: "left" },
            alternateRowStyles: { fillColor: FILA_ALTERNA },
            didParseCell: (celda) => {
                if (celda.section !== "body" || celda.column.index !== datos.columnaEstado) return;
                const color = COLORES_ESTADO[String(celda.cell.raw).toUpperCase()];
                if (color) {
                    celda.cell.styles.textColor = color;
                    celda.cell.styles.fontStyle = "bold";
                }
            },
            // Las páginas siguientes repiten el encabezado de SIPTEC
            didDrawPage: (info) => {
                if (info.pageNumber > 1) dibujarEncabezado(doc, logo, datos.generadoPor);
            },
        });
    }

    dibujarPies(doc);
    return doc;
}

export async function descargarPdf(datos) {
    const doc = await crearPdf(datos);
    doc.save(datos.nombreArchivo);
}
