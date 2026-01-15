
import Tesseract from 'tesseract.js';
import { ParsedQuestionRaw } from "../types";

// Define the worker code for PDF parsing
// We use a module worker and import from CDN to avoid bundling issues (Top-level await)
const PDF_WORKER_CODE = `
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

self.onmessage = async (e) => {
  const { fileData } = e.data;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: fileData });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    
    let fullText = "";

    // Helper: Process a single page
    const processPage = async (pageIndex) => {
       try {
           const page = await pdf.getPage(pageIndex);
           const textContent = await page.getTextContent();
           const viewport = page.getViewport({ scale: 1.0 });
           const pageHeight = viewport.height;
           
           // Filter Header/Footer (Exclude top 5% and bottom 5% roughly)
           const headerLimit = pageHeight * 0.95;
           const footerLimit = pageHeight * 0.05;

           // Filter items based on Y position and ignore empty strings
           const items = textContent.items.filter(item => {
               const y = item.transform[5];
               return y < headerLimit && y > footerLimit && item.str.trim().length > 0;
           });
           
           // Text Assembly Logic
           let pageText = "";
           let lastY = -999;
           let lastX = -999;
           let lastWidth = 0;
           let lastHeight = 0; 

           for (const item of items) {
               const str = item.str;
               const tx = item.transform;
               const x = tx[4];
               const y = tx[5];
               const height = item.height || 10;
               
               if (lastY === -999) {
                   pageText += str;
               } else {
                   const dy = Math.abs(y - lastY);
                   
                   // Heuristic for New Line:
                   if (dy > height * 0.6) {
                       pageText += "\\n" + str;
                   } else {
                       // Same line spacing check
                       const expectedX = lastX + lastWidth;
                       const gap = x - expectedX;
                       
                       // Add space if gap is significant (> 20% of font height)
                       if (gap > height * 0.2) {
                           pageText += " " + str;
                       } else {
                           pageText += str;
                       }
                   }
               }
               
               lastX = x;
               lastY = y;
               lastWidth = item.width;
               lastHeight = height;
           }
           
           // Release page resources
           page.cleanup();
           return pageText + "\\n";
       } catch (err) {
           console.error("Error processing page " + pageIndex, err);
           return ""; // Skip failed pages to allow continuation
       }
    };

    // Parallel Processing in Batches
    // Processing 6 pages concurrently offers a good balance of speed and memory usage
    const BATCH_SIZE = 6;
    
    for (let i = 1; i <= totalPages; i += BATCH_SIZE) {
        const batchPromises = [];
        const endPage = Math.min(i + BATCH_SIZE - 1, totalPages);
        
        self.postMessage({ 
            status: 'progress', 
            message: '正在解析第 ' + i + '-' + endPage + ' / ' + totalPages + ' 页...' 
        });

        for (let j = i; j <= endPage; j++) {
            batchPromises.push(processPage(j));
        }

        const batchResults = await Promise.all(batchPromises);
        fullText += batchResults.join("");
    }

    self.postMessage({ status: 'success', result: fullText });
  } catch (err) {
    self.postMessage({ status: 'error', error: err.message });
  }
};
`;

const createWorker = () => {
  const blob = new Blob([PDF_WORKER_CODE], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob), { type: "module" });
};

/**
 * UTILS: Text Cleaning
 */
const cleanText = (str: any): string => {
    if (typeof str !== 'string') return String(str || '');
    return str.trim();
};

const isAnswerString = (str: string): boolean => {
    const s = str.trim().toUpperCase();
    return /^[A-E]$/.test(s) || /^(A|B|C|D|E)[,，](A|B|C|D|E)/.test(s); // Single char or "A,B"
};

const mapAnswerToIndex = (ans: string): number => {
    if (!ans) return 0;
    const s = ans.trim().toUpperCase().charAt(0);
    const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, '1': 0, '2': 1, '3': 2, '4': 3 };
    return map[s] !== undefined ? map[s] : 0;
};

/**
 * UTILS: Image Preprocessing for OCR
 * Resizes, converts to grayscale, and increases contrast to improve Tesseract accuracy.
 */
const preprocessImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                resolve(url); // Fallback
                return;
            }

            // 1. Resize Logic:
            // Tesseract performs poorly on small text. Upscaling small images helps.
            let width = img.width;
            let height = img.height;
            const minDim = Math.min(width, height);
            let scale = 1;
            
            if (minDim < 500) scale = 2.5;
            else if (minDim < 1000) scale = 1.8;
            else if (minDim < 1500) scale = 1.2;

            canvas.width = width * scale;
            canvas.height = height * scale;
            
            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 2. Grayscale & Contrast Enhancement
            // Contrast factor: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
            const contrast = 40; // Moderate contrast boost
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Luminosity Grayscale
                let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                
                // Apply Contrast
                gray = factor * (gray - 128) + 128;
                
                // Clamp 0-255
                gray = Math.max(0, Math.min(255, gray));

                // Optional: Simple Thresholding (can be risky for shadows, so we stick to high contrast gray)
                // if (gray < 128) gray = 0; else gray = 255;

                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            console.warn("Image preprocessing failed", e);
            resolve(url);
        };
        
        img.src = url;
    });
};

