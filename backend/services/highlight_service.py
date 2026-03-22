"""
AI Highlight Detection Service.

Analyzes a video transcript and selects the best 5-6 clips (30-40 seconds each).

Priority chain:
  1. Groq API   — fast, free tier, cloud LLM (llama-3.3-70b-versatile)
  2. Ollama     — local LLM (llama3 / mistral / any installed model)
  3. Heuristic  — rule-based scoring, no LLM required
  4. Time split — pure emergency fallback for empty transcripts
"""

from __future__ import annotations

import json
import logging
import re
import dataclasses
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Callable, Tuple

import httpx

from config import settings
from services.transcription_service import TranscriptionResult, TranscriptSegment

logger = logging.getLogger("clipwise.highlight")


# ─── Config ──────────────────────────────────────────────────────

TARGET_CLIP_COUNT  = 6
MIN_CLIP_DURATION  = 28.0   # seconds
MAX_CLIP_DURATION  = 42.0   # seconds
PREFERRED_DURATION = 35.0   # seconds
MIN_GAP            = 10.0   # minimum gap between clips

GROQ_API_URL  = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TIMEOUT  = 60.0
GROQ_MODELS   = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]

OLLAMA_TIMEOUT = 90.0
OLLAMA_MODELS  = [
    "llama3.2", "llama3.1", "llama3", "llama2",
    "mistral", "mixtral", "gemma2", "gemma", "phi3", "phi",
]


# ─── Data model ──────────────────────────────────────────────────

@dataclass
class HighlightWindow:
    start: float
    end: float
    title: str
    reason: str
    score: float
    transcript_text: str
    hook: str = ""

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start": round(self.start, 2),
            "end": round(self.end, 2),
            "duration": round(self.duration, 2),
            "title": self.title,
            "reason": self.reason,
            "score": round(self.score, 3),
            "transcriptText": self.transcript_text,
            "hook": self.hook,
        }


# ─── Service ─────────────────────────────────────────────────────

