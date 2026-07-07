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


def _build_concat_no_transition(
    frames: list[str], out_path: str, seconds_per_slide: float, fps: int
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
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
            "-vf", f"fps={fps},format=yuv420p",
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
    transition: float,
    width: int,
    height: int,
) -> None:
    """Crossfade between slides via chained xfade filters. One ffmpeg call."""
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
        offset = i * seconds_per_slide - i * transition
        out_label = f"x{i}" if i < len(frames) - 1 else "vout"
        filters.append(
            f"[{last}][v{i}]xfade=transition=fade:duration={transition}:"
            f"offset={offset:.3f}[{out_label}]"
        )
        last = out_label

    filter_complex = ";".join(filters)
    cmd = [
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-movflags", "+faststart",
        out_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def build_video(
    slides: list[dict[str, Any]],
    out_path: str,
    seconds_per_slide: float = 3.0,
    fps: int = 30,
    width: int = 1920,
    transition: float = 0.6,
) -> None:
    """Render `slides` (frozen scene list) to an MP4 at `out_path`."""
    if not ffmpeg_available():
        raise RuntimeError(
            "ffmpeg no está disponible en el servidor; no se puede exportar video"
        )
    if not slides:
        raise RuntimeError("no slides to render")

    height = int(round(width * SLIDE_H / SLIDE_W))
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = os.path.join(tmp, "deck.pdf")
        build_pdf(slides, pdf_path)
        frames = _rasterize_pdf(pdf_path, tmp, width)
        if not frames:
            raise RuntimeError("PDF produced no pages to rasterize")

        try:
            if transition > 0 and len(frames) > 1:
                _build_with_xfade(
                    frames, out_path, seconds_per_slide, fps, transition, width, height
                )
            else:
                _build_concat_no_transition(frames, out_path, seconds_per_slide, fps)
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or b"").decode("utf-8", "replace")[-800:]
            LOGGER.error("ffmpeg failed: %s", stderr)
            # xfade can be finicky; retry with the simple hard-cut path.
            if transition > 0 and len(frames) > 1:
                LOGGER.info("retrying video export without transitions")
                _build_concat_no_transition(frames, out_path, seconds_per_slide, fps)
            else:
                raise RuntimeError(f"ffmpeg falló al generar el video: {stderr}") from exc
    LOGGER.info("freeze.video done -> %s (%d frames)", out_path, len(frames))
