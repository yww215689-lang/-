
import React, { useRef, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2, X, ScanLine, Camera, Cpu, FolderOpen, Save, Layers, StopCircle } from 'lucide-react';
import { useQuiz } from '../context/QuizContext';
import { SUBJECTS } from '../constants';

type UploadMode = 'QUESTIONS' | 'PDF_STORE';

const Upload: React.FC = () => {
  const { startBackgroundImport, storePdf, importTasks, removeTask, activeSubject } = useQuiz();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadMode, setUploadMode] = useState<UploadMode>('QUESTIONS');
  const [selectedUploadSubject, setSelectedUploadSubject] = useState<string>(activeSubject || SUBJECTS.PRACTICE);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      let invalidCount = 0;

      fileArray.forEach((item) => {
         const selectedFile = item as File;
         if (uploadMode === 'QUESTIONS') {
            startBackgroundImport(selectedFile, selectedUploadSubject);
         } else {
            // Check if it's actually a PDF
            if (selectedFile.type !== 'application/pdf') {
                invalidCount++;
            } else {
                storePdf(selectedFile, selectedUploadSubject);
            }
         }
      });

      if (invalidCount > 0 && uploadMode === 'PDF_STORE') {
          alert(`忽略了 ${invalidCount} 个非 PDF 文件。资料库仅支持 PDF。`);
      }

      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="p-5 h-full flex flex-col overflow-hidden">
      <header className="pt-8 pb-4 shrink-0">
        <h1 className="text-2xl font-black text-slate-900">
            导入中心
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">识别题目或存储复习资料</p>
      </header>

      {/* Mode Switcher */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-6 shrink-0">
          <button
             onClick={() => setUploadMode('QUESTIONS')}
             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                 uploadMode === 'QUESTIONS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
             }`}
          >
             <ScanLine size={14} /> 导入题库
          </button>
          <button
             onClick={() => setUploadMode('PDF_STORE')}
             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                 uploadMode === 'PDF_STORE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
             }`}
          >
             <Save size={14} /> 存储资料
          </button>
      </div>

      {/* Subject Selector */}
      <div className="mb-6 shrink-0">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2 block">
              {uploadMode === 'QUESTIONS' ? '导入到哪个科目？' : '存储到哪个分类？'}
          </label>
          <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
              {Object.values(SUBJECTS).map(subject => (
                  <button
                    key={subject}
                    onClick={() => setSelectedUploadSubject(subject)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                        selectedUploadSubject === subject 
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                      {subject}
                      {selectedUploadSubject === subject && <CheckCircle size={16} />}
                  </button>
              ))}
          </div>
      </div>

      {/* Hidden Inputs */}
      <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple
          accept={uploadMode === 'QUESTIONS' 
            ? "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-excel,.xls,text/csv,.csv,image/*" 
            : "application/pdf,.pdf"} 
          className="hidden" 
      />
      <input 
          type="file" 
          ref={cameraInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
      />

      {/* Actions */}
      <div className={`grid ${uploadMode === 'QUESTIONS' ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6 shrink-0`}>
          {uploadMode === 'QUESTIONS' && (
            <button 
                onClick={() => cameraInputRef.current?.click()}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg shadow-blue-200 active:scale-95 transition-transform relative overflow-hidden group"
            >
                <div className="bg-white/20 p-3.5 rounded-full backdrop-blur-sm">
                    <Camera size={28} />
                </div>
                <span className="font-bold text-sm tracking-wide">拍照搜题</span>
            </button>
          )}

          <button 
             onClick={() => fileInputRef.current?.click()}
             className={`bg-white border border-slate-200 text-slate-600 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-indigo-200 hover:text-indigo-600 active:scale-95 transition-all ${uploadMode === 'PDF_STORE' ? 'border-dashed border-2' : ''}`}
          >
             <div className="bg-slate-50 p-3.5 rounded-full group-hover:bg-indigo-50 transition-colors">
                 <FolderOpen size={28} />
             </div>
             <span className="font-bold text-sm tracking-wide">
                 {uploadMode === 'QUESTIONS' ? '批量选择文件导入' : '批量选择 PDF 文件存储'}
             </span>
             {uploadMode === 'QUESTIONS' && <span className="text-[10px] text-slate-400 -mt-1">支持 PDF/Excel/图片</span>}
          </button>
      </div>
      
      {/* Task List */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0 px-1">任务队列</h3>
        
        {importTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-3xl m-1">
            <Layers size={32} />
            <p className="text-xs font-medium">暂无进行中的任务</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 no-scrollbar">
            {importTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between animate-slide-in">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      task.status === 'processing' ? 'bg-indigo-50 text-indigo-600' :
                      task.status === 'completed' ? 'bg-green-50 text-green-600' :
                      'bg-red-50 text-red-600'
                  }`}>
                    {task.status === 'processing' && <Loader2 size={20} className="animate-spin" />}
                    {task.status === 'completed' && <CheckCircle size={20} />}
                    {task.status === 'error' && <AlertCircle size={20} />}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm truncate">{task.fileName}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border truncate max-w-[80px] ${
                            task.type === 'pdf_storage' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {task.type === 'pdf_storage' ? '资料' : '题库'}
                        </span>
                    </div>
                    
                    {task.status === 'processing' ? (
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                            处理中
                         </span>
                         <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{task.progressMessage}</span>
                       </div>
                    ) : (
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">
                          {task.status === 'completed' ? (task.type === 'pdf_storage' ? '已存入资料库' : `导入 ${task.resultCount} 题`) :
                           task.status === 'error' ? (task.errorMessage || '失败') :
                           task.progressMessage}
                        </p>
                    )}
                  </div>
                </div>

                {task.status === 'processing' ? (
                    <button 
                      onClick={() => removeTask(task.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-2 active:scale-95"
                    >
                      <StopCircle size={14} />
                      取消
                    </button>
                ) : (
                    <button 
                      onClick={() => removeTask(task.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors ml-2 active:scale-95"
                    >
                      <X size={18} />
                    </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
