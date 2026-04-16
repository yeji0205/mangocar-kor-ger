# 🥭 MangoAuto Deutschland — Fahrzeugkatalog

Gebrauchtwagen aus Korea — KoreaX-inspired catalog website.

## 🚀 Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/mangoauto-catalog.git
cd mangoauto-catalog

# 2. Serve locally (any simple HTTP server works)
# Option A: Python
python3 -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: VS Code Live Server extension

# 3. Open http://localhost:8000
```

## 📁 Project Structure

```
mangoauto-catalog/
├── index.html          # Main app (catalog + detail pages)
├── data/
│   └── cars.json       # Car data (from MangoCar scraper)
├── scripts/
│   └── scrape_mangocar.py  # Python scraper for fresh data
└── README.md
```

## 🔄 Updating Car Data

### Run the scraper to get fresh listings:

```bash
# Install dependencies
pip install requests beautifulsoup4

# Run scraper (fetches 50 cars from MangoCar)
cd scripts
python scrape_mangocar.py

# Data saved to data/cars.json
```

Then commit & push to update the live site.

## 🌐 Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / root
5. Your site will be live at: `https://YOUR_USERNAME.github.io/mangoauto-catalog/`

## 🛣️ Roadmap (Phase 2 — AWS)

When ready to go to production:

- [ ] Backend API (Node.js / Python) for live MangoCar data
- [ ] Scheduled scraping (every 6 hours)
- [ ] Server-side filtering & search
- [ ] AWS deployment (S3 + CloudFront + Lambda or EC2)
- [ ] Custom domain (e.g., mangoauto.de)
- [ ] Admin panel for managing listings
- [ ] WhatsApp Business API integration

## 🎨 Design

- **Theme**: Dark mode with orange accent (#F5A623)
- **Style**: Inspired by koreax.de/catalog
- **Language**: German (Deutsch)
- **Data**: Real car listings from mangoworldcar.com
- **Responsive**: Mobile, tablet, desktop

## 🛠️ Tech Stack (Current)

- **Frontend**: Vanilla HTML/CSS/JS (no frameworks)
- **Data**: Static JSON file
- **Hosting**: GitHub Pages (free)
- **Scraper**: Python (requests + BeautifulSoup)
