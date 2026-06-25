import { useState, useCallback } from 'react';

const BASE_URL = 'https://translate.googleapis.com/translate_a/single';

export const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
];

const HINGLISH_MAP: Record<string, string> = {
  'mai': 'मैं', 'mein': 'मैं', 'me': 'मैं', 'hu': 'हूँ', 'ho': 'हो', 'he': 'है', 'hai': 'है',
  'nahi': 'नहीं', 'nahin': 'नहीं', 'na': 'नहीं', 'theek': 'ठीक', 'thik': 'ठीक',
  'kya': 'क्या', 'kaise': 'कैसे', 'kaisa': 'कैसा', 'kahan': 'कहाँ', 'kab': 'कब',
  'aap': 'आप', 'tum': 'तुम', 'tu': 'तू', 'woh': 'वो', 'vo': 'वो', 'yeh': 'ये', 'ye': 'ये',
  'accha': 'अच्छा', 'acha': 'अच्छा', 'acha hai': 'अच्छा है',
  'mera': 'मेरा', 'meri': 'मेरी', 'mere': 'मेरे', 'tera': 'तेरा', 'teri': 'तेरी',
  'sab': 'सब', 'kuch': 'कुछ', 'bahut': 'बहुत', 'bhi': 'भी', 'abhi': 'अभी',
  'kal': 'कल', 'aaj': 'आज', 'ab': 'अब', 'phir': 'फिर', 'fir': 'फिर',
  'bolo': 'बोलो', 'bata': 'बता', 'de': 'दे', 'le': 'ले', 'kar': 'कर',
  'ja': 'जा', 'aa': 'आ', 'khana': 'खाना', 'pani': 'पानी', 'ghar': 'घर',
  'chal': 'चल', 'chalo': 'चलो', 'ruk': 'रुक', 'baith': 'बैठ', 'so': 'सो',
  'acha laga': 'अच्छा लगा', 'theek hai': 'ठीक है', 'kaise ho': 'कैसे हो',
  'kya hai': 'क्या है', 'kya kar': 'क्या कर', 'nahi hai': 'नहीं है',
  'haan': 'हाँ', 'h': 'है', 'ji': 'जी', 'bhai': 'भाई', 'dost': 'दोस्त',
  'pyar': 'प्यार', 'mohabbat': 'मोहब्बat', 'zindagi': 'ज़िंदगी',
  'acha hu': 'अच्छा हूँ', 'badhiya': 'बढ़िया', 'mast': 'मस्त',
};

function looksLikeHinglish(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  let matchCount = 0;
  for (const w of words) {
    if (HINGLISH_MAP[w]) matchCount++;
  }
  return matchCount >= Math.ceil(words.length * 0.4);
}

function hinglishToHindi(text: string): string {
  const words = text.split(/\s+/);
  return words.map(w => {
    const lower = w.toLowerCase();
    return HINGLISH_MAP[lower] || w;
  }).join(' ');
}

interface TranslateResult {
  text: string | null;
  detectedLang?: string;
}

async function callGoogleTranslate(text: string, source: string, target: string): Promise<TranslateResult> {
  const url = `${BASE_URL}?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) return { text: null };
  const data = await res.json();
  if (data && data[0]) {
    return { text: data[0].map((s: any) => s[0]).join(''), detectedLang: data[2] || undefined };
  }
  return { text: null };
}

export function useTranslation() {
  const [targetLanguage, setTargetLanguage] = useState<string>('hi');
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const translateMessage = useCallback(async (text: string, messageId: string, targetLang?: string, sourceLang?: string): Promise<string | null> => {
    const target = targetLang || targetLanguage;
    const source = sourceLang || sourceLanguage;
    if (!text) return null;
    setTranslating(prev => ({ ...prev, [messageId]: true }));
    try {
      let result: string | null = null;
      if (source === 'auto' && looksLikeHinglish(text)) {
        const converted = hinglishToHindi(text);
        const hiResult = await callGoogleTranslate(converted, 'hi', target);
        result = hiResult.text;
      } else {
        const auto = await callGoogleTranslate(text, source, target);
        result = auto.text;
        const detected = auto.detectedLang;
        if (source === 'auto' && result && detected && detected !== target && !['hi','ur','bn','mr','ne','sa','gu','kn','ml','ta','te','pa'].includes(detected) && target === 'hi') {
          const hiRetry = await callGoogleTranslate(text, 'hi', target);
          if (hiRetry.text && hiRetry.text.trim() !== text.trim()) result = hiRetry.text;
        }
      }
      setTranslating(prev => ({ ...prev, [messageId]: false }));
      return result;
    } catch {
      setTranslating(prev => ({ ...prev, [messageId]: false }));
      return null;
    }
  }, [targetLanguage, sourceLanguage]);

  return { targetLanguage, setTargetLanguage, sourceLanguage, setSourceLanguage, translateMessage, translating };
}
