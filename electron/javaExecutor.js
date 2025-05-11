const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const os = require('os');
const { dialog } = require('electron');

const ejecutarJavaExe = async (datos) => {
  const isDev = process.env.NODE_ENV !== 'production';

  const JAR_URL = 'http://downloads.bmiportal.com/BMIQuote/BMIQuoteCL2018.jar';
  const MANIFEST_URL = 'http://downloads.bmiportal.com/BMIQuote/manifiestCL2018.txt';
  const JAR_NAME = 'BMIQuoteCL2018.jar';
  const MANIFEST_NAME = 'manifiestCL2018.txt';

  const baseFolder = os.platform() === 'darwin'
    ? path.join(os.homedir(), 'BMI')
    : 'C:\\BMI Companies\\Life Illustrator';

  const jarPath = path.join(baseFolder, JAR_NAME);
  const manifestPath = path.join(baseFolder, MANIFEST_NAME);

  const crearDirectorioSiNoExiste = () => {
    if (!fs.existsSync(baseFolder)) {
      fs.mkdirSync(baseFolder, { recursive: true });
    }
  };

  const descargarArchivo = (url, destino) => {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destino);
      client.get(url, (res) => {
        if (res.statusCode !== 200) return reject(`Error al descargar archivo. Código: ${res.statusCode}`);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  };

  const obtenerHash = (filePath) => {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) return resolve('');
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  };

  const obtenerManifiesto = () => {
    return new Promise((resolve, reject) => {
      const client = MANIFEST_URL.startsWith('https') ? https : http;
      let data = '';
      client.get(MANIFEST_URL, (res) => {
        if (res.statusCode !== 200) return reject('No se pudo obtener el manifiesto remoto');
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  };

  const buscarRutaJava8 = () => {
    const platform = os.platform();

    if (platform === 'win32') {
      const posiblesRutas = [
        'C:\\Program Files\\Java\\jdk1.8.0_333\\bin\\java.exe',
        'C:\\Program Files\\Java\\jdk1.8.0_202\\bin\\java.exe',
        'C:\\Program Files (x86)\\Java\\jdk1.8.0_333\\bin\\java.exe',
        'C:\\Program Files\\Java\\jre1.8.0_333\\bin\\java.exe',
        'C:\\Program Files (x86)\\Java\\jre1.8.0_333\\bin\\java.exe',
      ];
      for (const ruta of posiblesRutas) {
        if (fs.existsSync(ruta)) return ruta;
      }
    } else if (platform === 'darwin') {
      try {
        const javaHome = execSync('/usr/libexec/java_home -v 1.8').toString().trim();
        const javaPath = path.join(javaHome, 'bin', 'java');
        if (fs.existsSync(javaPath)) return javaPath;
      } catch (err) {
        // Java 8 no encontrado
      }
    }

    try {
      const versionOutput = execSync('java -version 2>&1').toString();
      if (versionOutput.includes('"1.8.') || versionOutput.includes('version "1.8')) {
        return 'java';
      }
    } catch {}

    return null;
  };

  return new Promise(async (resolve, reject) => {
    const javaPath = buscarRutaJava8();
    if (!javaPath) {
      dialog.showErrorBox(
        'Java 8 requerido',
        os.platform() === 'win32'
          ? 'No se encontró Java 8.\nInstálalo desde:\nhttps://www.oracle.com/java/technologies/javase/javase8-archive-downloads.html'
          : 'No se encontró Java 8.\nInstálalo con Homebrew:\n\nbrew install --cask temurin8\n\nO descárgalo desde:\nhttps://adoptium.net/en-GB/temurin/releases/?version=8'
      );
      return reject('Java 8 no está instalado.');
    }

    try {
      crearDirectorioSiNoExiste();
      const localHash = await obtenerHash(jarPath);

      let remoto = '';
      try {
        remoto = await obtenerManifiesto();
      } catch {
        console.warn('No se pudo obtener el manifiesto remoto. Continuando con versión local si existe.');
      }

      if (remoto) {
        try {
          const json = JSON.parse(remoto);
          if (json.version !== localHash) {
            console.log('Versión desactualizada. Descargando nueva...');
            await descargarArchivo(JAR_URL, jarPath);
            fs.writeFileSync(manifestPath, remoto, 'utf-8');
          } else {
            console.log('Versión actual ya está instalada.');
          }
        } catch (e) {
          console.warn('Manifiesto remoto inválido. Continuando con archivo local...');
        }
      }
    } catch (err) {
      console.error('Error durante verificación o descarga:', err);
      return reject(err);
    }

    if (!fs.existsSync(jarPath)) {
      return reject('El archivo .jar no existe después del intento de descarga.');
    }

    const args = ['-jar', jarPath, JSON.stringify(datos)];
    const proceso = spawn(javaPath, args, {
      cwd: baseFolder,
      detached: true,
      stdio: isDev ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'ignore'],
    });

    let output = '', errorOutput = '';

    if (isDev) {
      proceso.stdout.on('data', (data) => {
        output += data.toString();
      });

      proceso.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Error estándar del proceso:', data.toString());
      });
    }

    proceso.on('close', (code) => {
      if (code === 0) {
        resolve(isDev ? output : 'Proceso ejecutado correctamente');
      } else {
        reject(`El proceso terminó con el código ${code}. Errores: ${isDev ? errorOutput : 'Sin detalles'}`);
      }
    });

    proceso.on('error', (err) => {
      console.error('Error al intentar ejecutar el proceso:', err.message);
      reject(`Error al ejecutar el proceso: ${err.message}`);
    });
  });
};

module.exports = {
  ejecutarJavaExe,
};