/**
 * CORE LOGIC 1: Structured Excel Parsing
 */
export const parseExcelDataToQuestions = (data: any[][]): ParsedQuestionRaw[] => {
    const questions: ParsedQuestionRaw[] = [];
    
    let startRow = 0;
    if (data.length > 0) {
        const row0 = data[0].map(c => String(c).toLowerCase());
        if (row0.some(c => c.includes('question') || c.includes('题目') || c.includes('题干'))) {
            startRow = 1;
        }
    }

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const cells = row.map(cleanText).filter(c => c);
        if (cells.length < 2) continue; 

        let questionText = cells[0];
        let options: string[] = [];
        let answerIndex = 0;
        let explanation = "";

        let answerColIdx = -1;
        
        for (let j = cells.length - 1; j >= 1; j--) {
            if (isAnswerString(cells[j])) {
                answerColIdx = j;
                break;
            }
        }

        if (answerColIdx > -1) {
            questionText = cells[0];
            options = cells.slice(1, answerColIdx);
            answerIndex = mapAnswerToIndex(cells[answerColIdx]);
            if (answerColIdx + 1 < cells.length) {
                explanation = cells.slice(answerColIdx + 1).join(' ');
            }
        } else {
            questionText = cells[0];
            if (cells.length >= 3) {
                 options = cells.slice(1, cells.length); 
            }
        }

        options = options.map(o => o.replace(/^[A-E][\.、\s]\s*/i, '').trim());

        if (questionText && options.length >= 2) {
            questions.push({
                question: questionText,
                options,
                answerIndex,
                explanation
            });
        }
    }

    return questions;
};

/**
 * CORE LOGIC 2: Improved Regex Text Parsing
 * Handles raw text from PDF/OCR more robustly.
 */
const parseRawTextToQuestions = (text: string): ParsedQuestionRaw[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const questions: ParsedQuestionRaw[] = [];
  
  let currentQuestion: Partial<ParsedQuestionRaw> | null = null;
  let currentOptions: string[] = [];
  let isParsingExplanation = false; // Flag to prevent explanation text from merging into options

  // 1. Question Start: "1.", "1、", "(1)", "Q1", "[1]", "1 " 
  const questionStartRegex = /^(\d+|Q\d+|[\(（\[【]\d+[\]】）\)])[\.、\s\)\.](.*)/i;
  
  // 2. Option: "A.", "A、", "(A)", "[A]"
  const optionRegex = /^([A-E])[\.、\s\)\.](.*)/i;

  // 3. Answer Detectors (Expanded)
  // Matches: "答案:A", "正确答案：B", "Reference Answer: C", "【答案】D"
  const answerKeywordRegex = /(?:^|\s|[\(（【\[])(答案|参考答案|正确答案|Answer|Ans)[\)）\]】]?[:：\s]*([A-E])/i;
  
  // 4. Explanation Detectors
  // Matches: "解析:", "分析:", "【解析】"
  const explanationKeywordRegex = /^(解析|分析|解释|Explanation|Analysis)[\)）\]】]?[:：\s]*/i;

  // 5. Trailing Answer Cleaner (Matches "(A)" or "(Answer: A)" at end of question text)
  const trailingAnswerCleanerRegex = /[\(（【\[]\s*(答案|参考答案|正确答案|Answer|Ans)?[:：]?\s*[A-E]\s*[\)）\]】]\s*$/i;

  const saveCurrent = () => {
    if (currentQuestion && currentQuestion.question && currentOptions.length >= 2) {
      questions.push({
        question: currentQuestion.question,
        options: [...currentOptions],
        answerIndex: currentQuestion.answerIndex || 0,
        explanation: currentQuestion.explanation || "" 
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // IGNORE GARBAGE
    if (/^Page \d+/.test(line) || /^\d+\s*\/ \s*\d+$/.test(line)) continue;

    // A. Check for Answer Line
    // If we find an answer line, extract it and STOP processing this line as text
    const ansMatch = line.match(answerKeywordRegex);
    if (ansMatch && currentQuestion) {
        currentQuestion.answerIndex = mapAnswerToIndex(ansMatch[2]);
        
        // If the line also contains explanation text (e.g. "Answer: A. Because..."), capture it
        // A simple heuristic: if line length is significantly longer than the match, treat rest as explanation
        if (line.length > ansMatch[0].length + 5) {
             const rest = line.substring(line.indexOf(ansMatch[0]) + ansMatch[0].length).trim();
             if (rest) {
                 currentQuestion.explanation = (currentQuestion.explanation || "") + " " + rest;
                 isParsingExplanation = true;
             }
        }
        continue; 
    }

    // B. Check for Explanation Start
    if (explanationKeywordRegex.test(line)) {
        if (currentQuestion) {
            isParsingExplanation = true;
            const content = line.replace(explanationKeywordRegex, '').trim();
            currentQuestion.explanation = (currentQuestion.explanation || "") + " " + content;
        }
        continue;
    }

    // If we are in explanation mode, just append to explanation until we hit a new question
    if (isParsingExplanation && currentQuestion) {
        // However, we must check if this "continuation" is actually a new Question start
        // If not a new question, append to explanation
        if (!questionStartRegex.test(line)) {
             currentQuestion.explanation += "\n" + line;
             continue;
        }
        // If it IS a new question, fall through to step D
    }

    // C. Check for Option
    const optionMatch = line.match(optionRegex);
    if (optionMatch) {
      // If we encounter an option, we are definitely not in explanation mode anymore (unless format is weird)
      isParsingExplanation = false; 
      
      const content = line.replace(/^[A-E][\.、\s\)\.\]】]\s*/i, '').trim();
      currentOptions.push(content);
      continue;
    }

    // D. Check for Question Start
    const questionMatch = line.match(questionStartRegex);
    
    if (questionMatch) {
      saveCurrent(); // Save previous
      
      // Remove the numbering "1."
      let qBody = line.replace(/^(\d+|Q\d+|[\(（\[【]\d+[\]】）\)])[\.、\s\)\.]\s*/i, '').trim();

      // CLEANUP: Strip inline answers like "1. Question text? (A)" or "1. Question text? [Correct Answer: B]"
      qBody = qBody.replace(trailingAnswerCleanerRegex, '').trim();

      // Start new
      currentQuestion = {
        question: qBody || line 
      };
      currentOptions = [];
      isParsingExplanation = false;
      continue;
    }

    // E. Continuation Logic (Question text or Option text)
    // If line didn't match anything above, append it to the active buffer
    if (currentOptions.length > 0) {
      currentOptions[currentOptions.length - 1] += " " + line;
    } else if (currentQuestion) {
       // Append to question body, but ensure we don't append stray "Correct" words if regex missed them earlier
       if (!/^(答案|正确|Correct)/i.test(line)) {
          currentQuestion.question += " " + line;
       }
    }
  }

  saveCurrent(); // Save last one
  return questions;
};

