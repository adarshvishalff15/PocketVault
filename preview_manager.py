"""Preview manager module for media streaming and document rendering.

Provides HTTP 206 byte-range streaming for audio/video, structured parsers
for DOCX, PPTX, XLSX, CSV, safe ZIP inspection, text syntax formatting,
and image thumbnails.
"""

from datetime import datetime
from io import BytesIO
from pathlib import Path
import csv
import hashlib
import mimetypes
import os
import re
from flask import Response, request
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    Image = None
    HAS_PIL = False
from config import DATA_DIR, get_file_category

# Cache directory for image thumbnails
THUMBNAIL_DIR = DATA_DIR / "thumbnails"
THUMBNAIL_DIR.mkdir(exist_ok=True, parents=True)


def get_stream_response(file_path: Path) -> Response:
    """Generate an HTTP 206 Partial Content byte-range response for media streaming.
    
    Enables seeking in HTML5 audio/video players without downloading the whole file.
    """
    file_size = file_path.stat().st_size
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"

    range_header = request.headers.get("Range")
    if not range_header:
        # Full file streaming
        def full_file_chunks():
            with open(file_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        resp = Response(full_file_chunks(), 200, mimetype=mime_type, direct_passthrough=True)
        resp.headers["Accept-Ranges"] = "bytes"
        resp.headers["Content-Length"] = str(file_size)
        return resp

    # Parse Range: bytes=start-end
    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return Response("Invalid range specification.", 416, headers={"Content-Range": f"bytes */{file_size}"})

    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        return Response("Requested range not satisfiable.", 416, headers={"Content-Range": f"bytes */{file_size}"})

    chunk_size = end - start + 1

    def partial_chunks():
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                read_amount = min(64 * 1024, bytes_left)
                data = f.read(read_amount)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    resp = Response(partial_chunks(), 206, mimetype=mime_type, direct_passthrough=True)
    resp.headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    resp.headers["Accept-Ranges"] = "bytes"
    resp.headers["Content-Length"] = str(chunk_size)
    return resp


def get_image_thumbnail_data(file_path: Path, max_size: tuple[int, int] = (256, 256)) -> bytes:
    """Generate or retrieve cached thumbnail for an image."""
    stat = file_path.stat()
    cache_key = hashlib.md5(f"{file_path}_{stat.st_mtime}_{max_size}".encode()).hexdigest()
    cache_file = THUMBNAIL_DIR / f"{cache_key}.webp"

    if cache_file.exists():
        return cache_file.read_bytes()

    if not HAS_PIL or Image is None:
        try:
            return file_path.read_bytes()
        except Exception:
            return b""

    with Image.open(file_path) as img:
        # Convert RGBA to RGB for webp if needed
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        out = BytesIO()
        img.save(out, format="WEBP", quality=85)
        thumb_data = out.getvalue()
        try:
            cache_file.write_bytes(thumb_data)
        except Exception:
            pass
        return thumb_data


def get_image_metadata(file_path: Path) -> dict:
    """Extract image dimensions and format."""
    try:
        with Image.open(file_path) as img:
            return {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
            }
    except Exception:
        return {"width": 0, "height": 0, "format": "unknown", "mode": "unknown"}


def parse_docx(file_path: Path) -> dict:
    """Extract structured content from a DOCX document."""
    try:
        import docx
    except ImportError:
        return {"error": "python-docx library not installed on server."}

    try:
        doc = docx.Document(str(file_path))
        elements = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            style_name = p.style.name.lower() if p.style else ""
            if "heading 1" in style_name:
                elements.append({"type": "h1", "text": text})
            elif "heading 2" in style_name:
                elements.append({"type": "h2", "text": text})
            elif "heading 3" in style_name:
                elements.append({"type": "h3", "text": text})
            elif "list" in style_name:
                elements.append({"type": "bullet", "text": text})
            else:
                elements.append({"type": "p", "text": text})

        tables_data = []
        for t in doc.tables:
            table_rows = []
            for row in t.rows:
                table_rows.append([cell.text.strip() for cell in row.cells])
            if table_rows:
                tables_data.append(table_rows)

        core_props = {}
        try:
            props = doc.core_properties
            core_props = {
                "title": props.title or "",
                "author": props.author or "",
                "created": str(props.created) if props.created else "",
                "modified": str(props.modified) if props.modified else "",
            }
        except Exception:
            pass

        return {
            "success": True,
            "filename": file_path.name,
            "elements": elements,
            "tables": tables_data,
            "properties": core_props,
            "paragraphs_count": len(elements),
            "tables_count": len(tables_data),
            "note": "Document content rendered directly from your laptop. Complex desktop styling may vary."
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to parse Word document: {str(e)}"}


def parse_pptx(file_path: Path) -> dict:
    """Extract slides, shapes, text, and tables from a PPTX presentation."""
    try:
        import pptx
    except ImportError:
        return {"error": "python-pptx library not installed on server."}

    try:
        prs = pptx.Presentation(str(file_path))
        slides_data = []

        for idx, slide in enumerate(prs.slides, start=1):
            title = ""
            texts = []
            tables = []

            for shape in slide.shapes:
                if shape.has_text_frame:
                    shape_text = shape.text_frame.text.strip()
                    if shape_text:
                        if not title and (shape == slide.shapes.title or "title" in getattr(shape, "name", "").lower()):
                            title = shape_text
                        else:
                            texts.append(shape_text)
                elif shape.has_table:
                    table_rows = []
                    for row in shape.table.rows:
                        table_rows.append([cell.text.strip() for cell in row.cells])
                    tables.append(table_rows)

            notes = ""
            if slide.has_notes_slide:
                notes = slide.notes_slide.notes_text_frame.text.strip()

            slides_data.append({
                "slide_number": idx,
                "title": title or f"Slide {idx}",
                "text_content": texts,
                "tables": tables,
                "notes": notes,
            })

        return {
            "success": True,
            "filename": file_path.name,
            "total_slides": len(slides_data),
            "slides": slides_data,
            "note": "Presentation slides parsed securely from your laptop file system."
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to parse PowerPoint presentation: {str(e)}"}


def parse_spreadsheet(file_path: Path, sheet_name: str | None = None, page: int = 1, page_size: int = 50) -> dict:
    """Read Excel (.xlsx, .xls) or CSV spreadsheet with pagination and sheet selection."""
    ext = file_path.suffix.lower()

    if ext == ".csv":
        try:
            encodings = ["utf-8", "latin-1", "cp1252"]
            content = None
            for enc in encodings:
                try:
                    with open(file_path, "r", encoding=enc, errors="replace") as f:
                        reader = csv.reader(f)
                        rows = list(reader)
                        content = rows
                        break
                except Exception:
                    continue

            if content is None:
                return {"success": False, "error": "Could not decode CSV file."}

            headers = content[0] if content else []
            data_rows = content[1:] if len(content) > 1 else []
            total_rows = len(data_rows)

            total_pages = max(1, (total_rows + page_size - 1) // page_size)
            page = max(1, min(page, total_pages))
            start_row = (page - 1) * page_size
            page_data = data_rows[start_row : start_row + page_size]

            return {
                "success": True,
                "type": "csv",
                "filename": file_path.name,
                "sheets": ["Default"],
                "active_sheet": "Default",
                "headers": headers,
                "rows": page_data,
                "page": page,
                "total_pages": total_pages,
                "total_rows": total_rows,
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to read CSV: {str(e)}"}

    # Excel (.xlsx)
    try:
        import openpyxl
        wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=True)
        sheet_names = wb.sheetnames
        selected_sheet = sheet_name if sheet_name in sheet_names else sheet_names[0]
        ws = wb[selected_sheet]

        all_rows = []
        for r in ws.iter_rows(values_only=True):
            # Convert row values to string representations
            if any(cell is not None for cell in r):
                all_rows.append([str(c) if c is not None else "" for c in r])
            if len(all_rows) >= 5000:  # Safeguard limit
                break

        wb.close()

        headers = all_rows[0] if all_rows else []
        data_rows = all_rows[1:] if len(all_rows) > 1 else []
        total_rows = len(data_rows)

        total_pages = max(1, (total_rows + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))
        start_row = (page - 1) * page_size
        page_data = data_rows[start_row : start_row + page_size]

        return {
            "success": True,
            "type": "excel",
            "filename": file_path.name,
            "sheets": sheet_names,
            "active_sheet": selected_sheet,
            "headers": headers,
            "rows": page_data,
            "page": page,
            "total_pages": total_pages,
            "total_rows": total_rows,
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to read Excel workbook: {str(e)}"}


def inspect_zip_archive(file_path: Path) -> dict:
    """Safely inspect contents of a zip archive without extracting to disk.
    
    Guards against Zip-Slip attacks and malicious decompression bombs.
    """
    import zipfile
    try:
        entries = []
        total_uncompressed = 0

        with zipfile.ZipFile(file_path, "r") as zf:
            for info in zf.infolist():
                # Check for Zip-Slip traversal attempt
                clean_name = info.filename.replace("\\", "/").strip("/")
                if ".." in clean_name.split("/"):
                    continue

                is_dir = info.is_dir() or info.filename.endswith("/")
                total_uncompressed += info.file_size
                ext = Path(clean_name).suffix.lower() if not is_dir else ""

                mtime_str = ""
                try:
                    dt = datetime(*info.date_time)
                    mtime_str = dt.strftime("%Y-%m-%d %H:%M")
                except Exception:
                    pass

                entries.append({
                    "name": clean_name,
                    "filename": Path(clean_name).name,
                    "is_dir": is_dir,
                    "size": info.file_size,
                    "compressed_size": info.compress_size,
                    "ratio": round((1 - info.compress_size / info.file_size) * 100, 1) if info.file_size > 0 else 0,
                    "modified": mtime_str,
                    "category": "folder" if is_dir else get_file_category(ext),
                    "extension": ext,
                })

        entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {
            "success": True,
            "filename": file_path.name,
            "total_entries": len(entries),
            "total_uncompressed_bytes": total_uncompressed,
            "entries": entries,
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to inspect zip archive: {str(e)}"}


def read_text_preview(file_path: Path, max_bytes: int = 500_000) -> dict:
    """Safely read text or code file with encoding detection and length limits."""
    try:
        stat = file_path.stat()
        file_size = stat.st_size
        truncated = file_size > max_bytes

        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "utf-16"]
        raw = b""
        with open(file_path, "rb") as f:
            raw = f.read(max_bytes)

        text_content = None
        used_encoding = "utf-8"
        for enc in encodings:
            try:
                text_content = raw.decode(enc)
                used_encoding = enc
                break
            except UnicodeDecodeError:
                continue

        if text_content is None:
            text_content = raw.decode("utf-8", errors="replace")

        lines = text_content.splitlines()
        total_lines = len(lines)

        return {
            "success": True,
            "filename": file_path.name,
            "content": text_content,
            "encoding": used_encoding,
            "total_lines": total_lines,
            "truncated": truncated,
            "file_size": file_size,
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to read text file: {str(e)}"}


def get_file_checksum(file_path: Path) -> dict:
    """Calculate SHA-256 checksum and properties for any file."""
    try:
        stat = file_path.stat()
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(256 * 1024):
                sha256.update(chunk)

        ext = file_path.suffix.lower()
        return {
            "success": True,
            "filename": file_path.name,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S"),
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            "sha256": sha256.hexdigest(),
            "category": get_file_category(ext),
            "mime_type": mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to generate file checksum: {str(e)}"}
