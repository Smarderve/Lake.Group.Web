# Lake Group — Cinematic Landing Page

A scroll-driven 3D experience for Lake Group. One continuous journey from hero to flowing petrol, through a cinematic environment, into a filling storage tank, ending with an orbiting finale.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Production

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_SITE_URL` for correct Open Graph URLs when deploying:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
```

## Experience

| Phase | Description |
|-------|-------------|
| **Hero** | Lake Group logo, taglines, forming petrol drop |
| **Stream** | Viscous black oil with golden reflections; camera follows the flow |
| **Environment** | Particles, volumetric fog, moving lights, bloom |
| **Tank** | Deep Lake Blue `#0A3D91` tank fills with scroll progress |
| **Finale** | Camera orbits full tank; logo returns with "Fueling Progress" |

- Auto-plays on load (~50s) — scroll, click, or tap to take control
- **Replay Journey** button at the end

## Stack

Next.js 16 · React 19 · Three.js · React Three Fiber · Drei · GSAP ScrollTrigger · Framer Motion · Tailwind CSS v4 · Postprocessing (Bloom)

## Assets

| File | Purpose |
|------|---------|
| `public/lake-group-logo.png` | Transparent logo |
| `public/favicon.png` | Favicon |
| `assets/lake-group-logo-source.png` | Source logo (white bg removed on build) |

Regenerate public assets manually:

```bash
npm run prepare:assets
```

## Performance

- Adaptive DPR and events (Drei)
- Mobile/low-end tier: reduced particles, no bloom, lighter shadows
- Instanced particles and droplets
- Throttled petrol geometry updates
- Lazy-loaded Canvas with Suspense

## Project structure

```
src/
├── app/                  # Next.js app router
├── components/
│   ├── scene/            # R3F 3D scene
│   ├── ui/               # Overlays and HUD
│   └── LandingExperience.tsx
├── context/              # Scroll + performance context
├── hooks/                # GSAP, auto-scroll, performance
└── lib/                  # Curves, env map, constants
```

## Relationship to the main lakeoilgroup site

This is a standalone Next.js app — it does **not** build into static HTML
that can be copied into the main site's directory, and it currently has
**no link pointing to it from anywhere on the main site**, so visitors have
no way to find it. To make it reachable:

1. Deploy this app (its own host/subdomain, e.g. `experience.lakeoilgroup.com`,
   or behind a reverse-proxy path like `/experience` on the same domain as
   the main site).
2. Uncomment the "View Full 3D Experience" link in the main site's
   `index.html` (in the `#fuel-experience` section) and point its `href`
   at that deployment URL.

The main site's homepage already has its own lighter-weight, vanilla
Three.js hero animation (`assets/hero-3d.js`) embedded directly in the
page — that one always loads. This app is the fuller, separately-hosted
cinematic experience referenced from a link, not a replacement for it.
