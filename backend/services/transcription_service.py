"""
Whisper transcription service.
Converts audio to a timestamped transcript using OpenAI Whisper (local).

Produces segment-level timestamps that the highlight detector uses
to map AI-selected moments back to exact video timecodes.
"""

import logging
import os
import time
from dataclasses import dataclass, field
from typing import List, Optional, Callable, Dict, Any

logger = logging.getLogger("clipwise.transcription")

try:
    import whisper
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

try:
    import faster_whisper
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False


# ─── Data Models ─────────────────────────────────────────────────

@dataclass
class TranscriptSegment:
    """A single timestamped segment of the transcript."""
    id: int
    start: float          # Start time in seconds
    end: float            # End time in seconds
    text: str             # Transcribed text for this segment
    avg_logprob: float = 0.0   # Confidence indicator (more negative = less confident)
    no_speech_prob: float = 0.0  # Probability this is silence

    @property
    def duration(self) -> float:
        return self.end - self.start

    @property
    def is_speech(self) -> bool:
        """True if this segment likely contains real speech."""
        return self.no_speech_prob < 0.6 and len(self.text.strip()) > 2

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "text": self.text.strip(),
            "avgLogprob": round(self.avg_logprob, 4),
            "noSpeechProb": round(self.no_speech_prob, 4),
        }


@dataclass
class TranscriptionResult:
    """Full transcription output including all segments and metadata."""
    segments: List[TranscriptSegment] = field(default_factory=list)
    language: str = "en"
    full_text: str = ""
    duration: float = 0.0
    model_used: str = ""

    @property
    def speech_segments(self) -> List[TranscriptSegment]:
        """Only segments that contain real speech."""
        return [s for s in self.segments if s.is_speech]

    def get_text_for_window(self, start: float, end: float) -> str:
        """Returns all transcript text within a time window."""
        parts = []
        for seg in self.segments:
            # Overlap: segment overlaps with the window
            if seg.end > start and seg.start < end:
                parts.append(seg.text.strip())
        return " ".join(parts)

    def get_segments_for_window(
        self, start: float, end: float
    ) -> List[TranscriptSegment]:
        """Returns all segments that overlap with a time window."""
        return [
            seg for seg in self.segments
            if seg.end > start and seg.start < end
        ]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "language": self.language,
            "fullText": self.full_text,
            "duration": round(self.duration, 2),
            "modelUsed": self.model_used,
            "segmentCount": len(self.segments),
            "speechSegmentCount": len(self.speech_segments),
            "segments": [s.to_dict() for s in self.segments],
        }


# ─── Service ─────────────────────────────────────────────────────