const extractTextFromPDF = async (file: File, onProgress?: (msg: string) => void, signal?: AbortSignal): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const worker = createWorker();
    
    if (signal) {
        signal.addEventListener('abort', () => {
            worker.terminate();
            reject(new DOMException('Aborted', 'AbortError'));
        });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    worker.onmessage = (e) => {
        const { status, message, result, error } = e.data;
        if (status === 'progress' && onProgress) {
            onProgress(message);
        } else if (status === 'success') {
            resolve(result);
            worker.terminate();
        } else if (status === 'error') {
            reject(new Error(error));
            worker.terminate();
        }
    };
    
    worker.onerror = (err) => {
        reject(err);
        worker.terminate();
    };

    worker.postMessage({ fileData: arrayBuffer }, [arrayBuffer]);
  });
};

const extractTextFromImage = async (file: File, onProgress?: (msg: string) => void): Promise<string> => {
  if (onProgress) onProgress("优化图片质量...");
  
  // Use preprocess helper to get a better image for OCR
  let imageInput: string | File = file;
  try {
      imageInput = await preprocessImage(file);
  } catch (err) {
      console.warn("Preprocessing failed, using original file", err);
  }
  
  if (onProgress) onProgress("初始化 OCR 引擎...");
  
  const result = await Tesseract.recognize(
    imageInput,
    'chi_sim+eng',
    {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(`图片识别中... ${(m.progress * 100).toFixed(0)}%`);
        }
      }
    }
  );

  return result.data.text;
};

export const parseFileLocal = async (
  file: File, 
  onProgress?: (msg: string) => void,
  signal?: AbortSignal
): Promise<ParsedQuestionRaw[]> => {
  let rawText = "";

  try {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls') || 
        file.name.endsWith('.csv') ||
        file.type.includes('sheet') || 
        file.type.includes('excel')
    ) {
        throw new Error("Use parseExcelDataToQuestions for Excel files"); 
    }

    if (file.type === 'application/pdf') {
      rawText = await extractTextFromPDF(file, onProgress, signal);
    } else if (file.type.startsWith('image/')) {
      rawText = await extractTextFromImage(file, onProgress);
    } else {
      throw new Error("不支持的文件类型");
    }
    
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!rawText.trim()) {
      throw new Error("无法提取文字，请检查文件是否加密或为空。");
    }

    if (onProgress) onProgress("正在结构化数据...");
    const questions = parseRawTextToQuestions(rawText);
    
    if (questions.length === 0) {
      console.warn("Regex failed. Raw text preview:", rawText.substring(0, 500));
      throw new Error("未识别到题目。请确保题目包含题号(1.)和选项(A.)，或者是标准的 Excel 格式。");
    }

    return questions;

  } catch (error) {
    console.error("Local Parse Error:", error);
    throw error;
  }
};
