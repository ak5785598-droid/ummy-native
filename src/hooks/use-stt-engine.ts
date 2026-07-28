/**
 * Unified STT Engine — Single Voice instance shared by AI Listen & Voice Captions.
 *
 * PROBLEM SOLVED:
 *  1. Both AI Listen and Voice Captions were creating their own Voice.start()
 *     and overwriting each other's onSpeechResults callback → both broke.
 *  2. Agora SDK holds the mic exclusively on some Android devices,
 *     so we retry with exponential backoff and surface errors to user.
 *
 * DESIGN:
 *  - One singleton controls @react-native-voice/voice.
 *  - Multiple consumers subscribe via `onTranscript` callbacks.
 *  - Ref-based callbacks avoid stale closure issues.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// ── Load Voice module once at module scope ─────────────────────────────────
let Voice: any = null;
try {
  const mod = require('@react-native-voice/voice');
  Voice = mod.default || mod;
} catch {}

// ── Module-level singleton state ───────────────────────────────────────────
type TranscriptCallback = (text: string) => void;

let _isRunning = false;
let _subscribers: Set<TranscriptCallback> = new Set();
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _restartTimer: ReturnType<typeof setTimeout> | null = null;
let _consecutiveErrors = 0;

// Web fallback ref
let _webRecognition: any = null;

function _clearTimers() {
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
  if (_restartTimer) { clearTimeout(_restartTimer); _restartTimer = null; }
}

function _broadcast(text: string) {
  _subscribers.forEach(cb => {
    try { cb(text); } catch {}
  });
}

// ── Native STT start/stop ──────────────────────────────────────────────────
async function _startNative(): Promise<boolean> {
  if (!Voice) return false;
  try {
    // Request permission on Android
    if (Platform.OS === 'android') {
      const perm = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (perm !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[STT-ENGINE] RECORD_AUDIO permission denied');
        return false;
      }
    }

    // Wire callbacks (singleton — only we set these)
    Voice.onSpeechResults = (e: any) => {
      const transcript = e.value?.[0];
      if (transcript) {
        _consecutiveErrors = 0;
        _broadcast(transcript);
      }
      // Continuous mode: restart after result
      _restartTimer = setTimeout(() => {
        if (_isRunning && _subscribers.size > 0) {
          try { Voice.start('hi-IN'); } catch {}
        }
      }, 600);
    };

    Voice.onSpeechError = (err: any) => {
      _consecutiveErrors++;
      const code = err?.error?.code || err?.error || '';
      console.log(`[STT-ENGINE] Speech error #${_consecutiveErrors}:`, code);

      // error code 7 = "No match" — harmless, just restart
      // error code 5 = "Client side error" — mic busy (Agora conflict)
      // error code 9 = "Insufficient permissions"
      if (_consecutiveErrors >= 8) {
        console.log('[STT-ENGINE] Too many errors, stopping STT');
        _stopAll();
        return;
      }

      // Exponential backoff retry
      const delay = Math.min(1000 * Math.pow(1.5, _consecutiveErrors - 1), 5000);
      _retryTimer = setTimeout(() => {
        if (_isRunning && _subscribers.size > 0) {
          try { Voice.start('hi-IN'); } catch {}
        }
      }, delay);
    };

    Voice.onSpeechEnd = () => {
      // Speech ended naturally — restart to keep listening
      _restartTimer = setTimeout(() => {
        if (_isRunning && _subscribers.size > 0) {
          try { Voice.start('hi-IN'); } catch {}
        }
      }, 400);
    };

    await Voice.start('hi-IN');
    _isRunning = true;
    _consecutiveErrors = 0;
    console.log('[STT-ENGINE] Native STT started');
    return true;
  } catch (err: any) {
    console.log('[STT-ENGINE] Native STT failed to start:', err?.message || err);
    return false;
  }
}

// ── Web SpeechRecognition fallback ─────────────────────────────────────────
function _startWeb(): boolean {
  if (typeof window === 'undefined') return false;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return false;
  try {
    const recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          if (transcript) _broadcast(transcript);
        }
      }
    };
    recognition.onerror = () => {
      _retryTimer = setTimeout(() => {
        if (_isRunning && _subscribers.size > 0) _startWeb();
      }, 1000);
    };
    recognition.onend = () => {
      _restartTimer = setTimeout(() => {
        if (_isRunning && _subscribers.size > 0) _startWeb();
      }, 300);
    };
    recognition.start();
    _webRecognition = recognition;
    _isRunning = true;
    console.log('[STT-ENGINE] Web STT started');
    return true;
  } catch { return false; }
}

// ── Stop everything ────────────────────────────────────────────────────────
function _stopAll() {
  _isRunning = false;
  _clearTimers();
  _consecutiveErrors = 0;

  // Stop native
  if (Voice) {
    try { Voice.stop?.(); } catch {}
    try { Voice.destroy?.()?.catch?.(() => {}); } catch {}
  }

  // Stop web
  if (_webRecognition) {
    try { _webRecognition.stop(); } catch {}
    _webRecognition = null;
  }
}

// ── Start the shared engine (called when first subscriber joins) ───────────
async function _ensureStarted() {
  if (_isRunning) return;
  if (_subscribers.size === 0) return;

  // Try native first, then web fallback
  const nativeOk = await _startNative();
  if (!nativeOk) {
    const webOk = _startWeb();
    if (!webOk) {
      console.log('[STT-ENGINE] No STT engine available');
    }
  }
}

// ── Stop if no more subscribers ────────────────────────────────────────────
function _ensureStopped() {
  if (_subscribers.size === 0 && _isRunning) {
    _stopAll();
  }
}

// ── Public: subscribe / unsubscribe ────────────────────────────────────────
function subscribe(cb: TranscriptCallback) {
  _subscribers.add(cb);
  _ensureStarted();
}

function unsubscribe(cb: TranscriptCallback) {
  _subscribers.delete(cb);
  _ensureStopped();
}

function isAvailable(): boolean {
  return !!Voice || (typeof window !== 'undefined' && !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  ));
}

// ══════════════════════════════════════════════════════════════════════════════
// React Hook — useSTTEngine
// ══════════════════════════════════════════════════════════════════════════════
export function useSTTEngine(
  enabled: boolean,
  onTranscript: (text: string) => void,
) {
  // Use ref so the subscription callback is always fresh (no stale closure)
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  const [sttAvailable] = useState(() => isAvailable());

  // Stable wrapper that reads from ref
  const stableCallback = useCallback((text: string) => {
    callbackRef.current(text);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    subscribe(stableCallback);
    return () => { unsubscribe(stableCallback); };
  }, [enabled, stableCallback]);

  return { sttAvailable, isRunning: _isRunning };
}
