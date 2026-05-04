export const calculateWordDelay = (word, nextWordStartsLowercase, wpm) => {
  const baseMs = 60000 / wpm;
  if (!word) return baseMs;

  let bonusPercent = 0;
  
  // Length bonus
  const len = word.replace(/[^a-zA-Z0-9]/g, '').length;
  if (len > 6) bonusPercent += (len - 6) * 6;
  if (len > 10) bonusPercent += (len - 10) * 9;
  if (len > 14) bonusPercent += (len - 14) * 12;
  bonusPercent = Math.min(170, bonusPercent); // Max 170%
  
  // Complexity bonus
  let complexityPercent = 0;
  const hasLetters = /[a-zA-Z]/.test(word);
  const hasDigits = /[0-9]/.test(word);
  const isAllCaps = /^[A-Z]+$/.test(word.replace(/[^a-zA-Z]/g, ''));
  
  if (hasLetters && hasDigits) {
    complexityPercent += 22;
  } else if (word.replace(/[^0-9]/g, '').length >= 3) {
    complexityPercent += 10;
  }
  
  if (isAllCaps && len >= 2) {
    complexityPercent += 14;
  }
  complexityPercent = Math.min(85, complexityPercent); // Max 85%
  
  // Punctuation bonus
  let punctPercent = 0;
  const trimmed = word.trim();
  const trailingChar = trimmed.slice(-1);
  
  if (trimmed.endsWith('...')) {
    punctPercent = 110;
  } else if (trailingChar === ',') {
    punctPercent = 45;
  } else if (trailingChar === '-') {
    punctPercent = 60;
  } else if (trailingChar === ';' || trailingChar === ':') {
    punctPercent = 80;
  } else if (trailingChar === '.') {
    // Rough abbreviation check
    if (len <= 4 && nextWordStartsLowercase) {
      punctPercent = 0;
    } else {
      punctPercent = 135;
    }
  } else if (trailingChar === '!' || trailingChar === '?') {
    punctPercent = 150;
  }
  
  const totalBonusMs = baseMs * ((bonusPercent + complexityPercent + punctPercent) / 100);
  return baseMs + totalBonusMs;
};

export const splitTextIntoWords = (text) => {
  // Simple split by whitespace
  // More complex implementations would handle newlines and multiple spaces properly
  return text.trim().split(/\s+/).filter(w => w.length > 0);
};

export const getAnchorIndex = (word) => {
  if (!word) return 0;
  // Standard RSVP anchor calculation
  // Find the optimal center point based on word length
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4; // Max anchor position is usually around index 4 for very long words
};
