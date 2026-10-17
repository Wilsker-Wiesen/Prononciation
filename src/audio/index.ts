/** Browser-Audioschicht: Aufnahme, Wiedergabe, Resampling, WAV, Pegel, Sprachausgabe. */
export { Recorder, RecorderError } from './recorder';
export type { RecorderOptions, Recording, RecorderErrorCode } from './recorder';
export { resampleTo, decodeAudioFile, mixToMono } from './resample';
export type { DecodedAudio } from './resample';
export { encodeWav, encodeWavBuffer, decodeWav, isWav } from './wav';
export { player } from './player';
export type { PlayOptions } from './player';
export { ttsAvailable, frenchVoices, loadVoices, speakFrench, cancelSpeech } from './tts';
export { waveformPeaks, rms, rmsDb } from './levels';
export { getAudioContextCtor, hasWebAudio } from './audioContext';
