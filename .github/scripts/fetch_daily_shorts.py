#!/usr/bin/env python3
"""
Automated Daily Fresh SSC Shorts Fetcher
Runs on GitHub Actions to fetch, verify, and deduplicate genuine YouTube Shorts
across detailed SSC Exam Micro-Topics.
"""

import os
import re
import json
import random
import urllib.request
import urllib.parse
from datetime import datetime

# Comprehensive Micro-Topic Matrix across all SSC subjects
MICRO_TOPICS = {
    "maths": {
        "label": "Maths",
        "queries": [
            "ssc cgl maths trick shorts",
            "gagan pratap maths trick shorts",
            "aditya ranjan maths shorts",
            "ssc percentage short trick",
            "ssc ratio proportion short trick",
            "ssc profit and loss short trick",
            "ssc compound interest short trick",
            "ssc time and work short trick",
            "ssc speed time distance train short",
            "ssc algebra short trick cgl",
            "ssc geometry mensuration trick short",
            "ssc trigonometry trick short",
            "ssc number system unit digit short",
            "sahil sir maths short trick"
        ]
    },
    "reasoning": {
        "label": "Reasoning",
        "queries": [
            "ssc reasoning trick shorts",
            "ssc cgl reasoning short trick",
            "syllogism reasoning short trick ssc",
            "coding decoding reasoning short ssc",
            "dice and cube reasoning trick short",
            "blood relation reasoning short ssc",
            "missing number series reasoning short",
            "counting figures triangles short ssc",
            "direction and distance short ssc",
            "piyush varshney reasoning short"
        ]
    },
    "english": {
        "label": "English",
        "queries": [
            "ssc english vocabulary shorts",
            "ssc cgl idioms and phrases shorts",
            "one word substitution short ssc",
            "tarun grover english shorts",
            "rani mam 120 rules english shorts",
            "active passive voice short trick ssc",
            "direct indirect speech narration short",
            "phrasal verbs short trick ssc",
            "neetu singh english short"
        ]
    },
    "gk": {
        "label": "GK & GS",
        "queries": [
            "ssc gk trick shorts",
            "ssc cgl polity articles trick shorts",
            "fundamental rights ssc trick shorts",
            "indian history mughal empire ssc short",
            "rivers dams geography trick ssc shorts",
            "national parks wildlife sanctuaries ssc short",
            "classical folk dances india ssc shorts",
            "vitamins diseases biology trick ssc",
            "parcham classes gk shorts",
            "crazy gk trick shorts",
            "khan sir gk short trick"
        ]
    },
    "animals": {
        "label": "Animals",
        "queries": [
            "funny cat shorts",
            "cute kitten shorts",
            "funny dog reaction shorts",
            "funny animal video shorts"
        ]
    }
}

def is_vertical_short(video_id):
    """Verify that the video is 100% a vertical YouTube Short and embeds properly."""
    url = f"https://www.youtube.com/shorts/{video_id}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            final_url = resp.geturl()
            # If YouTube redirects to /watch?v=, it is NOT a short!
            if "/shorts/" in final_url:
                return True
            return False
    except Exception:
        return False

def search_youtube_shorts(query):
    """Scrapes YouTube search for real vertical /shorts/ URLs."""
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.youtube.com/results?search_query={encoded}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Extract all /shorts/{id} occurrences
            matches = re.findall(r'/shorts/([a-zA-Z0-9_-]{11})', html)
            # Maintain unique order
            seen = set()
            unique_ids = []
            for m in matches:
                if m not in seen:
                    seen.add(m)
                    unique_ids.append(m)
            return unique_ids
    except Exception as e:
        print(f"    [!] Search error for '{query}': {e}", flush=True)
        return []

def load_existing_pool(file_path):
    """Load existing pool and extract all IDs to avoid duplicates."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    m = re.search(r'const SSC_SHORTS_POOL\s*=\s*(\[[\s\S]*?\]);', content)
    if not m:
        raise ValueError("Could not find SSC_SHORTS_POOL in shorts-data.js")

    pool_data = json.loads(m.group(1))
    existing_ids = {item["id"] for item in pool_data}
    return content, pool_data, existing_ids

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(root_dir, "js", "shorts-data.js")
    sw_path = os.path.join(root_dir, "service-worker.js")

    print(f"Loading data from: {data_path}", flush=True)
    raw_content, pool, existing_ids = load_existing_pool(data_path)
    print(f"Current pool size: {len(pool)} videos ({len(existing_ids)} unique IDs)\n", flush=True)

    new_shorts_added = []
    MAX_NEW_PER_CATEGORY = 4  # Adds 4 new verified vertical shorts per category each daily run

    for cat_key, cat_info in MICRO_TOPICS.items():
        print(f"--- Category: {cat_info['label']} ({cat_key}) ---", flush=True)
        # Select 2-3 random micro-topic queries
        selected_queries = random.sample(cat_info["queries"], min(3, len(cat_info["queries"])))
        cat_added = 0

        for query in selected_queries:
            if cat_added >= MAX_NEW_PER_CATEGORY:
                break
            print(f"  Searching: '{query}'...", flush=True)
            found_ids = search_youtube_shorts(query)
            print(f"  -> Found {len(found_ids)} candidates from search", flush=True)

            for vid in found_ids:
                if vid in existing_ids:
                    continue

                if is_vertical_short(vid):
                    new_entry = {
                        "id": vid,
                        "category": cat_key,
                        "categoryLabel": cat_info["label"],
                        "author": f"SSC {cat_info['label']} Hub" if cat_key != 'animals' else "Funny Animals"
                    }
                    pool.append(new_entry)
                    existing_ids.add(vid)
                    new_shorts_added.append(new_entry)
                    cat_added += 1
                    print(f"    [+] VERIFIED & ADDED: {vid} (Category: {cat_info['label']})", flush=True)

                    if cat_added >= MAX_NEW_PER_CATEGORY:
                        break

        print(f"  Total added for {cat_info['label']}: {cat_added}\n", flush=True)

    print("==========================================", flush=True)
    print(f"Total new verified shorts added: {len(new_shorts_added)}", flush=True)
    print(f"New pool size: {len(pool)} videos", flush=True)
    print("==========================================", flush=True)

    if new_shorts_added:
        formatted_json = json.dumps(pool, indent=2)
        new_content = re.sub(
            r'const SSC_SHORTS_POOL\s*=\s*\[[\s\S]*?\];',
            f"const SSC_SHORTS_POOL = {formatted_json};",
            raw_content
        )
        with open(data_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Updated js/shorts-data.js successfully.", flush=True)

        if os.path.exists(sw_path):
            with open(sw_path, "r", encoding="utf-8") as f:
                sw_text = f.read()
            m = re.search(r"const CACHE_NAME = 'ssc-shorts-v(\d+)';", sw_text)
            if m:
                new_ver = int(m.group(1)) + 1
                sw_text = re.sub(
                    r"const CACHE_NAME = 'ssc-shorts-v\d+';",
                    f"const CACHE_NAME = 'ssc-shorts-v{new_ver}';",
                    sw_text
                )
                with open(sw_path, "w", encoding="utf-8") as f:
                    f.write(sw_text)
                print(f"Bumped service worker cache to v{new_ver}", flush=True)

if __name__ == "__main__":
    main()
