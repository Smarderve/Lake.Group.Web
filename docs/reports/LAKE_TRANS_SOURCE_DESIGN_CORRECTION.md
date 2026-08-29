# Lake Trans — Source-Locked Content + Design Correction Report

**Date:** 2026-08-29
**Source document:** Lake Trans.docx
**Hero image:** `assets/images/laketrans/hero/lake-trans-fleet-hero.webp`

---

## 1. Unsupported Claims Removed

| Claim | Location | Status |
|-------|----------|--------|
| "established in 2008" | Meta, hero, intro | ❌ Removed — source says 2011 |
| "650 vehicles" / "650-vehicle fleet" | Meta, hero, fleet stats, JSON-LD | ❌ Removed — source says 1,500+ |
| "40K L Maximum Tanker Capacity" | Fleet at a Glance | ❌ Removed — not in source |
| "3 Company Yards" | Fleet at a Glance | ❌ Removed — not in source |
| "100 tankers assigned to local operations" | Fleet & Operations | ❌ Removed — not in source |
| "250 tankers assigned to transit operations" | Fleet & Operations | ❌ Removed — not in source |
| "Workshops in Monduli, Dar es Salaam and Morogoro" | Fleet & Operations | ❌ Removed — not in source |
| "One yard at Kibaha and two at Kigamboni" | Fleet & Operations | ❌ Removed — not in source |
| "Scania, Iveco, Sinotruk and Dayun" fleet brands | Fleet & Operations | ❌ Removed — not in source |
| "200 million litres of fuel" (2016) | Profile Milestones | ❌ Removed — not verified |
| "10 million kilometres" (2016) | Profile Milestones | ❌ Removed — not verified |
| "300 Sinotruk vehicles" + "150 trucks by Nov 2017" | Profile Milestones | ❌ Removed — not in source |
| "TATOA member" | Company Introduction | ❌ Removed — not in source |
| "Branches in Congo, Burundi and Zambia" | Company Introduction | ❌ Removed — not in source |
| "Fuel transport to Uganda and Rwanda" | Company Introduction | ❌ Removed — not in source |
| "LPG Transport" service card | Services | ❌ Removed — not in source |
| "Port Trucking" service card | Services | ❌ Removed — not in source |
| "Express Road" service card | Services | ❌ Removed — not in source |
| "Logistics Support" service card | Services | ❌ Removed — not in source |
| "Dry Cargo" as separate card | Services | ❌ Removed — source covers it under flatbed |
| 11 named clients (Dalbit, Trafigura, etc.) | Business Network | ❌ Removed — not in source |
| 8 named maintenance partners | Business Network | ❌ Removed — not in source |
| "Fleet age in profile: Mostly under 2 years" | Operating Strengths | ❌ Removed — not in source |

---

## 2. Source Facts Used

- **Company:** Lake Trans Limited
- **Part of Lake Group:** Since 2011
- **Registered:** Dar es Salaam, Tanzania
- **Certification:** ISO certified
- **Specialization:** Secure and efficient transportation of petroleum products
- **Fleet:** More than 1,500 state-of-the-art trucks
- **Services:** Petroleum tankers (local/cross-border), flatbed trucks/trailers (dry cargo), GPS monitoring, specialized tipper trucks with backup
- **Mission:** Deliver high-quality, efficient, environmentally responsible products/services; sustainable growth; empowering people; creating value
- **Vision:** Connect Africa's people, businesses and markets through world-class transport services enabling seamless trade and sustainable growth
- **Values:** Teamwork, Reliability, Integrity, Customer Satisfaction
- **History:** Started small supplying fuel → expanded to leading professional transportation for fuel, steel, construction materials, containers across East Africa

---

## 3. Hero Image

- **Asset:** `assets/images/laketrans/hero/lake-trans-fleet-hero.webp`
- Shows long line of white Scania trucks, blue sky, fleet yard
- Focal positioning at `center 40%` for desktop/mobile

---

## 4. Fleet Stat Changes

**Before:**
- 650 Vehicles | 2008 Established | 3 Company Yards | 40K L Capacity

**After:**
- 1,500+ Trucks | 2011 Part of Lake Group | ISO Certified | GPS Fleet Monitoring

---

## 5. Sections Retained/Removed

| Section | Status |
|---------|--------|
| 01 Company Introduction | ✅ Rebuilt from source |
| 02 Mission/Vision/Values | ✅ Rebuilt from source |
| 03 Transport Services | ✅ Rebuilt — 4 source-backed cards |
| 04 Fleet & Operations (650 vehicles, brand names) | ❌ Removed |
| 05 Profile Milestones (2016 stats, Sinotruk imports) | ❌ Removed |
| 06 Clients & Maintenance Partners | ❌ Removed |
| 04 (new) Our History | ✅ Added — source-backed growth narrative |
| 05 (new) Fleet Gallery | ✅ Kept — cleaned caption |

---

## 6. Contrast Fixes

Added CSS for dark-section text visibility:
```css
.fs-on-dark .fs-check li { color: rgba(233,237,248,0.92) !important }
.fs-on-dark p { color: rgba(233,237,248,0.9) !important }
.fs-on-dark .val-mini-tile p { color: rgba(233,237,248,0.7) !important }
```

---

## 7. Metadata Updated

- **Title:** Lake Trans | Transport & Logistics | Lake Group
- **Description:** Source-backed (2011, ISO, 1,500+ trucks, petroleum)
- **JSON-LD:** Updated name and description

---

## 8. Tests

13/13 passing in `tests/lake-trans-source-lock.test.js`:
- Hero uses new fleet image
- Hero text source-backed
- Fleet stats correct (1,500+, 2011, ISO, GPS)
- Unsupported numbers removed (650, 2008, 40K)
- Mission/Vision from source
- Four core values present
- Services source-backed only
- No unsupported client names
- No breadcrumb
- Metadata correct
- JSON-LD correct
- History section present
- Dark-section contrast CSS

---

## 9. Remaining Source Gaps

- The source document does not provide specific country-by-country operation details for Lake Trans beyond "East Africa"
- Workshop/garage locations are not specified in the supplied document
- Specific fleet brand information is not in the supplied document
- No named clients or partners in the source document
