import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Plus, X, Image as ImageIcon, Camera, Images, FileUp, Mic, RefreshCcw, Square, Loader2, SlidersHorizontal, Pause } from 'lucide-react';
import { Attachment } from '../types';
import { transcribeAudio } from '../services/gemini';

interface ChatInputProps {
  onSend: (text: string, attachment?: Attachment, isImageGen?: boolean) => void;
  onStop?: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isLoading }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Menu and Camera states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); 
  
  // Image Viewing State
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Image Generation Mode
  const [isImageMode, setIsImageMode] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Refs for Audio Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Camera Stream changes
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (isCameraOpen) {
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          
          if (mounted) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
          if (mounted) setIsCameraOpen(false);
        }
      } else {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, facingMode]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((text.trim() || attachment) && !isLoading) {
      onSend(text, attachment, isImageMode);
      setText('');
      setAttachment(undefined);
      setPreviewUrl(null);
      setFileName(null);
      setIsImageMode(false);
    }
  };

  const handleStop = () => {
      if (onStop) {
          onStop();
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImageOnly: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isImageOnly && !file.type.startsWith('image/')) {
        alert('Vui lòng chọn tệp hình ảnh.');
        if (imageInputRef.current) imageInputRef.current.value = '';
        return;
      }

      const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/');
      const isDocument = file.type === 'application/pdf' || file.type.startsWith('text/');
      const isCodeOrData = ['application/json', 'application/xml', 'application/x-javascript', 'application/ld+json'].includes(file.type);
      const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.html', '.css', '.md', '.txt', '.csv', '.json'];
      const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isMedia && !isDocument && !isCodeOrData && !hasValidExt) {
           alert(`Định dạng tệp không được hỗ trợ.`);
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        let mimeType = file.type;
        if (!mimeType && hasValidExt) { mimeType = 'text/plain'; }

        setAttachment({
          mimeType: mimeType,
          data: base64Data,
          fileName: file.name
        });
        
        if (file.type.startsWith('image/')) {
            setPreviewUrl(result);
            setFileName(null);
        } else {
            setPreviewUrl(null);
            setFileName(file.name);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    setIsMenuOpen(false);
  };

  const openCamera = () => {
    setIsMenuOpen(false);
    setIsCameraOpen(true);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(videoRef.current, 0, 0);
        }
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        setAttachment({ mimeType: 'image/jpeg', data: base64, fileName: 'camera_capture.jpg' });
        setPreviewUrl(dataUrl);
        setFileName(null);
        closeCamera();
    }
  };

  const handleGenerateImageClick = () => {
      setIsImageMode(true);
      setIsMenuOpen(false);
      setIsToolsOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const clearAttachment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachment(undefined);
    setPreviewUrl(null);
    setFileName(null);
  };

  const handlePreviewClick = () => {
      if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
      if (previewUrl) { setViewingImage(previewUrl); }
  };

  // --- OpenAI Voice Logic (MediaRecorder) ---
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        
        // Ignore very small files (accidental clicks)
        if (audioBlob.size < 1500) { 
            setIsRecording(false);
            return;
        }

        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập microphone. Vui lòng cấp quyền.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true); // Show loading state
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
        const response = await transcribeAudio(audioBlob);
        const transcribedText = response.text?.trim();
        
        // Logic to abort if silence/no speech
        if (!transcribedText || transcribedText === '[[NO_SPEECH]]') {
            // Silently fail/abort as requested ("tự động ngắt")
        } else {
            setText(prev => {
                const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                return prev + spacer + transcribedText;
            });
        }
    } catch (error) {
        console.error("Transcription error:", error);
    } finally {
        setIsTranscribing(false);
    }
  };


  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      
      {/* Lightbox */}
      {viewingImage && createPortal(
        <div 
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setViewingImage(null)}
        >
            <button 
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
            >
                <X size={24} />
            </button>
            <img 
                src={viewingImage} 
                alt="Full preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>,
        document.body
      )}

      {/* Camera Modal */}
      {isCameraOpen && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full h-full flex flex-col">
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className={`max-w-full max-h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
                    />
                </div>
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start pointer-events-auto">
                        <button 
                            onClick={closeCamera}
                            className="text-white bg-black/40 hover:bg-black/60 p-3 rounded-full backdrop-blur-md transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex justify-between items-center w-full max-w-sm mx-auto pointer-events-auto pb-8">
                         <button 
                            onClick={toggleCameraFacing}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all active:scale-95"
                            title="Đổi camera"
                        >
                            <RefreshCcw size={24} />
                        </button>
                        <button 
                            onClick={capturePhoto}
                            className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center hover:scale-105 transition-transform active:scale-95 bg-transparent shadow-lg"
                        >
                             <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                         <div className="w-12"></div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* MAIN INPUT */}
      <div className={`relative bg-white rounded-[26px] p-4 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border ${isRecording ? 'border-red-400 ring-2 ring-red-100' : (isImageMode ? 'border-purple-200 shadow-purple-50' : 'border-slate-200/60')} flex flex-col gap-2`}>
        
        <input 
          type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, false)} 
          accept="image/*,audio/*,video/*,application/pdf,text/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css" className="hidden" 
        />
         <input type="file" ref={imageInputRef} onChange={(e) => handleFileSelect(e, true)} accept="image/*" className="hidden" />

        {/* Attachment Preview (Inside the bubble, above text) */}
        {(previewUrl || fileName) && (
            <div className="relative inline-block self-start mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {previewUrl ? (
                <div 
                className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm w-20 h-20 group cursor-zoom-in"
                onClick={handlePreviewClick}
                >
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
            ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm w-auto h-12 flex items-center px-4 gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <FileUp size={16} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{fileName}</span>
                </div>
            )}
            <button 
                onClick={clearAttachment}
                className="absolute -top-2 -right-2 bg-white text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 shadow-sm rounded-full p-1 transition-all z-10 transform hover:scale-110"
                title="Xóa tệp"
            >
                <X size={12} strokeWidth={2.5} />
            </button>
            </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording 
                ? "Đang ghi âm... (Ấn dừng để chuyển văn bản)" 
                : isTranscribing 
                    ? "Đang chuyển đổi giọng nói..." 
                    : (isImageMode ? "Mô tả hình ảnh bạn muốn tạo..." : "Hỏi k-ite")
          }
          className="w-full bg-transparent border-none outline-none focus:outline-none text-slate-800 placeholder:text-slate-400 focus:ring-0 resize-none px-2 max-h-[120px] overflow-y-auto leading-relaxed text-lg min-h-[28px]"
          style={{ fontFamily: 'Arial, sans-serif' }}
          rows={1}
          disabled={isLoading || isTranscribing}
        />

        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
                {/* 1. Standard Plus Menu (Always Visible) */}
                <div className="relative" ref={menuRef}>
                    <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                        isMenuOpen ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    disabled={isLoading}
                    >
                        <Plus size={20} strokeWidth={2} />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-3 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200 origin-bottom-left">
                            <div className="space-y-1">
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-900 group-hover:scale-110 transition-transform"><ImageIcon size={20} /></div>
                                    <span className="font-semibold text-sm text-slate-900">Tải ảnh lên</span>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-900 group-hover:scale-110 transition-transform"><FileUp size={20} /></div>
                                    <span className="font-semibold text-sm text-slate-900">Tải tệp lên</span>
                                </button>
                                {/* Hidden on desktop (md:hidden) */}
                                <button
                                    onClick={openCamera}
                                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group md:hidden"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-900 group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                                    <span className="font-semibold text-sm text-slate-900">Chụp ảnh</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Toggle: Image Mode Active (Purple Pill with Icons) VS Tools Menu (Sliders) */}
                {isImageMode ? (
                    <button
                        onClick={() => setIsImageMode(false)}
                        className="flex-shrink-0 h-9 px-3 flex items-center justify-center gap-1.5 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all duration-200 animate-in zoom-in"
                        title="Tắt chế độ tạo ảnh"
                    >
                        <Images size={18} strokeWidth={2} />
                        <X size={16} strokeWidth={2.5} />
                    </button>
                ) : (
                    <div className="relative" ref={toolsRef}>
                        <button
                            onClick={() => setIsToolsOpen(!isToolsOpen)}
                            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                                isToolsOpen ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            disabled={isLoading}
                            title="Công cụ sáng tạo"
                        >
                            <SlidersHorizontal size={20} strokeWidth={2} />
                        </button>

                        {isToolsOpen && (
                            <div className="absolute bottom-full left-0 mb-3 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200 origin-bottom-left">
                                <div className="space-y-1">
                                    <button
                                        onClick={handleGenerateImageClick}
                                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-900 group-hover:scale-110 transition-transform"><Images size={20} /></div>
                                        <span className="font-semibold text-sm text-slate-900">Tạo hình ảnh</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                 <button
                    onClick={toggleRecording}
                    disabled={isLoading || isTranscribing}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                        isRecording 
                        ? 'bg-red-500 text-white shadow-md animate-pulse' 
                        : isTranscribing
                            ? 'bg-blue-100 text-blue-500 cursor-wait'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Nhập bằng giọng nói"}
                 >
                    {isRecording ? (
                        <Square size={16} fill="currentColor" />
                    ) : isTranscribing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <Mic size={20} strokeWidth={2} />
                    )}
                 </button>

                {/* Send Button Logic: Changes to Stop button when loading */}
                {isLoading ? (
                    <button
                        onClick={handleStop}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                        title="Dừng tạo"
                    >
                         <div className="relative flex items-center justify-center">
                            {/* YouTube-like Pause Icon (Two bars) */}
                            <Pause size={20} strokeWidth={2.5} fill="currentColor" className="text-white" />
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={handleSend}
                        disabled={(!text.trim() && !attachment) || isTranscribing}
                        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                            (text.trim() || attachment) && !isTranscribing
                            ? isImageMode ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-md' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        <ArrowUp size={20} strokeWidth={2.5} />
                    </button>
                )}
            </div>
        </div>
      </div>
      <div className="text-center py-2">
        <p className="text-[11px] text-slate-400 font-medium">k-ite có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.</p>
      </div>
    </div>
  );
};