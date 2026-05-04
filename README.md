# RSVP Book Reader

Un lettore moderno basato sul web per la lettura rapida (Rapid Serial Visual Presentation - RSVP) progettato per documenti PDF. Carica qualsiasi PDF testuale e leggilo a velocità fulminea con pause e ritmi calcolati dinamicamente.

## Funzionalità principali

- **Lettura e Caricamento Locale:** Nessun server richiesto. L'estrazione del testo avviene interamente sul tuo dispositivo utilizzando `pdfjs-dist`. Privacy garantita.
- **Vetrina Libreria Personale:** Collega una cartella locale del tuo PC o seleziona file multipli dal tuo smartphone per creare la tua libreria personale.
- **Indice dei Capitoli Automatico:** Estrae in automatico l'indice nativo del PDF, permettendoti di navigare e saltare direttamente ai capitoli desiderati.
- **Algoritmo di Ritmo Intelligente:** Basato sulla logica di `rsvpnano`, il lettore rallenta in modo dinamico per:
  - Parole lunghe
  - Punteggiatura (virgole, punti, punti esclamativi)
  - Parole complesse (acronimi, caratteri alfanumerici misti)
- **Interfaccia Moderna e Responsive:** Design premium "Glassmorphism" con tema scuro. Pienamente ottimizzato per l'utilizzo su smartphone e tablet.
- **WPM Regolabile:** Modifica istantaneamente la tua velocità di lettura (Parole al Minuto) tramite lo slider nell'interfaccia.
- **Tracciamento dei Progressi:** Barra di scorrimento visiva e salvataggio automatico dei progressi: se chiudi l'app, ricomincerai a leggere esattamente dall'ultima parola visualizzata.

## Guida Rapida

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Avvia il server di sviluppo locale:
   ```bash
   npm run dev
   ```

## Tecnologie Utilizzate
- React & Vite
- PDF.js (`pdfjs-dist`)
- Lucide Icons
- Vanilla CSS (Glassmorphism & Variabili CSS)

