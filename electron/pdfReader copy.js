const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdf2table = require('pdf2table');

// Función para extraer una página de un PDF y devolverla como buffer
async function extraerPaginaPDF(pathPDF, pageIndex = 0) {
  try {
    const buffer = fs.readFileSync(pathPDF);
    const pdfDoc = await PDFDocument.load(buffer);
    const newPdf = await PDFDocument.create();
    const [selectedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(selectedPage);

    const pageBuffer = await newPdf.save();
    return pageBuffer;
  } catch (err) {
    console.error('Error al extraer la página del PDF:', err);
    throw err;
  }
}

// Función para convertir la página extraída en un JSON con las filas de la tabla
function convertirTablaAJSON(pdfBuffer) {
  return new Promise((resolve, reject) => {
    pdf2table.parse(pdfBuffer, (err, rows) => {
      if (err) {
        reject('Error al extraer la tabla: ' + err);
        return;
      }

      if (!rows || rows.length === 0) {
        reject('No se encontraron filas en la página.');
        return;
      }

      // Devolvemos las filas en formato JSON
      resolve({
        rows: rows
      });
    });
  });
}

// Función para leer un PDF, extraer una página y convertirla en JSON
async function leerPDF(pdfs) {
  try {
    const resultados = [];

    // Iteramos sobre cada archivo PDF y su página correspondiente
    for (const { pathPDF, pageIndex } of pdfs) {
      console.log(`Procesando: ${pathPDF}, Página: ${pageIndex}`);

      const pageBuffer = await extraerPaginaPDF(pathPDF, pageIndex);
      const jsonResult = await convertirTablaAJSON(pageBuffer);

      // Almacenamos el resultado para este archivo
      resultados.push({
        pdf: pathPDF,
        pageIndex,
        data: jsonResult
      });
    }

    // Devolvemos todos los resultados
    return resultados;
  } catch (err) {
    console.error('Error al procesar los PDFs:', err);
    throw err;
  }
}

module.exports = { leerPDF, convertirTablaAJSON, extraerPaginaPDF };
