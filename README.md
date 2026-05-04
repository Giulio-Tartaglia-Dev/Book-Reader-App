# RSVP Book Reader

A modern, web-based Rapid Serial Visual Presentation (RSVP) reader designed for PDF documents. Upload any PDF with text and read it at lightning speed with dynamically calculated pacing delays.

## Features

- **Upload PDFs directly from the browser:** No server required. Text extraction happens entirely on your machine using `pdfjs-dist`.
- **Intelligent Pacing Algorithm:** Based on the `rsvpnano` project, the reader slows down dynamically for:
  - Long words
  - Punctuation (commas, periods, exclamation marks)
  - Complex words (acronyms, mixed alphanumeric characters)
- **Modern UI:** Glassmorphism design with a dark theme and subtle gradients.
- **Adjustable WPM:** Instantly modify your reading speed (Words Per Minute) from the UI slider.
- **Progress Tracking:** Scrubber bar to jump across the book visually.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Technologies Used
- React & Vite
- PDF.js (`pdfjs-dist`)
- Lucide Icons
- Vanilla CSS (Glassmorphism & CSS Variables)
