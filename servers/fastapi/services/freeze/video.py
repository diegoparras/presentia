"""Browser-free MP4 export (Fase "bestia" #19).

Reuses the freeze pipeline: the deck is rendered once to a vectorial PDF via
WeasyPrint (services.freeze.weasy_pdf.build_pdf), each page is rasterized to a
PNG with PyMuPDF (no external poppler binary), and the frames are stitched into
an MP4 with ffmpeg — optionally with a crossfade transition between slides.

Requirements at runtime: ffmpeg on PATH (added to the Docker image) and PyMuPDF
(declared in pyproject). If ffmpeg is missing the caller gets a clear error and
should fall back / report to the user.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from typing import Any

import fitz  # PyMuPDF

from services.freeze.weasy_pdf import build_pdf, SLIDE_W, SLIDE_H

LOGGER = logging.getLogger(__name__)


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _rasterize_pdf(pdf_path: str, out_dir: str, width: int) -> list[str]:
    """Render each PDF page to a PNG at `width` px (keeping 16:9), return paths."""
    zoom = width / SLIDE_W
    matrix = fitz.Matrix(zoom, zoom)
    paths: list[str] = []
    doc = fitz.open(pdf_path)
    try:
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            p = os.path.join(out_dir, f"frame_{i:04d}.png")
            pix.save(p)
            paths.append(p)
    finally:
        doc.close()
    return paths


def _video_fade_filter(duration: float, fade: float = 0.8) -> str:
    """Fundido a negro al inicio y al final del video."""
    fade = min(fade, max(0.1, duration / 4))
    return (
        f"fade=t=in:st=0:d={fade:.3f},"
        f"fade=t=out:st={max(0.0, duration - fade):.3f}:d={fade:.3f}"
    )


def _build_concat_no_transition(
    frames: list[str],
    out_path: str,
    seconds_per_slide: float,
    fps: int,
    fade_video: bool = False,
) -> None:
    """Simple path: each PNG shown for N seconds, hard cuts. One ffmpeg call."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
        listfile = fh.name
        for p in frames:
            fh.write(f"file '{p}'\n")
            fh.write(f"duration {seconds_per_slide}\n")
        # ffmpeg concat demuxer needs the last frame repeated to honor its duration.
        fh.write(f"file '{frames[-1]}'\n")
    try:
        vf = f"fps={fps},format=yuv420p"
        if fade_video:
            duration = len(frames) * seconds_per_slide
            vf += "," + _video_fade_filter(duration)
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
            "-vf", vf,
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-movflags", "+faststart",
            out_path,
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    finally:
        try:
            os.unlink(listfile)
        except OSError:
            pass


def _build_with_xfade(
    frames: list[str],
    out_path: str,
    seconds_per_slide: float,
    fps: int,
    transition_duration: float,
    width: int,
    height: int,
    transition_type: str = "fade",
    fade_video: bool = False,
) -> None:
    """Transición entre slides vía filtros xfade encadenados. One ffmpeg call."""
    inputs: list[str] = []
    for p in frames:
        inputs += ["-loop", "1", "-t", str(seconds_per_slide), "-i", p]

    # Normalize every input to the same size/fps/format so xfade can chain them.
    filters: list[str] = []
    for i in range(len(frames)):
        filters.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps},"
            f"format=yuv420p[v{i}]"
        )

    # Chain: v0 xfade v1 -> x1; x1 xfade v2 -> x2; ...
    last = "v0"
    for i in range(1, len(frames)):
        offset = i * seconds_per_slide - i * transition_duration
        out_label = f"x{i}" if i < len(frames) - 1 else "vout"
        filters.append(
            f"[{last}][v{i}]xfade=transition={transition_type}:"
            f"duration={transition_duration}:offset={offset:.3f}[{out_label}]"
        )
        last = out_label

    map_label = "vout"
    if fade_video:
        n = len(frames)
        duration = n * seconds_per_slide - (n - 1) * transition_duration
        filters.append(f"[vout]{_video_fade_filter(duration)}[vfaded]")
        map_label = "vfaded"

    filter_complex = ";".join(filters)
    cmd = [
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{map_label}]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-movflags", "+faststart",
        out_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _mux_audio(
    video_path: str,
    audio_path: str,
    duration: float,
    volume: float = 1.0,
    fade_in: float = 0.0,
    fade_out: float = 1.5,
) -> None:
    """Agrega música de fondo al MP4: loop, volumen y fades configurables.

    Best-effort: si ffmpeg falla acá, se deja el video mudo (el export vale
    más que la banda sonora).
    """
    af_parts: list[str] = []
    if abs(volume - 1.0) > 0.01:
        af_parts.append(f"volume={volume:.2f}")
    if fade_in > 0:
        af_parts.append(f"afade=t=in:st=0:d={min(fade_in, duration / 2):.3f}")
    if fade_out > 0:
        fo = min(fade_out, max(0.1, duration - 0.2))
        af_parts.append(f"afade=t=out:st={max(0.0, duration - fo):.3f}:d={fo:.3f}")
    af = ",".join(af_parts) or "anull"
    tmp_out = f"{video_path}.audio.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        # El audio se loopea si es más corto que el video; -shortest corta al
        # final del video si es más largo.
        "-stream_loop", "-1", "-i", audio_path,
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-af", af,
        "-shortest",
        "-movflags", "+faststart",
        tmp_out,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
        os.replace(tmp_out, video_path)
        LOGGER.info("freeze.video musica agregada (%s)", os.path.basename(audio_path))
    except Exception as exc:  # noqa: BLE001
        stderr = ""
        if isinstance(exc, subprocess.CalledProcessError):
            stderr = (exc.stderr or b"").decode("utf-8", "replace")[-400:]
        LOGGER.warning(
            "no se pudo agregar la musica al video (queda mudo): %s %s", exc, stderr
        )
        try:
            os.unlink(tmp_out)
        except OSError:
            pass


