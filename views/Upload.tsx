import React, { useRef } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2, X, FileSpreadsheet, ScanLine, Camera } from 'lucide-react';
import Button from '../components/Button';
import { useQuiz } from '../context/QuizContext';

const Upload: React.FC = () => {
  const { startBackgroundImport, importTasks, removeTask } = useQuiz();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      startBackgroundImport(selectedFile);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <header className="pt-4 pb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">导入题库</h1>
        <p className="text-gray-500 text-sm mt-1">支持 PDF、Excel、以及拍照识别</p>
      </header>

      {/* Hidden Inputs */}
      <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.xlsx,.xls,.csv" 
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
      <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
          <button 
             onClick={() => cameraInputRef.current?.click()}
             className="bg-blue-600 text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
             <div className="bg-white/20 p-3 rounded-full">
                 <Camera size={32} />
             </div>
             <span className="font-bold">拍照搜题</span>
          </button>

          <button 
             onClick={() => fileInputRef.current?.click()}
             className="bg-white border-2 border-dashed border-gray-200 text-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 active:scale-95 transition-transform"
          >
             <div className="bg-gray-100 p-3 rounded-full">
                 <UploadIcon size={32} />
             </div>
             <span className="font-bold">文件上传</span>
          </button>
      </div>
      
      <p className="text-center text-xs text-gray-400 mb-6 shrink-0">
        支持 PDF 文档 / Excel 表格 / 试卷照片
      </p>

      {/* Task List */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 shrink-0">后台任务</h3>
        
        {importTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2">
            <FileText size={40} />
            <p className="text-sm">暂无任务</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
            {importTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between animate-slide-in">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      task.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                      task.status === 'completed' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                  }`}>
                    {task.status === 'processing' && <Loader2 size={20} className="animate-spin" />}
                    {task.status === 'completed' && <CheckCircle size={20} />}
                    {task.status === 'error' && <AlertCircle size={20} />}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate pr-2">{task.fileName}</p>
                    
                    {task.status === 'processing' ? (
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ScanLine size={10} />
                            发现 {task.foundCount || 0} 题
                         </span>
                         <span className="text-xs text-gray-400">处理中...</span>
                       </div>
                    ) : (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {task.status === 'completed' ? `成功导入 ${task.resultCount} 题` :
                           task.status === 'error' ? (task.errorMessage || '解析失败') :
                           task.progressMessage}
                        </p>
                    )}
                  </div>
                </div>

                {task.status !== 'processing' && (
                  <button 
                    onClick={() => removeTask(task.id)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
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
