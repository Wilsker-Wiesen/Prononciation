#!/usr/bin/env python3
"""
Erzeugt Vorbild-Aufnahmen mit einer neuronalen Sprachsynthese (läuft in GitHub Actions).

  python3 tools/tts-synth.py --texts texts.json --out ordner --engine piper --model fr_FR-siwis-medium.onnx [--speaker 0]
  python3 tools/tts-synth.py --texts texts.json --out ordner --engine kokoro --voice ff_siwis

Ausgabe: <key>.wav (16 bit, mono) je Text aus texts.json ([{ "key", "text" }]).
"""
import argparse
import json
import os
import wave

ap = argparse.ArgumentParser()
ap.add_argument('--texts', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--engine', choices=['piper', 'kokoro'], required=True)
ap.add_argument('--model')
ap.add_argument('--speaker', type=int)
ap.add_argument('--voice', default='ff_siwis')
# etwas langsamer als normal (für Lernende), 1.0 = Originaltempo
ap.add_argument('--slow', type=float, default=1.1)
args = ap.parse_args()

rows = json.load(open(args.texts, encoding='utf-8'))
os.makedirs(args.out, exist_ok=True)


def write_wav(path, samples_i16, rate):
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(samples_i16)


if args.engine == 'piper':
    from piper import PiperVoice

    voice = PiperVoice.load(args.model)
    for r in rows:
        path = os.path.join(args.out, r['key'] + '.wav')
        with wave.open(path, 'wb') as wf:
            if hasattr(voice, 'synthesize_wav'):  # piper-tts >= 1.3
                from piper import SynthesisConfig

                cfg = SynthesisConfig(length_scale=args.slow, speaker_id=args.speaker)
                voice.synthesize_wav(r['text'], wf, syn_config=cfg)
            else:  # piper-tts 1.2
                voice.synthesize(r['text'], wf, speaker_id=args.speaker, length_scale=args.slow)
        print(r['key'], r['text'])
else:
    import numpy as np
    from kokoro import KPipeline

    pipeline = KPipeline(lang_code='f', repo_id='hexgrad/Kokoro-82M')
    for r in rows:
        parts = [audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio)
                 for _, _, audio in pipeline(r['text'], voice=args.voice, speed=1 / args.slow)]
        pcm = np.concatenate(parts) if parts else np.zeros(2400, dtype=np.float32)
        i16 = (np.clip(pcm, -1, 1) * 32767).astype('<i2').tobytes()
        write_wav(os.path.join(args.out, r['key'] + '.wav'), i16, 24000)
        print(r['key'], r['text'])
