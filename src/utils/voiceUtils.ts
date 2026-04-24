/**
 * Voice classification utilities for English TTS voice selection
 */

export interface VoiceInfo {
  voice: SpeechSynthesisVoice;
  localeRegion: 'US' | 'UK' | 'Other';
  gender: 'male' | 'female' | 'unknown';
  serviceType: 'local' | 'cloud';
  score: number;
}

/**
 * Determine the locale region from voice language code
 */
export function getLocaleRegion(lang: string): 'US' | 'UK' | 'Other' {
  const normalized = lang.toLowerCase().replace('_', '-');
  if (normalized.startsWith('en-us')) return 'US';
  if (normalized.startsWith('en-gb') || normalized.startsWith('en-uk')) return 'UK';
  return 'Other';
}

/**
 * Determine likely gender from voice name using common patterns
 */
export function getGender(name: string): 'male' | 'female' | 'unknown' {
  const lower = name.toLowerCase();
  
  // Female indicators
  const femalePatterns = [
    'samantha', 'karen', 'victoria', 'kate', 'susan', 'moira', 'veena', 
    'tessa', 'alva', 'amy', 'julia', 'sara', 'nancy', 'elizabeth',
    'feminine', 'female', 'woman', 'girl'
  ];
  
  // Male indicators
  const malePatterns = [
    'alex', 'daniel', 'tom', 'david', 'james', 'michael', 'john',
    'steve', 'fred', 'ralph', 'guy', 'josh', 'noah', 'owen',
    'masculine', 'male', 'man', 'boy'
  ];
  
  for (const pattern of femalePatterns) {
    if (lower.includes(pattern)) return 'female';
  }
  
  for (const pattern of malePatterns) {
    if (lower.includes(pattern)) return 'male';
  }
  
  return 'unknown';
}

/**
 * Determine if voice is local (on-device) or cloud-based
 */
export function getServiceType(voice: SpeechSynthesisVoice): 'local' | 'cloud' {
  return voice.localService ? 'local' : 'cloud';
}

/**
 * Score voice using the same algorithm as useSpeechSynthesis
 * (extracted for reuse)
 */
export function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase().replace('_', '-');
  const name = voice.name.toLowerCase();

  if (!lang.startsWith('en')) return -1;

  let score = 0;

  const isExplicitlyNeural =
    name.includes('neural')        ||
    name.includes('premium')       ||
    name.includes('enhanced')      ||
    name.includes('online (natural)');

  if (name.includes('neural'))           score += 50;
  if (name.includes('premium'))          score += 40;
  if (name.includes('enhanced'))         score += 35;
  if (name.includes('online (natural)')) score += 30;
  else if (name.includes('natural'))     score += 15;

  if (lang === 'en-us')                  score += 20;
  else if (lang.startsWith('en'))        score += 10;

  if (!voice.localService) {
    if (isExplicitlyNeural) {
      score += 10;
    } else {
      score += 18;
    }
  } else {
    score += 5;
  }

  if (name.includes('samantha'))              score += 18;
  if (name.includes('ava'))                   score += 18;
  if (name.includes('alex'))                  score += 12;
  if (name.includes('daniel'))                score += 16;
  if (name.includes('karen'))                 score += 14;
  if (name.includes('microsoft aria'))        score += 22;
  if (name.includes('microsoft jenny'))       score += 22;
  if (name.includes('microsoft guy'))         score += 20;
  if (name.includes('google') && lang === 'en-us') score += 18;

  if (name.includes('compact'))              score -= 15;
  if (name.includes('espeak'))               score -= 30;
  if (name.includes('mbrola'))               score -= 30;

  return score;
}

/**
 * Get all English voices with classification
 */
export function getEnglishVoices(): VoiceInfo[] {
  const voices = window.speechSynthesis.getVoices();
  
  return voices
    .filter(v => v.lang.toLowerCase().startsWith('en'))
    .map(voice => ({
      voice,
      localeRegion: getLocaleRegion(voice.lang),
      gender: getGender(voice.name),
      serviceType: getServiceType(voice),
      score: scoreVoice(voice)
    }))
    .sort((a, b) => {
      // Sort: US > UK > Other, then by score descending
      const regionOrder = { 'US': 0, 'UK': 1, 'Other': 2 };
      const regionDiff = regionOrder[a.localeRegion] - regionOrder[b.localeRegion];
      if (regionDiff !== 0) return regionDiff;
      return b.score - a.score;
    });
}

/**
 * Find a voice by name
 */
export function findVoiceByName(voiceName: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.name === voiceName) || null;
}

/**
 * Play a preview of a voice
 */
export function playVoicePreview(voice: SpeechSynthesisVoice, phrase: string = "Hello, this is a voice preview."): void {
  // Cancel any ongoing speech to avoid overlap
  cancelSpeech();
  
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.volume = 1.0;
  utterance.lang = voice.lang;
  window.speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech
 */
export function cancelSpeech(): void {
  window.speechSynthesis.cancel();
}