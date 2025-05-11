const XLSX = require('xlsx');
const path = require('path');

// Función para guardar los datos filtrados en un archivo Excel
function guardarEnExcel(datos, archivosPDF, nombreArchivo = 'resultado.xlsx') {
  const directorioPDF = path.dirname(archivosPDF[0].pathPDF); 
  const rutaExcel = path.join(directorioPDF, nombreArchivo);

  const wb = XLSX.utils.book_new();

  datos.forEach((pdfData) => {
    const { pdf, pageIndex, data } = pdfData;

    const filas = data.rows;
    
    const filasExcel = filas.map((fila, index) => {
      let filaObjeto = {};
      fila.forEach((valor, colIndex) => {
        filaObjeto[`Columna ${colIndex + 1}`] = valor;
      });
      return filaObjeto;
    });

    const ws = XLSX.utils.json_to_sheet(filasExcel);

    const nombreHoja = path.basename(pdf, path.extname(pdf)); // Usamos el nombre del PDF sin la extensión
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  });

  XLSX.writeFile(wb, rutaExcel);

  return rutaExcel;
}

module.exports = { guardarEnExcel };
