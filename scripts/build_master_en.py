#!/usr/bin/env python3
"""
Build scripts/_master_en.json: the complete key -> English text dictionary
that feeds scripts/build_i18n_content.py.

Combines:
  - shared_en: keys for chrome (nav/footer/mob/chat) and the homepage hero/
    stat keys that already existed in the original assets/i18n.js, plus
    chat.reply.* keys for the chatbot's keyword-triggered replies (these
    live only in assets/site.js as JS string literals, not in any HTML
    data-i18n attribute, so they can't be picked up by the HTML extractor
    and must be listed here explicitly).
  - scripts/_extracted_en.json: every per-page data-i18n key extracted by
    scripts/i18n_extract.py.

Run this whenever new shared/chatbot keys are added or the per-page
extraction is re-run.
"""
import os
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACTED_PATH = os.path.join(ROOT, 'scripts', '_extracted_en.json')
OUT_PATH = os.path.join(ROOT, 'scripts', '_master_en.json')

SHARED_EN = {
    "nav.home": "Home", "nav.about": "About", "nav.services": "Services \u25be",
    "nav.dd.energy": "Energy", "nav.fuel": "Fuel & Petroleum", "nav.lpg": "LPG Gas",
    "nav.lubricants": "Lubricants", "nav.dd.industry": "Industry", "nav.steel": "Lake Steel",
    "nav.concrete": "Concrete & Aggregate", "nav.dd.logistics": "Logistics",
    "nav.logistics": "Transport & Haulage", "nav.containers": "Container Services",
    "nav.network": "Network \u25be", "nav.africaMap": "Africa Operations Map",
    "nav.stations": "Station Locator", "nav.fleet": "Our Fleet",
    "nav.company": "Company \u25be", "nav.history": "Our History", "nav.leadership": "Leadership",
    "nav.csr": "CSR & Sustainability", "nav.investors": "Investor Relations",
    "nav.projects": "Major Projects", "nav.gallery": "Gallery", "nav.news": "News",
    "nav.careers": "Careers", "nav.track": "Track Shipment", "nav.quote": "Get a Quote",
    "nav.fuelShort": "Fuel", "nav.steelShort": "Steel", "nav.concreteShort": "Concrete",
    "nav.transportShort": "Transport", "nav.containersShort": "Containers",
    "nav.africaMapShort": "Africa Map", "nav.historyShort": "History", "nav.csrShort": "CSR",
    "nav.investorsShort": "Investors", "nav.projectsShort": "Projects", "nav.aboutUs": "About Us",
    "mob.services": "Services", "mob.network": "Network", "mob.company": "Company", "mob.more": "More",
    "footer.motto": "Quality, Service, Safety, Professionalism", "footer.getQuote": "Get a Quote",
    "footer.contact": "Contact", "footer.services": "Services", "footer.company": "Company",
    "footer.contactHeading": "Contact", "footer.address": "Plot 49, Mikocheni Light Industrial, Dar es Salaam",
    "footer.rights": "All rights reserved.", "footer.privacy": "Privacy", "footer.terms": "Terms",
    "chat.title": "Lake Group Assistant", "chat.sub": "Ask us anything",
    "chat.hello": "Hello! How can I help you today?", "chat.send": "Send",
    "chat.placeholder": "Type a message...",
    "hero.eyebrow": "Est. 2006 \u00b7 Dar es Salaam, Tanzania",
    "hero.title": "Powering East & <em>Central Africa</em>",
    "hero.sub": "One of Africa's fastest-growing energy, logistics & construction conglomerates, operating across 8 countries with 4,600+ employees and 700+ trucks on the road.",
    "hero.services": "Our Services", "hero.quote": "Request a Quote",
    "stat.employees": "Employees", "stat.trucks": "Trucks", "stat.stations": "Fuel Stations",
    "stat.countries": "Countries",
    # Chatbot keyword-triggered replies (JS string literals in site.js, not
    # HTML, so they must be listed here for the translation pipeline to see
    # them at all).
    "chat.reply.default": "Thank you for your message. Email admin@lakeoilgroup.com or call +255 222780510. Mon\u2013Fri 9:00\u201318:00.",
    "chat.reply.fuel": "Lake Oil supplies petroleum products across Tanzania, Kenya, Zambia, DRC, Rwanda, Burundi & Ethiopia. Contact admin@lakeoilgroup.com for pricing.",
    "chat.reply.lpg": "Lake Gas offers 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use. Available in 7 countries across East & Central Africa.",
    "chat.reply.truck": "Lake Trans operates a fleet of 700+ trucks across East & Central Africa for bulk liquid haulage and general cargo.",
    "chat.reply.contact": "Our headquarters: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com",
    "chat.reply.station": "Visit our Station Locator page to find the nearest Lake Oil fuel station. We have 85+ stations across Tanzania and the region.",
    "chat.reply.careers": "We're always looking for talented people. Visit our Careers page to explore opportunities across our 20+ subsidiaries.",
    "chat.reply.steel": "Lake Steel is the first company in Tanzania to introduce High Strength Corrosion Resistant (HS-CR) rebars with 100,000 MT annual capacity.",
    "chat.reply.concrete": "GCCP (Gulf Concrete & Cement Products) is Dar es Salaam's leading ready-mix concrete supplier, established 2010.",
    "chat.reply.hello": "Hello! Welcome to Lake Group. How can I help you today?",
    "chat.reply.hi": "Hi there! I'm the Lake Group assistant. Ask me about our services, locations, or how to get in touch.",
    "ose.s1.eyebrow": "Dar es Salaam, Tanzania",
    "ose.s1.title": "It started<br>with one tank.",
    "ose.s1.stamp": "Est. 2006",
    "ose.s2.body": "At 27 years old, Ally Edha Awadh opened a single fuel outlet in Dar es Salaam. No fleet, no network, no certainty. Just a belief that East Africa deserved a more reliable energy supply chain.",
    "ose.s2.label": "Ally Edha Awadh, Founder &amp; Chairman",
    "ose.s3.eyebrow": "from one truck",
    "ose.s3.title": "to a fleet of<br><em>700+.</em>",
    "ose.s3.label": "Lake Trans: bulk haulage across East Africa",
    "ose.s4.eyebrow": "and along the way",
    "ose.s4.title": "we brought clean<br>energy <em>home.</em>",
    "ose.s4.body": "Lake Gas now supplies LPG cylinders to seven countries, displacing charcoal stoves and giving families a safer way to cook.",
    "ose.s5.eyebrow": "eight sectors, one vision",
    "ose.s5.title": "We built more than<br>a fuel company.",
    "ose.s5.label": "GCCP: Dar es Salaam's leading ready-mix concrete supplier",
    "ose.s6.body": "Every depot, every truck, every cylinder is run by people. 4,600+ of them, from 21 nationalities, across 8 countries. That's the part no spreadsheet can capture.",
    "ose.s6.label": "our team, our story",
    "ose.s7.eyebrow": "today",
    "ose.s7.title": "across <em>8 countries</em><br>and counting.",
    "ose.s7.body": "Tanzania &middot; Kenya &middot; Zambia &middot; Rwanda &middot; Burundi &middot; DRC &middot; Ethiopia &middot; Mozambique",
    "ose.s8.title": "Lake Group.",
    "ose.s8.body": "Quality. Service. Safety. Professionalism.<br>Powering East &amp; Central Africa since 2006.",
    "ose.s8.label": "still growing",
    "ose.ending.eyebrow": "eighteen years in",
    "ose.ending.quote": "\"From a single fuel outlet to one of East Africa's largest energy and industrial conglomerates.\"",
    "ose.ending.employees": "Employees",
    "ose.ending.trucks": "Trucks",
    "ose.ending.stations": "Fuel Stations",
    "ose.ending.countries": "Countries",
    "ose.ending.replay": "&#8635; &nbsp; watch again",
    "ose.skipHint": "tap to skip &rarr;",
    "ose.skipHintAria": "Next scene",
}


def main():
    with open(EXTRACTED_PATH, encoding='utf-8') as f:
        page_data = json.load(f)

    master = dict(SHARED_EN)
    for page, kv in page_data.items():
        master.update(kv)

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print(f'Total master EN keys: {len(master)}')


if __name__ == '__main__':
    main()
