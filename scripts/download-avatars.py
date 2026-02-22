#!/usr/bin/env python3
"""
Download Wikipedia images for personas, detect faces, crop, remove background.
Outputs 512x512 RGBA PNGs to frontend/public/avatars/
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parent.parent
AVATARS_DIR = ROOT / "frontend" / "public" / "avatars"
PERSONAS_DIR = ROOT / "backend" / "prisma" / "personas"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SIZE = 512

# All 50 people — map display name to Wikipedia article title
PEOPLE = {
    "Barack Obama": "Barack Obama",
    "Donald Trump": "Donald Trump",
    "Angela Merkel": "Angela Merkel",
    "Emmanuel Macron": "Emmanuel Macron",
    "Narendra Modi": "Narendra Modi",
    "Xi Jinping": "Xi Jinping",
    "Vladimir Putin": "Vladimir Putin",
    "Volodymyr Zelenskyy": "Volodymyr Zelenskyy",
    "Winston Churchill": "Winston Churchill",
    "Margaret Thatcher": "Margaret Thatcher",
    "Nelson Mandela": "Nelson Mandela",
    "Jacinda Ardern": "Jacinda Ardern",
    "Abraham Lincoln": "Abraham Lincoln",
    "John F. Kennedy": "John F. Kennedy",
    "Benjamin Netanyahu": "Benjamin Netanyahu",
    "Mahatma Gandhi": "Mahatma Gandhi",
    "Martin Luther King Jr.": "Martin Luther King Jr.",
    "Alexandria Ocasio-Cortez": "Alexandria Ocasio-Cortez",
    "Elon Musk": "Elon Musk",
    "Sam Altman": "Sam Altman",
    "Satya Nadella": "Satya Nadella",
    "Tim Cook": "Tim Cook",
    "Sundar Pichai": "Sundar Pichai",
    "Mark Zuckerberg": "Mark Zuckerberg",
    "Jeff Bezos": "Jeff Bezos",
    "Jensen Huang": "Jensen Huang",
    "Dario Amodei": "Dario Amodei",
    "Demis Hassabis": "Demis Hassabis",
    "Andrej Karpathy": "Andrej Karpathy",
    "Yann LeCun": "Yann LeCun",
    "Geoffrey Hinton": "Geoffrey Hinton",
    "Ilya Sutskever": "Ilya Sutskever",
    "Linus Torvalds": "Linus Torvalds",
    "Bill Gates": "Bill Gates",
    "Steve Jobs": "Steve Jobs",
    "Larry Page": "Larry Page",
    "Marc Andreessen": "Marc Andreessen",
    "Peter Thiel": "Peter Thiel",
    "Lisa Su": "Lisa Su",
    "Sheryl Sandberg": "Sheryl Sandberg",
    "Warren Buffett": "Warren Buffett",
    "Scott Galloway": "Scott Galloway (professor)",
    "Oprah Winfrey": "Oprah Winfrey",
    "Michelle Obama": "Michelle Obama",
    "Ruth Bader Ginsburg": "Ruth Bader Ginsburg",
    "Pope Francis": "Pope Francis",
    "Richard Branson": "Richard Branson",
    "Ray Dalio": "Ray Dalio",
    "Jack Ma": "Jack Ma",
    "Neil deGrasse Tyson": "Neil deGrasse Tyson",
    # Moderators
    "Tim Russert": "Tim Russert",
    "Jeremy Paxman": "Jeremy Paxman",
    "Christiane Amanpour": "Christiane Amanpour",
    "Oriana Fallaci": "Oriana Fallaci",
    "Charlie Rose": "Charlie Rose",
    "Lex Fridman": "Lex Fridman",
    "Terry Gross": "Terry Gross",
    "Oprah Winfrey": "Oprah Winfrey",
    "Larry King": "Larry King",
    "Dick Cavett": "Dick Cavett",
    "Anderson Cooper": "Anderson Cooper",
    "Jim Lehrer": "Jim Lehrer",
    "Candy Crowley": "Candy Crowley",
    "Howard Stern": "Howard Stern",
    "Bill Maher": "Bill Maher",
    "Piers Morgan": "Piers Morgan",
    "David Frost": "David Frost",
    "Faisal Al Kasim": "Faisal al-Qassem",
    "Dwarkesh Patel": "Dwarkesh Patel",
    "Kara Swisher": "Kara Swisher",
}


def to_kebab(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def get_wikipedia_image_url(article_title: str, thumb_width: int = 1000) -> str | None:
    """Fetch the main image URL from Wikipedia API."""
    encoded = urllib.parse.quote(article_title.replace(" ", "_"))
    api_url = (
        f"https://en.wikipedia.org/w/api.php?action=query"
        f"&titles={encoded}&prop=pageimages&format=json"
        f"&pithumbsize={thumb_width}&redirects=1"
    )
    req = urllib.request.Request(api_url, headers={"User-Agent": "DebaterBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {})
            if thumb.get("source"):
                return thumb["source"]
    except Exception as e:
        print(f"    Wikipedia API error: {e}")
    return None


def download_image(url: str) -> np.ndarray | None:
    """Download image from URL and return as numpy array."""
    req = urllib.request.Request(url, headers={"User-Agent": "DebaterBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"    Download error: {e}")
        return None


def detect_face_and_crop(img: np.ndarray) -> np.ndarray:
    """Detect face, crop with padding to square. Falls back to center crop."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    face_cascade = cv2.CascadeClassifier(cascade_path)

    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))

    h, w = img.shape[:2]

    if len(faces) > 0:
        # Pick largest face
        areas = [fw * fh for (_, _, fw, fh) in faces]
        idx = np.argmax(areas)
        fx, fy, fw, fh = faces[idx]

        # Tight crop: face + neck only (minimal padding)
        pad_x = int(fw * 0.45)
        pad_y_top = int(fh * 0.5)
        pad_y_bottom = int(fh * 0.65)

        x1 = max(0, fx - pad_x)
        y1 = max(0, fy - pad_y_top)
        x2 = min(w, fx + fw + pad_x)
        y2 = min(h, fy + fh + pad_y_bottom)

        # Make square
        crop_w = x2 - x1
        crop_h = y2 - y1
        side = max(crop_w, crop_h)

        # Center the crop
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        x1 = max(0, cx - side // 2)
        y1 = max(0, cy - side // 2)
        x2 = min(w, x1 + side)
        y2 = min(h, y1 + side)

        # Adjust if we hit edges
        if x2 - x1 < side:
            x1 = max(0, x2 - side)
        if y2 - y1 < side:
            y1 = max(0, y2 - side)

        cropped = img[y1:y2, x1:x2]
    else:
        print("    No face detected, using center crop")
        side = min(h, w)
        y1 = max(0, (h - side) // 2)
        x1 = max(0, (w - side) // 2)
        cropped = img[y1 : y1 + side, x1 : x1 + side]

    return cropped


def process_image(img: np.ndarray) -> Image.Image:
    """Crop face, resize to 512x512, remove background."""
    cropped = detect_face_and_crop(img)
    # Resize
    resized = cv2.resize(cropped, (TARGET_SIZE, TARGET_SIZE), interpolation=cv2.INTER_LANCZOS4)
    # Convert to PIL for rembg
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    # Remove background
    result = remove(pil_img)
    return result


def update_persona_avatar(name: str, kebab: str) -> None:
    """Update the persona JSON file with the avatarUrl if it exists."""
    # Try both regular and mod- prefixed filenames
    json_path = PERSONAS_DIR / f"{kebab}.json"
    if not json_path.exists():
        json_path = PERSONAS_DIR / f"mod-{kebab}.json"
    if not json_path.exists():
        return
    try:
        with open(json_path, "r") as f:
            data = json.load(f)
        # Use mod- prefix if the persona file is a moderator
        is_mod = json_path.name.startswith("mod-")
        avatar_url = f"/avatars/mod-{kebab}.png" if is_mod else f"/avatars/{kebab}.png"
        if "identity" in data:
            data["identity"]["avatarUrl"] = avatar_url
        else:
            data["avatarUrl"] = avatar_url
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
    except Exception as e:
        print(f"    Failed to update persona JSON: {e}")


def main():
    skip_existing = "--skip-existing" in sys.argv
    only_missing = "--only-missing" in sys.argv

    total = len(PEOPLE)
    done = 0
    skipped = 0
    failed = 0

    for name, wiki_title in PEOPLE.items():
        kebab = to_kebab(name)
        # Use mod- prefix for moderator personas (check if mod- persona JSON exists)
        mod_json_path = PERSONAS_DIR / f"mod-{kebab}.json"
        if mod_json_path.exists():
            out_filename = f"mod-{kebab}.png"
        else:
            out_filename = f"{kebab}.png"
        out_path = AVATARS_DIR / out_filename
        done += 1

        if skip_existing and out_path.exists():
            print(f"[{done}/{total}] {name} — already exists, skipping")
            skipped += 1
            continue

        if only_missing and out_path.exists():
            print(f"[{done}/{total}] {name} — already exists, skipping")
            skipped += 1
            continue

        print(f"[{done}/{total}] {name}")

        # Get Wikipedia image
        print(f"    Fetching Wikipedia image for '{wiki_title}'...")
        url = get_wikipedia_image_url(wiki_title)
        if not url:
            print(f"    FAILED: No image found on Wikipedia")
            failed += 1
            continue

        # Download
        print(f"    Downloading...")
        img = download_image(url)
        if img is None:
            print(f"    FAILED: Could not download image")
            failed += 1
            continue

        # Process
        print(f"    Processing (face detect + crop + rembg)...")
        try:
            result = process_image(img)
            result.save(str(out_path), "PNG")
            print(f"    Saved: {out_path.name}")
        except Exception as e:
            print(f"    FAILED: {e}")
            failed += 1
            continue

        # Update persona JSON
        update_persona_avatar(name, kebab)

        # Small delay to be nice to Wikipedia
        time.sleep(0.5)

    print(f"\nDone! Processed: {total - skipped - failed}, Skipped: {skipped}, Failed: {failed}")


if __name__ == "__main__":
    main()
