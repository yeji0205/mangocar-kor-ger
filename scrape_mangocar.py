#!/usr/bin/env python3
"""
MangoCar Scraper — Fetches car listings from mangoworldcar.com
Run: python scrape_mangocar.py
Output: ../data/cars.json

Requirements:
  pip install requests beautifulsoup4

This scraper:
1. Fetches the listing page to collect car detail URLs
2. Visits each detail page to extract full info + all image URLs
3. Saves everything to data/cars.json for the static website
"""

import json
import time
import re
import os
import sys
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Missing dependencies. Run:")
    print("   pip install requests beautifulsoup4")
    sys.exit(1)

# ─── Config ───────────────────────────────────────────────────────────
BASE_URL = "https://mangoworldcar.com"
LIST_URL = f"{BASE_URL}/en/car-normal-search-list?directFromSeller=true"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",  # avoid brotli — needs extra package
}
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "cars.json")
MAX_CARS = 50          # Number of cars to scrape
DELAY_SECONDS = 1.5    # Polite delay between requests


def get_exchange_rate():
    """Fetch live USD→EUR rate from Frankfurter API. Falls back to 0.92."""
    try:
        resp = requests.get("https://api.frankfurter.app/latest?from=USD&to=EUR", timeout=5)
        resp.raise_for_status()
        rate = resp.json()["rates"]["EUR"]
        print(f"   💱 Live rate: 1 USD = {rate:.4f} EUR")
        return rate
    except Exception as e:
        print(f"   ⚠️  Exchange rate unavailable ({e}), using fallback 0.92")
        return 0.92


def fetch_page(url):
    """Fetch a page with retry logic."""
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            print(f"  ⚠️  Attempt {attempt+1} failed for {url}: {e}")
            time.sleep(2)
    return None


def extract_listing_urls(html):
    """Extract car detail URLs from the listing page."""
    soup = BeautifulSoup(html, "html.parser")
    urls = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/car-detail/MGC_" in href:
            full_url = href if href.startswith("http") else BASE_URL + href
            if full_url not in urls:
                urls.append(full_url)
    return urls


def extract_images(soup, base_uuid):
    """Extract all car images from the detail page."""
    images = []
    seen = set()
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "cardata/" in src and "lgThumbnail" in src and src not in seen:
            seen.add(src)
            images.append(src)
    return images