class TranscriptionService:
    """
    Transcribes audio files using locally-running Whisper.

    Tries faster-whisper first (much faster, same accuracy),
    falls back to openai-whisper if not available.
    """

    def __init__(self):
        self._whisper_model = None
        self._faster_model = None
        self._loaded_model_name = None

    @property
    def is_available(self) -> bool:
        return HAS_WHISPER or HAS_FASTER_WHISPER

    @property
    def backend(self) -> str:
        if HAS_FASTER_WHISPER:
            return "faster-whisper"
        if HAS_WHISPER:
            return "openai-whisper"
        return "unavailable"

    def transcribe(
        self,
        audio_path: str,
        model_name: str = "base",
        language: Optional[str] = None,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> TranscriptionResult:
        """
        Transcribes the audio file and returns a timestamped result.

        Args:
            audio_path:  Path to the WAV file.
            model_name:  Whisper model size: tiny/base/small/medium/large.
            language:    Force language (e.g. "en"). None = auto-detect.
            on_progress: Optional callback(percent, message).

        Returns:
            TranscriptionResult with full segment list.

        Raises:
            RuntimeError: If neither whisper backend is installed.
            FileNotFoundError: If audio_path does not exist.
        """
        if not self.is_available:
            raise RuntimeError(
                "No Whisper backend available. Install faster-whisper or openai-whisper:\n"
                "  pip install faster-whisper\n"
                "  # or\n"
                "  pip install openai-whisper"
            )

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info(
            f"Starting transcription: model={model_name}, "
            f"backend={self.backend}, audio={audio_path}"
        )

        if on_progress:
            on_progress(0.0, f"Loading Whisper model ({model_name})...")

        start_time = time.time()

        if HAS_FASTER_WHISPER:
            result = self._transcribe_faster_whisper(
                audio_path, model_name, language, on_progress
            )
        else:
            result = self._transcribe_openai_whisper(
                audio_path, model_name, language, on_progress
            )

        elapsed = time.time() - start_time
        logger.info(
            f"Transcription complete in {elapsed:.1f}s: "
            f"{len(result.segments)} segments, "
            f"language={result.language}, "
            f"text_length={len(result.full_text)}"
        )

        if on_progress:
            on_progress(100.0, f"Transcription complete ({len(result.segments)} segments)")

        return result

    # ─── faster-whisper backend ───────────────────────────────

    def _transcribe_faster_whisper(
        self,
        audio_path: str,
        model_name: str,
        language: Optional[str],
        on_progress: Optional[Callable],
    ) -> TranscriptionResult:
        from faster_whisper import WhisperModel

        # Reuse loaded model if same name
        if self._faster_model is None or self._loaded_model_name != model_name:
            logger.info(f"Loading faster-whisper model: {model_name}")
            if on_progress:
                on_progress(5.0, f"Loading faster-whisper ({model_name})...")
            # Use int8 quantization for CPU — much faster with minimal quality loss
            self._faster_model = WhisperModel(
                model_name,
                device="cpu",
                compute_type="int8",
            )
            self._loaded_model_name = model_name

        if on_progress:
            on_progress(15.0, "Transcribing audio...")

        transcribe_kwargs: Dict[str, Any] = {
            "beam_size": 5,
            "vad_filter": True,               # Skip silent parts
            "vad_parameters": {
                "min_silence_duration_ms": 500,
            },
            "word_timestamps": False,          # Segment-level is enough
        }
        if language:
            transcribe_kwargs["language"] = language

        segments_iter, info = self._faster_model.transcribe(
            audio_path, **transcribe_kwargs
        )

        segments: List[TranscriptSegment] = []
        full_text_parts: List[str] = []
        seg_id = 0

        for seg in segments_iter:
            text = seg.text.strip()
            if not text:
                continue

            segment = TranscriptSegment(
                id=seg_id,
                start=seg.start,
                end=seg.end,
                text=text,
                avg_logprob=getattr(seg, "avg_logprob", -0.3),
                no_speech_prob=getattr(seg, "no_speech_prob", 0.0),
            )
            segments.append(segment)
            full_text_parts.append(text)
            seg_id += 1

            # Progress: transcription is 15–95%
            if on_progress and seg_id % 10 == 0:
                approx_pct = min(95.0, 15.0 + (seg.end / max(info.duration, 1)) * 80.0)
                on_progress(approx_pct, f"Transcribed {seg.end:.0f}s / {info.duration:.0f}s...")

        return TranscriptionResult(
            segments=segments,
            language=info.language,
            full_text=" ".join(full_text_parts),
            duration=info.duration,
            model_used=f"faster-whisper/{model_name}",
        )

    # ─── openai-whisper backend ───────────────────────────────

    def _transcribe_openai_whisper(
        self,
        audio_path: str,
        model_name: str,
        language: Optional[str],
        on_progress: Optional[Callable],
    ) -> TranscriptionResult:
        import whisper as openai_whisper

        if self._whisper_model is None or self._loaded_model_name != model_name:
            logger.info(f"Loading openai-whisper model: {model_name}")
            if on_progress:
                on_progress(5.0, f"Loading whisper model ({model_name})...")
            self._whisper_model = openai_whisper.load_model(model_name)
            self._loaded_model_name = model_name

        if on_progress:
            on_progress(20.0, "Transcribing audio...")

        transcribe_kwargs: Dict[str, Any] = {
            "verbose": False,
            "word_timestamps": False,
        }
        if language:
            transcribe_kwargs["language"] = language

        raw = self._whisper_model.transcribe(audio_path, **transcribe_kwargs)

        segments: List[TranscriptSegment] = []
        for i, seg in enumerate(raw.get("segments", [])):
            text = seg.get("text", "").strip()
            if not text:
                continue
            segments.append(TranscriptSegment(
                id=i,
                start=float(seg.get("start", 0)),
                end=float(seg.get("end", 0)),
                text=text,
                avg_logprob=float(seg.get("avg_logprob", -0.3)),
                no_speech_prob=float(seg.get("no_speech_prob", 0.0)),
            ))

        full_text = raw.get("text", "").strip()
        detected_language = raw.get("language", "en")

        # Estimate duration from last segment
        duration = segments[-1].end if segments else 0.0

        return TranscriptionResult(
            segments=segments,
            language=detected_language,
            full_text=full_text,
            duration=duration,
            model_used=f"openai-whisper/{model_name}",
        )


# Singleton
transcription_service = TranscriptionService()
