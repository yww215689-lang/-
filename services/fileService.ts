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
      
      // We only parse the first sheet for simplicity, or we could merge them.
      // Returning array of arrays (JSON) preserves row/col structure.
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // header: 1 returns type [][]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      self.postMessage({ status: 'success', result: jsonData });
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

/**
 * Returns a 2D array of the Excel data [[Row1Col1, Row1Col2], [Row2Col1...]]
 */
export const parseExcelOrCsvToData = (file: File, signal?: AbortSignal): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const worker = createWorker();

    if (signal) {
        signal.addEventListener('abort', () => {
            worker.terminate();
            reject(new DOMException('Aborted', 'AbortError'));
        });
    }

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