def capture_inspection_diagram(inspection_url, mgc_id, output_dir):
    """
    Use Playwright (headless browser) to screenshot the car body diagram section
    from MangoCar's inspection page. Saves as data/inspection/{mgc_id}_diagram.png.
    Returns the relative web path or None if Playwright is not installed / fails.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None  # Playwright not installed — silently skip

    img_dir = os.path.join(output_dir, "inspection")
    os.makedirs(img_dir, exist_ok=True)
    img_filename = f"{mgc_id}_diagram.png"
    img_path = os.path.join(img_dir, img_filename)

    # CSS selectors to try for the diagram section (most specific first)
    DIAGRAM_SELECTORS = [
        ".frame-panel-diagnosis",
        ".accident-evaluation",
        ".mit-frame-section",
        "[class*='frameDiagnosis']",
        "[class*='frame-panel']",
        "[class*='accidentEval']",
        "[class*='bodyDiagram']",
        "[class*='diagram']",
    ]

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(inspection_url, wait_until="domcontentloaded", timeout=25000)
            # Allow JS to render the SVG diagrams
            page.wait_for_timeout(4000)

            for selector in DIAGRAM_SELECTORS:
                el = page.query_selector(selector)
                if el:
                    el.screenshot(path=img_path)
                    browser.close()
                    return f"data/inspection/{img_filename}"

            # Fallback: screenshot the whole viewport (cropped to useful area)
            page.screenshot(path=img_path, clip={"x": 0, "y": 200, "width": 1280, "height": 600})
            browser.close()
            return f"data/inspection/{img_filename}"

    except Exception as e:
        print(f"      ⚠️  Screenshot failed: {e}")
        return None


def parse_inspection_page(html):
    """Parse a MangoCar MIT inspection report page for damage & diagnosis data."""
    soup = BeautifulSoup(html, "html.parser")
    page_text = soup.get_text(" ", strip=True)

    result = {}

    # ── Damage counts (X / W / P) ─────────────────────────────────
    repl_m = re.search(r"Replacement\s*[:\-]?\s*(\d+)", page_text, re.IGNORECASE)
    weld_m = re.search(r"(?:Panel Repair|Welding)\s*[:\-]?\s*(\d+)", page_text, re.IGNORECASE)
    paint_m = re.search(r"Painting\s*[:\-]?\s*(\d+)", page_text, re.IGNORECASE)
    result["replacement_count"] = int(repl_m.group(1)) if repl_m else 0
    result["welding_count"]     = int(weld_m.group(1)) if weld_m else 0
    result["painting_count"]    = int(paint_m.group(1)) if paint_m else 0

    # ── Accident diagnosis ────────────────────────────────────────
    frame_m = re.search(r"Frame\s*(Normal|Abnormal)", page_text, re.IGNORECASE)
    ext_m   = re.search(r"Exterior\s*panel\s*(\d+)", page_text, re.IGNORECASE)
    result["accident_diagnosis"] = {
        "Frame":          frame_m.group(1).capitalize() if frame_m else "Normal",
        "Exterior panel": int(ext_m.group(1)) if ext_m else 0,
    }

    # ── Option diagnosis ──────────────────────────────────────────
    option_labels = {
        "Smart Key":   r"Smart\s*Key",
        "A/C":         r"(?:Air\s*Conditioning|A/?C)",
        "Sunroof":     r"Sunroof",
        "Navigation":  r"Navigation",
        "Audio":       r"Audio",
        "Airbag":      r"Airbag",
    }
    option_diagnosis = {}
    for label, pattern in option_labels.items():
        m = re.search(rf"{pattern}\s*(Normal|Abnormal|N/A|Unconfirmed|Yes|No)", page_text, re.IGNORECASE)
        if m:
            option_diagnosis[label] = m.group(1).capitalize()
    result["option_diagnosis"] = option_diagnosis

    # ── Device diagnosis ─────────────────────────────────────────
    device_labels = {
        "Motor":          r"Engine",
        "Getriebe":       r"(?:Transmission|Gearbox)",
        "Lenkung":        r"Steering",
        "Bremsen":        r"Brake",
        "Federung":       r"Suspension",
    }
    device_diagnosis = {}
    for label, pattern in device_labels.items():
        m = re.search(rf"{pattern}\s*(Normal|Abnormal|N/A|Unconfirmed)", page_text, re.IGNORECASE)
        if m:
            device_diagnosis[label] = m.group(1).capitalize()
    result["device_diagnosis"] = device_diagnosis

    return result


def parse_detail_page(html, url, usd_to_eur=0.92):
    """Parse a car detail page into structured data."""
    soup = BeautifulSoup(html, "html.parser")

    # Title: e.g. "2016 Hyundai I30 The New I30"
    title_tag = soup.find("title")
    title_text = title_tag.text if title_tag else ""
    # Remove "Details for " and " | MangoCar"
    title_clean = title_text.replace("Details for ", "").replace(" | MangoCar", "").strip()

    # Extract year from title
    year_match = re.match(r"(\d{4})\s+(.+)", title_clean)
    year = int(year_match.group(1)) if year_match else 0
    name_rest = year_match.group(2) if year_match else title_clean

    # Split brand and model
    brand_parts = name_rest.split(" ", 1)
    brand = brand_parts[0] if brand_parts else ""
    model = brand_parts[1] if len(brand_parts) > 1 else ""

    # Vehicle Info table
    info = {}
    # Look for text patterns like "Year2016", "FuelDiesel", etc.
    page_text = soup.get_text()

    # Try to find structured info
    info_patterns = {
        "fuel": r"Fuel\s*(Diesel|Gasoline|Electric|Hybrid|LPG)",
        "transmission": r"Transmission\s*(AUTO|MANUAL|CVT)",
        "displacement": r"Displacement\s*([\d,]+)cc",
        "color": r"Color\s*([A-Z]+)",
        "passengers": r"Passenger Capacity\s*(\d+)",
        "drive_type": r"Drive Type\s*(2WD|4WD|AWD)",
        "mileage": r"Mileage\s*([\d,]+)\s*KM",
        "first_reg": r"First Registration Date\s*([\d.]+)",
    }

    for key, pattern in info_patterns.items():
        match = re.search(pattern, page_text, re.IGNORECASE)
        info[key] = match.group(1) if match else ""

    # Price
    price_match = re.search(r"\$\s*([\d,]+)", page_text)
    price_usd = int(price_match.group(1).replace(",", "")) if price_match else 0
    price_eur = round(price_usd * usd_to_eur)

    # Mileage
    km_str = info.get("mileage", "0").replace(",", "")
    km = int(km_str) if km_str.isdigit() else 0

    # Images
    images = extract_images(soup, "")

    # MGC ID from URL
    mgc_id = url.split("/")[-1] if "/" in url else ""

    # Inspection info
    has_inspection = "Inspection Report" in page_text or "MangoCar Official Report" in page_text
    inspection_url = f"{BASE_URL}/en/mit-inspection/{mgc_id}" if has_inspection else ""

    # Relevant information (accident / insurance history)
    insurance_fields = {
        "total_loss":        "Total Loss Insurance",
        "flood":             "Flood damage insurance",
        "theft":             "Theft insurance",
        "government_usage":  "Government usage",
        "fuel_modification": "Fuel system modification",
        "seat_modification": "Seat Modification",
    }
    relevant_info = {}
    for key, label in insurance_fields.items():
        m = re.search(rf"{re.escape(label)}\s*(YES|NO)", page_text, re.IGNORECASE)
        relevant_info[key] = m.group(1) if m else "NO"

    # Accident diagnosis
    frame_match = re.search(r"Frame\s*(Normal|Abnormal)", page_text)
    exterior_match = re.search(r"Exterior panel\s*(\d+)\s*items?", page_text)

    return {
        "id": mgc_id,
        "brand": brand,
        "model": model,
        "year": year,
        "mileage_km": km,
        "mileage_display": f"{km:,}".replace(",", "."),
        "fuel": info.get("fuel", "Diesel"),
        "transmission": info.get("transmission", "AUTO"),
        "displacement": info.get("displacement", ""),
        "color": info.get("color", ""),
        "passengers": info.get("passengers", "5"),
        "drive_type": info.get("drive_type", "2WD"),
        "first_registration": info.get("first_reg", ""),
        "price_usd": price_usd,
        "price_eur": price_eur,
        "images": images[:20],  # Limit to 20 images
        "thumbnail": images[0] if images else "",
        "inspected": has_inspection,
        "inspection_url": inspection_url,
        "source_url": url,
        "relevant_info": relevant_info,
        "frame_status": frame_match.group(1) if frame_match else "Normal",
        "exterior_panel_items": int(exterior_match.group(1)) if exterior_match else 0,
        "scraped_at": datetime.now().isoformat(),
    }


def _playwright_available():
    """Check if Playwright + Chromium are usable."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            b.close()
        return True
    except Exception:
        return False


