import * as XLSX from 'xlsx';

// Define the worker code as a string to avoid external file dependencies in this environment.
// We use a module worker to import XLSX from CDN directly.
const WORKER_CODE = `
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

self.onmessage = async (e) => {
  const { file, action } = e.data;

  try {
    if (action === 'read_base64') {
        // Use FileReaderSync which is available in Workers
        const reader = new FileReaderSync();
        const result = reader.readAsDataURL(file);
        // remove data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        self.postMessage({ status: 'success', result: base64 });
    } 
    else if (action === 'parse_excel') {
      const data = await file.arrayBuffer();
      // CPU intensive parsing happens here, off the main thread
      const workbook = XLSX.read(data, { type: 'array' });
      
      let fullText = "";
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        fullText += \`--- Sheet: \${sheetName} ---\\n\${csv}\\n\\n\`;
      });
      
      self.postMessage({ status: 'success', result: fullText });
    }
  } catch (err) {
    self.postMessage({ status: 'error', error: err.message });
  }
};
`;

const createWorker = () => {
  const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob), { type: "module" });
};

export const readFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const worker = createWorker();

    worker.onmessage = (e) => {
      const { status, result, error } = e.data;
      if (status === 'success') {
        resolve(result);
      } else {
        reject(new Error(error));
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage({ file, action: 'read_base64' });
  });
};

export const parseExcelOrCsvToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const worker = createWorker();

    worker.onmessage = (e) => {
      const { status, result, error } = e.data;
      if (status === 'success') {
        resolve(result);
      } else {
        reject(new Error(error));
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage({ file, action: 'parse_excel' });
  });
};
