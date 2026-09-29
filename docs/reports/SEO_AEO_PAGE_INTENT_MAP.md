# Lake Group SEO + AEO Intent Map

This internal map is maintained with `SEARCH_INTENTS` in `scripts/seo-config.mjs`. It guides source-copy, metadata and future localization work. It is not public page content and must never be rendered as a keyword block.

| Entity / page | Business vertical | Primary intent | Geographic context | Supported answer question |
| --- | --- | --- | --- | --- |
| Lake Group / Home | Corporate | Diversified business group | East and Central Africa | What is Lake Group? |
| Lake Group / About | Corporate | Company history and industries | East and Central Africa | What does Lake Group do? |
| Lake Oil | Energies | Fuel distribution and retail stations | East and Central Africa | What does Lake Oil do? |
| Lake Gas | Energies | LPG supply and distribution | East and Central Africa | What does Lake Gas provide? |
| Lake Aviation | Energies | Aviation fuel and into-plane fueling | Tanzania and Uganda | What does Lake Aviation do? |
| Lake Trans | Logistics | Petroleum transport and logistics | East Africa | What logistics services does Lake Trans provide? |
| AFICD | Logistics | Inland container depot services | Tanzania | What does AFICD provide? |
| AILL | Logistics | Inland logistics and container freight services | Dar es Salaam, Tanzania | What does AILL do? |
| Assembly Tech Limited | Automotive | Aluminium trailer manufacturing | East and Central Africa | What does Assembly Tech Limited manufacture? |
| NextDrive Motors Limited | Automotive | Commercial vehicle solutions | Commercial transport and logistics markets | What does NextDrive Motors provide? |
| Cross Country Developer Limited | Real Estate | Real estate development | Tanzania | What does Cross Country Developer Limited do? |
| Lake Agro Limited | Agro Processing | Agro processing and agricultural development | Rufiji, Tanzania | What does Lake Agro do? |
| Agrinova Tech Limited | Automotive | Agricultural machinery solutions | Tanzania | What does Agrinova Tech provide? |
| Lake Lubes | Energies | Lubricant and grease manufacturing | Tanzania | What does Lake Lubes produce? |
| Lake Steel & Allied Products Limited | Manufacturing | Reinforcement steel manufacturing | Tanzania | What does Lake Steel manufacture? |
| Lake Pipes | Manufacturing | PVC and HDPE pipe manufacturing | Kibaha, Tanzania | What does Lake Pipes manufacture? |
| Lake Building Solution | Manufacturing | Gypsum and marine board manufacturing | Kibaha Visiga, Tanzania | What does Lake Building Solution manufacture? |
| Lake Premix | Construction & Materials | Ready-mix concrete solutions | Dar es Salaam and Kenya | What does Lake Premix provide? |
| Lake Cylinders Limited | Manufacturing | LPG cylinder manufacturing | Tanzania and East Africa | What does Lake Cylinders manufacture? |
| Gulf Aggregates | Construction & Materials | Quarry and aggregate processing | Lugoba, Tanzania | What does Gulf Aggregates do? |

## Business vertical navigation

The Business Verticals menu is the crawlable parent pathway for Energies, Manufacturing, Logistics, Real Estate, Agro Processing and Automotive. Its company cards use real anchors; page-level metadata and breadcrumbs use the same entity hierarchy. There are no standalone public sector landing-page URLs at this time, so this map does not invent them.

## Localization guidance

Each field in `PAGE_METADATA` and `SEARCH_INTENTS` is a source-language field. A localized route must receive reviewed native-language titles, descriptions and answer context, while keeping approved company names unchanged. Do not publish locale URLs, hreflang, or translated metadata until the equivalent source page exists and has been reviewed.

## International discoverability baseline

The public website is English-only. Every public document declares `lang="en"`; the locale registry is retained for future reviewed equivalents but has no published routes, hreflang annotations or visible selector. The sitemap contains canonical English URLs only.

Lake Group's Organization entity uses the verified corporate operations network for its geographic context: Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique, Uganda and the United Arab Emirates. Individual company entity records only state their own verified market context. This distinction prevents the corporate network from being misrepresented as the operating footprint of every company.

The JSON-LD graph connects each company WebPage to its own Organization entity, its verified Lake Group parent relationship, its sector, answer-intent topics and—where supported—its operating geography. The Operations Network page separately mentions the verified group markets so this information remains discoverable without relying on the interactive globe.

## Information constraints

Deeper optimization is intentionally deferred for pages whose current source does not provide a stable public entity/service model: generic news-detail content, internal dashboards, legacy redirect sources, and utility/error pages. These pages are not indexable.
