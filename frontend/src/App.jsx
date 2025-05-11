import React, { useState } from 'react';
import './App.css';

function App() {
  const [resultadoJava, setResultadoJava] = useState('');
  const [resultadoPDF, setResultadoPDF] = useState('');

  // Función para ejecutar el proceso Java (comentada, no tocada)
  const handleEjecutarJava = async () => {
    const parametrosJava = {};

    try {
      const resultadoJavaResponse = await window.api.ejecutarJavaExe(parametrosJava);
      setResultadoJava(resultadoJavaResponse);
    } catch (error) {
      setResultadoJava('Error al ejecutar el proceso Java: ' + error.message);
    }
  };

  // Función para leer varios PDFs y extraer las filas 
  const handleLeerPDF = async () => {
    try {
      const archivosPDF = await window.api.seleccionarYLeerPDFs(); 
      if (archivosPDF?.error) {
        setResultadoPDF('Error: ' + archivosPDF.error);
        return;
      }

      const { resultados } = archivosPDF;
      if (resultados) {
        console.log('Resultados obtenidos:', resultados);
        setResultadoPDF(renderizarTablas(resultados));
      }
    } catch (error) {
      console.error('Error al leer los PDFs:', error);
      setResultadoPDF('Error al procesar los PDFs: ' + error.message);
    }
  };

  // Función para renderizar los resultados como tablas
  const renderizarTablas = (resultados) => {
    return resultados.map((resultado, index) => {
      const { pdf, pageIndex, data } = resultado;

      const numberOfColumns = data.rows[0].length;  

      return (
        <div key={index} className="table-container">
          <h3>{`PDF: ${pdf} (Página: ${pageIndex})`}</h3>
          <table className="dynamic-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {data.rows[0].map((_, colIndex) => (
                  <th key={colIndex} className={`col-${colIndex + 1}`}>
                    {`Columna ${colIndex + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((fila, i) => (
                <tr key={i}>
                  {fila.map((valor, j) => (
                    <td key={j}>{valor}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    });
  };

  return (
    <div>
      <button onClick={handleLeerPDF}>Leer PDF</button>
      <div>
        <h2>Resultado de los PDFs:</h2>
        <div>{resultadoPDF}</div>
      </div>
    </div>
  );
}

export default App;