def build_video(
    slides: list[dict[str, Any]],
    out_path: str,
    seconds_per_slide: float = 3.0,
    fps: int = 30,
    width: int = 1920,
    transition: str | None = "fade",
    transition_duration: float = 0.6,
    audio_path: str | None = None,
    music_volume: float = 1.0,
    music_fade_in: float = 0.0,
    music_fade_out: float = 1.5,
    fade_video: bool = False,
) -> None:
    """Render `slides` (frozen scene list) to an MP4 at `out_path`.

    transition: tipo de xfade (fade/slideleft/wipeleft/circleopen/dissolve/
    pixelize) o None para corte seco. Los llamadores pasan valores ya
    saneados (VideoOptions.sanitized).
    """
    if not ffmpeg_available():
        raise RuntimeError(
            "ffmpeg no está disponible en el servidor; no se puede exportar video"
        )
    if not slides:
        raise RuntimeError("no slides to render")

    height = int(round(width * SLIDE_H / SLIDE_W))
    # La transición no puede durar más que la slide que la contiene.
    transition_duration = min(transition_duration, seconds_per_slide / 2)
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = os.path.join(tmp, "deck.pdf")
        build_pdf(slides, pdf_path)
        frames = _rasterize_pdf(pdf_path, tmp, width)
        if not frames:
            raise RuntimeError("PDF produced no pages to rasterize")

        used_transition = bool(transition) and len(frames) > 1
        try:
            if used_transition:
                _build_with_xfade(
                    frames, out_path, seconds_per_slide, fps,
                    transition_duration, width, height,
                    transition_type=transition or "fade",
                    fade_video=fade_video,
                )
            else:
                _build_concat_no_transition(
                    frames, out_path, seconds_per_slide, fps, fade_video=fade_video
                )
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or b"").decode("utf-8", "replace")[-800:]
            LOGGER.error("ffmpeg failed: %s", stderr)
            # xfade can be finicky; retry with the simple hard-cut path.
            if used_transition:
                LOGGER.info("retrying video export without transitions")
                _build_concat_no_transition(
                    frames, out_path, seconds_per_slide, fps, fade_video=fade_video
                )
                used_transition = False
            else:
                raise RuntimeError(f"ffmpeg falló al generar el video: {stderr}") from exc

        if audio_path and os.path.isfile(audio_path):
            n = len(frames)
            duration = (
                n * seconds_per_slide - (n - 1) * transition_duration
                if used_transition
                else n * seconds_per_slide
            )
            _mux_audio(
                out_path, audio_path, duration,
                volume=music_volume,
                fade_in=music_fade_in,
                fade_out=music_fade_out,
            )
    LOGGER.info("freeze.video done -> %s (%d frames)", out_path, len(frames))
