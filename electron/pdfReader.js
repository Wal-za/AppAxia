const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdf2table = require('pdf2table');
const pdfParse = require('pdf-parse');

// Extrae una página específica de un PDF y devuelve su buffer
async function extraerPaginaPDF(pathPDF, pageIndex = 0) {
  try {
    const buffer = fs.readFileSync(pathPDF);
    const pdfDoc = await PDFDocument.load(buffer);
    const newPdf = await PDFDocument.create();
    const [selectedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(selectedPage);
    return await newPdf.save();
  } catch (err) {
    console.error('Error al extraer la página del PDF:', err);
    throw err;
  }
}

// Lee el texto completo del PDF
async function leerTextoPDF(pathPDF) {
  try {
    const buffer = fs.readFileSync(pathPDF);
    const data = await pdfParse(buffer);
    return data.text.toLowerCase();
  } catch (err) {
    console.error('Error al leer el texto del PDF:', err);
    throw err;
  }
}

// Identifica el tipo de PDF según si contiene 'bmi' o 'rl360'
async function identificarTipoPDF(pathPDF) {
  const texto = await leerTextoPDF(pathPDF);

  if (texto.includes('bmi')) return 'bmi';
  if (texto.includes('rl360')) return 'rl360';

  throw new Error(`No se pudo identificar el tipo de PDF: ${pathPDF}`);
}

// Convierte la página PDF a JSON 
function convertirTablaAJSON(pdfBuffer) {
  return new Promise((resolve, reject) => {
    pdf2table.parse(pdfBuffer, (err, rows) => {
      if (err) return reject('Error al extraer la tabla: ' + err);
      if (!Array.isArray(rows) || rows.length === 0) {
        return reject('No se encontraron filas en la página.');
      }

      const filasFiltradas = rows.filter(fila => {
        const valorInicial = fila[0];
        return valorInicial === '10' || valorInicial === '15' || valorInicial === '25';
      });

      resolve({ rows: filasFiltradas });
    });
  });
}

// Procesa un arreglo de PDFs, identifica el tipo y extrae la tabla de la página correspondiente
async function leerPDF(pdfs) {
  const resultados = [];

  for (const { pathPDF } of pdfs) {
    let tipoPDF;

    try {
      tipoPDF = await identificarTipoPDF(pathPDF);
    } catch (err) {
      continue;
    }

    const pageIndex = tipoPDF === 'bmi' ? 1 : 0;

    try {
      const pageBuffer = await extraerPaginaPDF(pathPDF, pageIndex);
      const jsonResult = await convertirTablaAJSON(pageBuffer);

      resultados.push({
        pdf: pathPDF,
        pageIndex,
        data: jsonResult
      });
    } catch (err) {
     
    }
  }

  return resultados;
}

module.exports = {
  leerPDF,
  convertirTablaAJSON,
  extraerPaginaPDF,
  identificarTipoPDF
};