def main():
    start_time = time.time()
    print("🥭 MangoCar Scraper v1.0")
    print(f"   Target: {MAX_CARS} cars")
    print(f"   Output: {OUTPUT_FILE}")
    print()

    # Check optional Playwright dependency for inspection screenshots
    print("🖼  Checking Playwright (inspection screenshots)...", end=" ")
    use_playwright = _playwright_available()
    if use_playwright:
        print("✅ available")
    else:
        print("⚠️  not available — run: pip install playwright && playwright install chromium")
    print()

    # Step 0: Get live exchange rate
    print("💱 Fetching live exchange rate...")
    usd_to_eur = get_exchange_rate()
    print()

    # Step 1: Get listing page
    print("📋 Fetching listing page...")
    listing_html = fetch_page(LIST_URL)
    if not listing_html:
        print("❌ Failed to fetch listing page")
        sys.exit(1)

    urls = extract_listing_urls(listing_html)
    print(f"   Found {len(urls)} car links")

    if len(urls) < MAX_CARS:
        print(f"   ⚠️  Only {len(urls)} cars found, will scrape all of them")

    urls = urls[:MAX_CARS]

    # Step 2: Scrape each detail page
    cars = []
    for i, url in enumerate(urls, 1):
        print(f"🚗 [{i}/{len(urls)}] Scraping {url.split('/')[-1]}...", end=" ")
        html = fetch_page(url)
        if html:
            car = parse_detail_page(html, url, usd_to_eur)
            # Fetch inspection report if available
            if car.get("inspection_url"):
                insp_html = fetch_page(car["inspection_url"])
                if insp_html:
                    car["inspection_data"] = parse_inspection_page(insp_html)
                else:
                    car["inspection_data"] = {}
                # Screenshot the diagram section with Playwright
                if use_playwright:
                    diagram_path = capture_inspection_diagram(
                        car["inspection_url"], car["id"], OUTPUT_DIR
                    )
                    car["inspection_diagram"] = diagram_path or ""
                    tag = "[+Prüfbericht 📸]" if diagram_path else "[+Prüfbericht]"
                else:
                    car["inspection_diagram"] = ""
                    tag = "[+Prüfbericht]"
                print(f"✅ {car['brand']} {car['model']} ({car['year']}) {tag}")
            else:
                car["inspection_data"] = {}
                car["inspection_diagram"] = ""
                print(f"✅ {car['brand']} {car['model']} ({car['year']})")
            cars.append(car)
        else:
            print("❌ Failed")
        time.sleep(DELAY_SECONDS)

    # Step 3: Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "scraped_at": datetime.now().isoformat(),
            "total": len(cars),
            "source": "mangoworldcar.com",
            "cars": cars
        }, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time
    mins, secs = divmod(int(elapsed), 60)
    print()
    print(f"✅ Done! Saved {len(cars)} cars to {OUTPUT_FILE}")
    print(f"   ⏱  Total time: {mins}m {secs}s")
    print(f"   Open your website to see the results.")


if __name__ == "__main__":
    main()
