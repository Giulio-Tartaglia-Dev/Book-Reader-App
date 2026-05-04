import { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Play, Pause, RotateCcw, Upload, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { calculateWordDelay, splitTextIntoWords, getAnchorIndex } from './lib/rsvpLogic';

// Use local worker URL through Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function App() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  
  const timerRef = useRef(null);
  const wordsRef = useRef(words);
  const indexRef = useRef(currentIndex);
  const wpmRef = useRef(wpm);
  const isPlayingRef = useRef(isPlaying);

  // Sync refs
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const readNextWord = useCallback(function doRead() {
    if (!isPlayingRef.current) return;
    
    if (indexRef.current >= wordsRef.current.length) {
      setIsPlaying(false);
      return;
    }

    const currentWord = wordsRef.current[indexRef.current];
    const nextWord = wordsRef.current[indexRef.current + 1];
    
    let nextStartsLower = false;
    if (nextWord) {
      const firstChar = nextWord.replace(/[^a-zA-Z]/g, '')[0];
      if (firstChar && firstChar === firstChar.toLowerCase()) {
        nextStartsLower = true;
      }
    }

    const delay = calculateWordDelay(currentWord, nextStartsLower, wpmRef.current);
    
    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      doRead();
    }, delay);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      readNextWord();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, readNextWord]);

  // Save progress to localStorage whenever currentIndex changes
  useEffect(() => {
    if (fileName && words.length > 0) {
      localStorage.setItem(`rsvp-progress-${fileName}`, currentIndex);
    }
  }, [currentIndex, fileName, words.length]);

  const extractTextFromPDF = async (file) => {
    setIsProcessing(true);
    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ 
        data: uint8Array,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
      }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      const parsedWords = splitTextIntoWords(fullText);
      
      if (parsedWords.length === 0) {
        throw new Error("No readable text found in this PDF. It might be a scanned document without OCR.");
      }
      
      setWords(parsedWords);
      
      const savedProgress = localStorage.getItem(`rsvp-progress-${file.name}`);
      if (savedProgress !== null) {
        const parsedProgress = parseInt(savedProgress, 10);
        if (!isNaN(parsedProgress) && parsedProgress >= 0 && parsedProgress < parsedWords.length) {
          setCurrentIndex(parsedProgress);
        } else {
          setCurrentIndex(0);
        }
      } else {
        setCurrentIndex(0);
      }
      
      setIsPlaying(false);
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      alert("Failed to read PDF file. Error details: " + (error.message || error.toString()));
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        extractTextFromPDF(file);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const togglePlay = () => {
    if (words.length > 0) {
      if (currentIndex >= words.length) {
        setCurrentIndex(0);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderCurrentWord = () => {
    if (words.length === 0) return <div>Ready to read</div>;
    if (currentIndex >= words.length) return <div>Book Finished</div>;
    
    const word = words[currentIndex];
    const anchorIdx = getAnchorIndex(word);
    
    const leftPart = word.substring(0, anchorIdx);
    const anchorPart = word.charAt(anchorIdx);
    const rightPart = word.substring(anchorIdx + 1);

    return (
      <div className="word-container">
        <div className="anchor-guide"></div>
        <div className="word-part-left">{leftPart}</div>
        <div className="word-part-anchor">{anchorPart}</div>
        <div className="word-part-right">{rightPart}</div>
      </div>
    );
  };

  const handleProgressClick = (e) => {
    if (words.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newIndex = Math.floor(percentage * words.length);
    setCurrentIndex(Math.max(0, Math.min(newIndex, words.length - 1)));
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div className="app-container">
      <div className="header">
        <h1>RSVP Book Reader</h1>
        <p style={{color: 'var(--text-muted)'}}>Read faster with Rapid Serial Visual Presentation</p>
      </div>

      {!words.length ? (
        <div {...getRootProps()} className={`upload-area ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {isProcessing ? (
             <div className="loading-spinner"></div>
          ) : (
            <>
              <Upload size={48} color="var(--accent)" />
              <div style={{fontSize: '1.25rem', fontWeight: 500}}>
                {isDragActive ? "Drop the PDF here" : "Drag & drop a PDF book here"}
              </div>
              <p style={{color: 'var(--text-muted)'}}>or click to select file</p>
            </>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)'}}>
            <FileText size={18} />
            <span style={{fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{fileName}</span>
          </div>

          <div className="reader-container">
            <div className="rsvp-display" onClick={togglePlay} style={{cursor: 'pointer'}}>
              {renderCurrentWord()}
            </div>
            
            <div className="progress-wrapper">
              <div className="progress-bar-container" onClick={handleProgressClick}>
                <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="progress-text">
                Word {Math.min(currentIndex + 1, words.length)} of {words.length} ({Math.round(progressPercent)}%)
              </div>
            </div>

            <div className="controls">
              <button 
                className="btn btn-secondary" 
                onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                title="Restart"
              >
                <RotateCcw size={20} />
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={togglePlay}
                style={{width: '120px'}}
              >
                {isPlaying ? (
                  <><Pause size={20} /> Pause</>
                ) : (
                  <><Play size={20} /> Play</>
                )}
              </button>
              
              <div className="wpm-control">
                <span style={{fontWeight: 500}}>{wpm} WPM</span>
                <input 
                  type="range" 
                  min="100" 
                  max="1000" 
                  step="25" 
                  value={wpm} 
                  onChange={(e) => setWpm(parseInt(e.target.value))} 
                />
              </div>

              <button 
                 className="btn btn-secondary"
                 onClick={() => { setIsPlaying(false); setWords([]); }}
                 style={{marginLeft: 'auto'}}
              >
                Upload New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
