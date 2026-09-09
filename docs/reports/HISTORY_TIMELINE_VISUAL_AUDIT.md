# History Timeline Visual Audit

Date: 2026-09-09  
Page: `history.html`

## Event-card architecture

Each of the 35 individual `.history-event` milestones is now a compact card. Company name remains the strongest element, followed by country and description; the existing `Upcoming · 2026` status stays inside the final Cross Country Developer card. Cards use the existing white, Lake blue, and Sunrise Yellow system with a restrained border and shadow.

Cards preserve the existing timeline DOM and activation classes. Years, dots, progress line, scroll activation, and final tail remain owned by `assets/history-timeline.js`; no second timeline or animation system was introduced.

## Interaction and performance

Desktop fine pointers receive a maximum ±2° perspective tilt with one shared RAF scheduled only while a card is hovered. Pointer coordinates are recorded without layout reads; card geometry is cached on pointer entry. Pointer leave cancels the pending frame and restores the timeline reveal transform. Touch and reduced-motion users receive static cards.

## Geometry and tail verification

The timeline axis continues to use the existing CSS axis variable. Rendered node centers stayed aligned with the axis within 1px (0px in the inspected snapshots). At 1440px, the final 2026 group contained five cards; the tail extended 144px beyond the rendered group bottom and 362px beyond the Upcoming status bottom, confirming the line continues through all 2026 content and fades afterward.

## Responsive QA

Rendered checks covered 390, 430, 768, 1024, 1280, 1366, 1440, 1536, and 1920px. All widths contained 35 cards with compact single-event and multi-event groups, zero card overlap, zero horizontal overflow after clipping the reveal region, and stable line/dot geometry. Mobile cards stack vertically and do not respond to pointer tilt. Reduced-motion mode displays the complete content without movement.

The 1440px active card view is captured at `docs/qa/phase-03-public-pages/history-event-cards-active-1440.png`.
