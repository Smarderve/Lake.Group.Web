# Lake Assistant external research readiness

Status: external web research is not configured. The assistant currently uses its existing local Qwen3/Ollama runtime and the verified Lake Group knowledge index. It does not send prompts, conversations, uploaded files, or personal data to an external research provider.

## Safe behavior currently implemented

- Official Lake Group evidence remains the source of truth for company-specific history, businesses, products, locations, and services.
- Qwen3 may explain general concepts using its existing model knowledge, but that knowledge is not presented as verified or current Lake Group information.
- The assistant does not invent company financial figures or rankings when the approved evidence contains no support. It distinguishes valuation, revenue, profit, assets, market capitalization, and personal net worth.
- Ranking claims require a publisher, year, geographic scope, and metric.
- The current server date and configured timezone are included for date questions.
- Source links are omitted by default and are returned when a visitor asks for sources. The current index contains approved Lake Group website sources.
- No package, paid service, account, or third-party API was added for this work.

## Decisions still required before external research is enabled

Lake Group IT and Legal/Compliance must review and approve a specific provider or curated-source workflow before any provider is installed or configured. No provider has been selected or authorized, so pricing, license, terms, retention, and data handling have not been represented as reviewed.

For a proposed provider or source collection, record and approve:

- Provider/publisher identity, purpose, service terms, applicable license, and commercial-use permission.
- Pricing, quotas, metering, trial expiry, and an explicit control preventing unapproved charges.
- What query and network metadata leaves the server, retention/deletion behavior, and any onward data sharing.
- Confirmation that no private company records, user conversations, uploads, credentials, or personal data are sent.
- Permitted domains and access method; no paywall, CAPTCHA, robots, authentication, or other access-control bypass.
- Source identity, publication date, retrieval date, jurisdiction, and independently written summary for every curated fact.
- Copyright/attribution review and a process to resolve conflicts with official Lake Group information.
- SSRF protections, allowlists, response-size limits, timeouts, caching/expiry, rate limits, and audit logging that excludes private query content.
- Approval owner, review date, and rollback/disable procedure for Lake Group's Windows/IIS deployment.

Until those decisions are approved, external research must remain disabled. When approved public information is absent from the local index, the assistant must say it cannot verify the current claim rather than imply that it searched the web. There is no claim of zero legal risk; final policy approval belongs to Lake Group Legal/Compliance and IT.

## Deployment and test status

The local Qwen3/Ollama and assistant backend were not running during the latest code verification. The development PC reported 5.22 GiB free of 15.67 GiB RAM, below the assistant's 7 GiB warm-up threshold. No model load, live Qwen response, external-source lookup, or Windows/IIS production test was performed. Those checks require sufficient memory and, for production readiness, Lake Group server access and the approvals above.