class HighlightDetectionService:

    def __init__(self) -> None:
        self._ollama_model: Optional[str] = None
        self._ollama_checked: bool = False

    # ── Public API ────────────────────────────────────────────

    def detect_highlights(
        self,
        transcript: TranscriptionResult,
        video_duration: float,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> List[HighlightWindow]:
        """
        Returns up to TARGET_CLIP_COUNT HighlightWindows sorted by start time.
        Automatically falls through the priority chain.
        """

        def prog(pct: float, msg: str) -> None:
            if on_progress:
                on_progress(pct, msg)

        speech = transcript.speech_segments
        if not speech:
            logger.warning("Transcript is empty — using time-split fallback")
            return self._time_split_fallback(video_duration)

        # ── 1. Groq ───────────────────────────────────────────
        if settings.groq_api_key:
            prog(5.0, "Sending transcript to Groq AI...")
            try:
                windows = self._run_groq(transcript, video_duration, prog)
                if len(windows) >= 3:
                    logger.info(f"Groq succeeded: {len(windows)} highlight windows")
                    prog(100.0, f"Groq AI selected {len(windows)} highlights")
                    return self._finalise(windows)
                logger.warning(f"Groq only returned {len(windows)} clips — trying Ollama")
            except Exception as exc:
                logger.warning(f"Groq failed ({exc}) — trying Ollama")
        else:
            logger.info("GROQ_API_KEY not set — skipping Groq")

        # ── 2. Ollama ─────────────────────────────────────────
        ollama = self._find_ollama_model()
        if ollama:
            prog(10.0, f"Sending transcript to local LLM ({ollama})...")
            try:
                windows = self._run_ollama(transcript, video_duration, ollama, prog)
                if len(windows) >= 3:
                    logger.info(f"Ollama succeeded: {len(windows)} highlight windows")
                    prog(100.0, f"Local LLM selected {len(windows)} highlights")
                    return self._finalise(windows)
                logger.warning(f"Ollama only returned {len(windows)} clips — using heuristics")
            except Exception as exc:
                logger.warning(f"Ollama failed ({exc}) — using heuristics")
        else:
            logger.info("Ollama not reachable — using heuristic scoring")

        # ── 3. Heuristic ──────────────────────────────────────
        prog(10.0, "Scoring transcript with content heuristics...")
        windows = self._run_heuristic(transcript, video_duration, prog)
        if windows:
            prog(100.0, f"Heuristic scoring selected {len(windows)} highlights")
            return self._finalise(windows)

        # ── 4. Time split ─────────────────────────────────────
        logger.warning("Heuristics produced nothing — using time-split")
        return self._time_split_fallback(video_duration)

    # ─────────────────────────────────────────────────────────
    # GROQ
    # ─────────────────────────────────────────────────────────

    def _run_groq(
        self,
        transcript: TranscriptionResult,
        video_duration: float,
        prog: Callable,
    ) -> List[HighlightWindow]:
        formatted = self._format_transcript(transcript)
        prompt = self._llm_prompt(formatted, video_duration)
        last_err: Optional[Exception] = None

        for model in GROQ_MODELS:
            try:
                prog(15.0, f"Querying Groq ({model})...")
                raw = self._call_groq(prompt, model)
                prog(70.0, "Parsing Groq response...")
                return self._parse_llm_output(raw, transcript, video_duration)
            except Exception as exc:
                logger.warning(f"Groq model {model} failed: {exc}")
                last_err = exc

        raise last_err or RuntimeError("All Groq models failed")

    def _call_groq(self, prompt: str, model: str) -> str:
        resp = httpx.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a viral short-form video editor. "
                            "Respond with valid JSON only. No explanation, no markdown."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.0,
                "max_tokens": 2048,
                "response_format": {"type": "json_object"},
            },
            timeout=GROQ_TIMEOUT,
        )

        if resp.status_code == 429:
            raise RuntimeError("Groq rate limit — will try next model")
        if resp.status_code != 200:
            raise RuntimeError(f"Groq HTTP {resp.status_code}: {resp.text[:200]}")

        content = resp.json()["choices"][0]["message"]["content"]
        logger.debug(f"Groq raw ({len(content)} chars): {content[:300]}")
        return content

    # ─────────────────────────────────────────────────────────
    # OLLAMA
    # ─────────────────────────────────────────────────────────

    def _find_ollama_model(self) -> Optional[str]:
        if self._ollama_checked:
            return self._ollama_model

        self._ollama_checked = True
        try:
            resp = httpx.get(f"{settings.ollama_url}/api/tags", timeout=5.0)
            if resp.status_code != 200:
                return None

            installed = [m.get("name", "").lower() for m in resp.json().get("models", [])]
            for preferred in OLLAMA_MODELS:
                for name in installed:
                    if preferred in name:
                        self._ollama_model = name
                        logger.info(f"Ollama model found: {name}")
                        return name

            all_models = resp.json().get("models", [])
            if all_models:
                self._ollama_model = all_models[0]["name"]
                return self._ollama_model

        except Exception as exc:
            logger.debug(f"Ollama not reachable: {exc}")

        return None

    def _run_ollama(
        self,
        transcript: TranscriptionResult,
        video_duration: float,
        model: str,
        prog: Callable,
    ) -> List[HighlightWindow]:
        formatted = self._format_transcript(transcript)
        prompt = self._llm_prompt(formatted, video_duration)

        prog(20.0, f"Querying Ollama ({model})...")
        resp = httpx.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "top_p": 0.9, "num_predict": 2048},
            },
            timeout=OLLAMA_TIMEOUT,
        )

        if resp.status_code != 200:
            raise RuntimeError(f"Ollama HTTP {resp.status_code}: {resp.text[:200]}")

        raw = resp.json().get("response", "")
        logger.debug(f"Ollama raw ({len(raw)} chars): {raw[:300]}")
        prog(70.0, "Parsing Ollama response...")
        return self._parse_llm_output(raw, transcript, video_duration)

    # ─────────────────────────────────────────────────────────
    # SHARED LLM HELPERS
    # ─────────────────────────────────────────────────────────

    def _format_transcript(self, transcript: TranscriptionResult) -> str:
        """
        Formats as [start_second] text lines.
        Numeric seconds so the LLM can do arithmetic easily.
        Hard cap at ~6000 chars.
        """
        lines = []
        for seg in transcript.speech_segments:
            text = seg.text.strip()
            if text:
                lines.append(f"[{int(seg.start)}] {text}")

        full = "\n".join(lines)

        if len(full) > 6000:
            head = full[:2000]
            tail = full[-3500:]
            full = f"{head}\n... [transcript trimmed] ...\n{tail}"

        return full

    def _llm_prompt(self, formatted_transcript: str, video_duration: float) -> str:
        return (
            f"You are a viral short-form video editor. "
            f"Analyze this transcript and select exactly {TARGET_CLIP_COUNT} clips "
            f"that would perform best as standalone short videos.\n\n"
            f"VIDEO DURATION: {int(video_duration)} seconds\n\n"
            f"TRANSCRIPT (format: [start_second] text):\n"
            f"{formatted_transcript}\n\n"
            f"STRICT RULES:\n"
            f"- Every clip MUST be between {int(MIN_CLIP_DURATION)} and {int(MAX_CLIP_DURATION)} seconds long\n"
            f"- Clips must NOT overlap\n"
            f"- start and end must align with real timestamps from the transcript\n"
            f"- Prioritize: hooks, key insights, surprising facts, emotional moments, actionable advice\n"
            f"- Avoid: intros, outros, filler, sponsor reads\n\n"
            f"Return ONLY this JSON, nothing else:\n"
            f'{{"clips": ['
            f'{{"start": <int>, "end": <int>, "title": "<catchy title max 8 words>", '
            f'"reason": "<one sentence why this clip engages viewers>"}}'
            f", ... ]}}\n\n"
            f"Return exactly {TARGET_CLIP_COUNT} clips ordered by start time."
        )

    def _parse_llm_output(
        self,
        raw: str,
        transcript: TranscriptionResult,
        video_duration: float,
    ) -> List[HighlightWindow]:
        """
        Robustly parses LLM output → validated HighlightWindow list.
        Handles all common LLM formatting quirks.
        """
        json_str = self._extract_json(raw)
        if not json_str:
            raise ValueError(f"No JSON found in LLM output: {raw[:300]}")

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            # Light repair: strip trailing commas
            repaired = re.sub(r",\s*([}\]])", r"\1", json_str)
            try:
                data = json.loads(repaired)
            except json.JSONDecodeError as exc:
                raise ValueError(f"JSON parse failed: {exc}\n{json_str[:400]}")

        # Unwrap outer container
        raw_clips: List[Any] = []
        if isinstance(data, list):
            raw_clips = data
        elif isinstance(data, dict):
            for key in ("clips", "highlights", "segments", "results"):
                if key in data and isinstance(data[key], list):
                    raw_clips = data[key]
                    break
            if not raw_clips and "start" in data:
                raw_clips = [data]

        if not raw_clips:
            raise ValueError(f"No clip array found: {data}")

        windows: List[HighlightWindow] = []
        for item in raw_clips:
            try:
                w = self._parse_clip_item(item, transcript, video_duration)
                if w:
                    windows.append(w)
            except Exception as exc:
                logger.warning(f"Skipping clip item {item}: {exc}")

        return self._resolve_overlaps(windows)

    def _parse_clip_item(
        self,
        item: Dict[str, Any],
        transcript: TranscriptionResult,
        video_duration: float,
    ) -> Optional[HighlightWindow]:

        start = self._to_seconds(
            item.get("start", item.get("start_time", item.get("start_seconds")))
        )
        end = self._to_seconds(
            item.get("end", item.get("end_time", item.get("end_seconds")))
        )

        if start is None or end is None:
            raise ValueError(f"Missing start/end in {item}")

        # Snap to real segment boundaries
        start, end = self._snap_to_boundaries(start, end, transcript)

        # Validate / fix duration
        start, end = self._fix_duration(start, end, video_duration)
        if start is None:
            return None

        window_text = transcript.get_text_for_window(start, end)
        title  = str(item.get("title",  item.get("name", "Key Moment")))[:80]
        reason = str(item.get("reason", item.get("description", "Engaging content")))[:300]
        score  = float(item.get("score", 0.85))
        score  = max(0.0, min(1.0, score))

        return HighlightWindow(
            start=round(start, 2),
            end=round(end, 2),
            title=title,
            reason=reason,
            score=score,
            transcript_text=window_text,
            hook=self._extract_hook(window_text),
        )

    def _to_seconds(self, value: Any) -> Optional[float]:
        """Converts int / float / 'MM:SS' / 'HH:MM:SS' / string-number → float."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            v = value.strip()
            if re.match(r"^\d{1,2}:\d{2}:\d{2}$", v):
                h, m, s = v.split(":")
                return int(h) * 3600 + int(m) * 60 + int(s)
            if re.match(r"^\d{1,2}:\d{2}$", v):
                m, s = v.split(":")
                return int(m) * 60 + int(s)
            try:
                return float(v)
            except ValueError:
                pass
        return None

    def _snap_to_boundaries(
        self,
        start: float,
        end: float,
        transcript: TranscriptionResult,
    ) -> Tuple[float, float]:
        """
        Snaps start/end to the nearest real segment boundary.
        Max snap distance = 8 seconds.
        Only snaps if it improves alignment.
        """
        MAX_SNAP = 8.0
        segs = transcript.speech_segments
        if not segs:
            return start, end

        best_start = min(segs, key=lambda s: abs(s.start - start))
        if abs(best_start.start - start) <= MAX_SNAP:
            start = best_start.start

        best_end = min(segs, key=lambda s: abs(s.end - end))
        if abs(best_end.end - end) <= MAX_SNAP:
            end = best_end.end

        return start, end

    def _fix_duration(
        self,
        start: float,
        end: float,
        video_duration: float,
    ) -> Tuple[Optional[float], Optional[float]]:
        """Clamps and repairs clip timing. Returns (None, None) if unfixable."""
        start = max(0.0, start)
        end   = min(end, video_duration - 0.5)
        dur   = end - start

        if dur < MIN_CLIP_DURATION:
            end = min(start + PREFERRED_DURATION, video_duration - 0.5)
            dur = end - start

        if dur > MAX_CLIP_DURATION:
            end = start + MAX_CLIP_DURATION

        if (end - start) < MIN_CLIP_DURATION * 0.75:
            return None, None
        if start >= video_duration:
            return None, None

        return round(start, 2), round(end, 2)

    def _resolve_overlaps(
        self, windows: List[HighlightWindow]
    ) -> List[HighlightWindow]:
        """Removes / trims overlapping windows. Keeps higher-scored clip on conflict."""
        if len(windows) <= 1:
            return windows

        windows.sort(key=lambda w: w.start)
        result: List[HighlightWindow] = [windows[0]]

        for cur in windows[1:]:
            prev = result[-1]
            gap  = cur.start - prev.end

            if gap >= MIN_GAP:
                result.append(cur)
            elif gap >= 0:
                # Tiny gap — acceptable
                result.append(cur)
            else:
                # Real overlap
                overlap   = prev.end - cur.start
                min_dur   = min(prev.duration, cur.duration)
                if overlap / max(min_dur, 0.1) > 0.5:
                    # Significant — keep higher score
                    if cur.score > prev.score:
                        result[-1] = cur
                else:
                    # Small overlap — nudge current forward
                    new_start = prev.end + 1.0
                    if new_start + MIN_CLIP_DURATION <= cur.end + 5.0:
                        result.append(dataclasses.replace(cur, start=round(new_start, 2)))

        return result

    def _extract_json(self, text: str) -> Optional[str]:
        text = text.strip()
        if text.startswith("{") or text.startswith("["):
            return text
        m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
        if m:
            return m.group(1).strip()
        s = text.find("{")
        e = text.rfind("}")
        if s != -1 and e > s:
            return text[s:e + 1]
        s = text.find("[")
        e = text.rfind("]")
        if s != -1 and e > s:
            return text[s:e + 1]
        return None

    # ─────────────────────────────────────────────────────────
    # HEURISTIC
    # ─────────────────────────────────────────────────────────

    def _run_heuristic(
        self,
        transcript: TranscriptionResult,
        video_duration: float,
        prog: Callable,
    ) -> List[HighlightWindow]:
        segs = transcript.speech_segments
        if not segs:
            return []

        prog(20.0, "Building candidate windows from transcript...")
        candidates = self._build_candidates(segs, video_duration)

        prog(50.0, f"Scoring {len(candidates)} candidate windows...")
        scored = sorted(
            [(self._score_window(c, segs, video_duration), c) for c in candidates],
            key=lambda x: x[0],
            reverse=True,
        )

        prog(70.0, "Selecting best non-overlapping windows...")
        selected: List[HighlightWindow] = []

        for score, window in scored:
            if len(selected) >= TARGET_CLIP_COUNT:
                break

            # Reject if too close to any already-selected window
            if any(
                abs(window["start"] - ex.start) < MIN_GAP
                or abs(window["end"]   - ex.end)   < MIN_GAP
                for ex in selected
            ):
                continue

            wtext = transcript.get_text_for_window(window["start"], window["end"])
            selected.append(HighlightWindow(
                start=window["start"],
                end=window["end"],
                title=self._make_title(wtext, len(selected)),
                reason=self._make_reason(wtext, score),
                score=round(score, 3),
                transcript_text=wtext,
                hook=self._extract_hook(wtext),
            ))

        if len(selected) < TARGET_CLIP_COUNT:
            selected = self._pad_with_time_split(selected, video_duration)

        selected.sort(key=lambda h: h.start)
        return selected

    def _build_candidates(
        self,
        segs: List[TranscriptSegment],
        video_duration: float,
    ) -> List[Dict[str, Any]]:
        """
        Builds candidate windows anchored at every Nth segment start.
        End is snapped to the nearest segment end within [MIN, MAX] duration.
        """
        candidates: List[Dict[str, Any]] = []
        step = max(1, len(segs) // 60)

        for i in range(0, len(segs), step):
            start = segs[i].start
            if start + MIN_CLIP_DURATION > video_duration:
                break

            target_end = start + PREFERRED_DURATION
            best_end   = min(target_end, video_duration - 1.0)

            for seg in segs[i:]:
                if seg.end < start + MIN_CLIP_DURATION:
                    continue
                if seg.end > start + MAX_CLIP_DURATION:
                    break
                if abs(seg.end - target_end) < abs(best_end - target_end):
                    best_end = seg.end

            if best_end - start >= MIN_CLIP_DURATION:
                candidates.append({
                    "start": round(start, 2),
                    "end":   round(best_end, 2),
                })

        return candidates

    def _score_window(
        self,
        window: Dict[str, Any],
        all_segs: List[TranscriptSegment],
        video_duration: float,
    ) -> float:
        start    = window["start"]
        end      = window["end"]
        duration = end - start

        if duration <= 0:
            return 0.0

        segs_in = [s for s in all_segs if s.end > start and s.start < end]
        if not segs_in:
            return 0.05

        text       = " ".join(s.text for s in segs_in)
        text_lower = text.lower()
        words      = text.split()

        # A — speech density (0–0.22)
        wps     = len(words) / duration
        density = min(1.0, wps / 3.0) * 0.22

        # B — keyword scoring (0–0.28)
        HOOK_KW  = {"never","secret","truth","mistake","wrong","reveal","actually",
                    "surprisingly","shocking","unbelievable","incredible","warning"}
        VALUE_KW = {"key","important","critical","essential","strategy","tip","trick",
                    "lesson","insight","reason","because","how","why","result",
                    "benefit","problem","solution"}
        STORY_KW = {"remember","story","moment","happened","realized","learned",
                    "changed","experience","felt","thought"}
        FILLER   = {" um "," uh "," like "," you know "," i mean ",
                    " sort of "," kind of "}

        hook_hits   = sum(1 for kw in HOOK_KW  if kw in text_lower)
        value_hits  = sum(1 for kw in VALUE_KW if kw in text_lower)
        story_hits  = sum(1 for kw in STORY_KW if kw in text_lower)
        filler_hits = sum(1 for kw in FILLER   if kw in text_lower)

        kw_raw    = (hook_hits * 2.0 + value_hits * 1.5 + story_hits * 1.0) / 10.0
        filler_p  = min(0.10, filler_hits * 0.02)
        kw_score  = max(0.0, min(0.28, kw_raw * 0.28) - filler_p)

        # C — sentence completeness (0–0.15)
        first_text = segs_in[0].text.strip()
        last_text  = segs_in[-1].text.strip()
        complete   = 0.0
        if last_text  and last_text[-1]  in ".!?": complete += 0.10
        if first_text and first_text[0].isupper(): complete += 0.05

        # D — questions (0–0.10)
        q_score = min(0.10, text.count("?") * 0.04)

        # E — position bias (0–0.18)
        rel = start / max(video_duration, 1.0)
        if   rel < 0.04 or rel > 0.93: pos = 0.02
        elif 0.08 <= rel <= 0.88:      pos = 0.18
        else:                           pos = 0.09

        # F — richness (0–0.07)
        richness = min(0.07, len(segs_in) * 0.007)

        total = density + kw_score + complete + q_score + pos + richness
        return round(min(1.0, max(0.0, total)), 4)

    # ─────────────────────────────────────────────────────────
    # TIME-SPLIT FALLBACK
    # ─────────────────────────────────────────────────────────

    def _time_split_fallback(self, video_duration: float) -> List[HighlightWindow]:
        """Pure equal-segment split. Only runs when transcript is empty."""
        logger.warning("Time-split fallback active — no transcript available")
        count    = max(1, min(TARGET_CLIP_COUNT, int(video_duration // 60)))
        seg_len  = video_duration / count
        clip_dur = min(PREFERRED_DURATION, seg_len * 0.6)

        defaults = [
            "Opening Hook", "Key Insight", "Core Concept",
            "Important Moment", "Actionable Advice", "Strong Conclusion",
        ]
        windows: List[HighlightWindow] = []

        for i in range(count):
            start = seg_len * i + max(2.0, (seg_len - clip_dur) / 2)
            end   = min(start + clip_dur, video_duration - 0.5)
            if end - start < 10.0:
                continue
            windows.append(HighlightWindow(
                start=round(start, 2),
                end=round(end, 2),
                title=defaults[i % len(defaults)],
                reason="Time-based segment (no transcript available).",
                score=round(0.50 - i * 0.02, 2),
                transcript_text="",
                hook="",
            ))

        return windows

    def _pad_with_time_split(
        self,
        existing: List[HighlightWindow],
        video_duration: float,
    ) -> List[HighlightWindow]:
        """Supplements heuristic results to reach TARGET_CLIP_COUNT."""
        needed   = TARGET_CLIP_COUNT - len(existing)
        if needed <= 0:
            return existing

        occupied = [(h.start - 20, h.end + 20) for h in existing]
        additions: List[HighlightWindow] = []
        step = video_duration / (needed + 1)
        defaults = [
            "Opening Hook", "Key Insight", "Core Concept",
            "Important Moment", "Actionable Advice", "Strong Conclusion",
        ]

        for i in range(1, needed + 3):
            if len(additions) >= needed:
                break
            center = step * i
            start  = max(0.0, center - PREFERRED_DURATION / 2)
            end    = min(video_duration - 1.0, start + PREFERRED_DURATION)

            if any(not (end < r0 or start > r1) for r0, r1 in occupied):
                continue

            idx = len(existing) + len(additions)
            additions.append(HighlightWindow(
                start=round(start, 2),
                end=round(end, 2),
                title=defaults[idx % len(defaults)],
                reason="Time-based supplemental segment.",
                score=0.45,
                transcript_text="",
                hook="",
            ))
            occupied.append((start - 20, end + 20))

        return existing + additions

    # ─────────────────────────────────────────────────────────
    # SMALL UTILITIES
    # ─────────────────────────────────────────────────────────

    def _finalise(self, windows: List[HighlightWindow]) -> List[HighlightWindow]:
        windows.sort(key=lambda w: w.start)
        return windows[:TARGET_CLIP_COUNT]

    def _extract_hook(self, text: str) -> str:
        if not text:
            return ""
        for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
            if len(sentence.split()) >= 5:
                return sentence[:150]
        return text[:100]

    def _make_title(self, text: str, index: int) -> str:
        defaults = [
            "The Hook", "Key Insight", "Surprising Revelation",
            "Emotional Story", "Practical Advice", "Powerful Conclusion",
            "Core Concept", "Expert Tip",
        ]
        if not text:
            return defaults[index % len(defaults)]
        words = text.split()[:7]
        if len(words) >= 4:
            t = " ".join(words)
            return t if t[-1] in ".!?" else t + "..."
        return defaults[index % len(defaults)]

    def _make_reason(self, text: str, score: float) -> str:
        if not text:
            return "High-engagement segment identified by content analysis."
        details: List[str] = []
        if "?" in text:  details.append("contains compelling questions")
        if "!" in text:  details.append("high-energy delivery")
        if len(text.split()) > 60: details.append("content-rich moment")
        prefix = (
            "Strong viral potential:" if score > 0.70 else
            "Good engagement moment:" if score > 0.50 else
            "Notable segment:"
        )
        return f"{prefix} {', '.join(details)}." if details else f"{prefix} clear, engaging delivery."


# Singleton
highlight_service = HighlightDetectionService()