import { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Play, Pause, RotateCcw, Upload, FileText, FolderOpen, Library, ArrowLeft, Book } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { calculateWordDelay, splitTextIntoWords, getAnchorIndex } from './lib/rsvpLogic';

// Use local worker URL through Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function App() {
  const [viewMode, setViewMode] = useState('home'); // 'home' | 'library' | 'reader'
  const [libraryFiles, setLibraryFiles] = useState([]);
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
      setViewMode('reader');
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

  const handleSelectFolder = async () => {
    try {
      // Show directory picker
      const dirHandle = await window.showDirectoryPicker();
      const pdfFiles = [];
      
      // Iterate over files in the directory
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          const file = await entry.getFile();
          pdfFiles.push(file);
        }
      }
      
      setLibraryFiles(pdfFiles);
      setViewMode('library');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error reading directory:", err);
        alert("Errore nell'apertura della cartella: " + err.message);
      }
    }
  };

  const handleSelectBookFromLibrary = (file) => {
    extractTextFromPDF(file);
  };

  const goBackToLibrary = () => {
    setIsPlaying(false);
    setWords([]); // clear memory
    setViewMode('library');
  };

  const goBackToHome = () => {
    setIsPlaying(false);
    setWords([]);
    setLibraryFiles([]);
    setViewMode('home');
  };

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

      {viewMode === 'home' && (
        <div className="home-screen">
          <div {...getRootProps()} className={`upload-area ${isDragActive ? 'active' : ''}`} style={{marginBottom: '1rem'}}>
            <input {...getInputProps()} />
            {isProcessing ? (
               <div className="loading-spinner"></div>
            ) : (
              <>
                <Upload size={48} color="var(--accent)" />
                <div style={{fontSize: '1.25rem', fontWeight: 500}}>
                  {isDragActive ? "Rilascia il PDF qui" : "Trascina qui un singolo PDF"}
                </div>
                <p style={{color: 'var(--text-muted)'}}>oppure clicca per selezionarlo</p>
              </>
            )}
          </div>

          {!isProcessing && (
            <>
              <div className="divider"><span>OPPURE</span></div>

              <button 
                className="btn btn-primary" 
                onClick={handleSelectFolder} 
                style={{width: '100%', padding: '1.5rem', fontSize: '1.2rem', borderRadius: '16px'}}
              >
                <FolderOpen size={28} />
                Collega la tua libreria
              </button>
              <p style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.85rem'}}>
                Seleziona una cartella locale per creare la tua vetrina personale
              </p>
            </>
          )}
        </div>
      )}

      {viewMode === 'library' && (
        <div className="library-screen glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem'}}>
            <h2 style={{display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0}}>
              <Library size={28} color="var(--accent)" /> La tua vetrina
            </h2>
            <button className="btn btn-secondary" onClick={goBackToHome} style={{padding: '0.5rem 1rem'}}>
               <ArrowLeft size={18} /> Chiudi
            </button>
          </div>

          {libraryFiles.length === 0 ? (
            <div style={{textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)'}}>
              <FolderOpen size={64} style={{opacity: 0.3, marginBottom: '1.5rem'}} />
              <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)'}}>Nessun PDF trovato</h3>
              <p>Non è presente nessun file PDF in questa cartella. Aggiungine qualcuno per visualizzarli qui.</p>
            </div>
          ) : (
            <div className="library-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem'}}>
              {libraryFiles.map((file, idx) => {
                const savedProgress = localStorage.getItem(`rsvp-progress-${file.name}`);
                
                return (
                  <div key={idx} className="book-card" onClick={() => handleSelectBookFromLibrary(file)} style={{
                     padding: '1.5rem 1rem', 
                     background: 'rgba(255,255,255,0.03)', 
                     borderRadius: '16px', 
                     cursor: 'pointer', 
                     display: 'flex', 
                     flexDirection: 'column', 
                     alignItems: 'center',
                     transition: 'all 0.2s ease', 
                     border: '1px solid rgba(255,255,255,0.05)',
                     position: 'relative'
                  }}>
                    <Book size={56} color="var(--accent)" style={{marginBottom: '1rem'}} />
                    <div style={{
                       fontWeight: 500, 
                       textAlign: 'center', 
                       fontSize: '0.95rem', 
                       lineHeight: '1.4',
                       display: '-webkit-box', 
                       WebkitLineClamp: 3, 
                       WebkitBoxOrient: 'vertical',
                       overflow: 'hidden'
                    }}>
                      {file.name.replace('.pdf', '')}
                    </div>
                    {savedProgress && (
                      <div className="progress-badge" style={{
                         fontSize: '0.7rem', 
                         padding: '0.2rem 0.6rem', 
                         background: 'var(--accent)', 
                         color: 'white', 
                         borderRadius: '1rem', 
                         marginTop: '1rem',
                         fontWeight: 600,
                         letterSpacing: '0.5px',
                         textTransform: 'uppercase'
                      }}>In corso</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'reader' && (
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)'}}>
            <button 
              className="btn" 
              onClick={libraryFiles.length > 0 ? goBackToLibrary : goBackToHome} 
              title="Torna indietro" 
              style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem', marginRight: '0.5rem'}}
            >
               <ArrowLeft size={20} />
            </button>
            <FileText size={18} color="var(--accent)" />
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
                Parola {Math.min(currentIndex + 1, words.length)} di {words.length} ({Math.round(progressPercent)}%)
              </div>
            </div>

            <div className="controls">
              <button 
                className="btn btn-secondary" 
                onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                title="Ricomincia"
              >
                <RotateCcw size={20} />
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={togglePlay}
                style={{width: '120px'}}
              >
                {isPlaying ? (
                  <><Pause size={20} /> Pausa</>
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
                 onClick={libraryFiles.length > 0 ? goBackToLibrary : goBackToHome}
                 style={{marginLeft: 'auto'}}
              >
                {libraryFiles.length > 0 ? 'Libreria' : 'Nuovo PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
