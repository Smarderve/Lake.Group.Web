# CMS V2 global data

The `global` release document contains organization information, statistics, social links, canonical `dataFields`, and navigation. Composition fields reference canonical values by key and carry one of `linked`, `override`, `detached`, or `broken`, plus the last canonical snapshot. Prefix, suffix and local labels remain separate presentation values.

`/control/global-data` scans current composition drafts for explicit references, shows page/component/field impact, links directly to the visual editor, supports select all and clear, and requires an override or detach decision for unselected linked usages. Commit sends the global document and every affected page to the atomic V2 transaction endpoint. No text-match conversion happens automatically.
