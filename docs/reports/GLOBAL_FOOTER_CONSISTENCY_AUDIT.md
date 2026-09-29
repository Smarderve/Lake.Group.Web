# Global Footer Consistency Audit

Date: 2026-09-09  
Scope: all 42 root-level active public HTML pages

The static footer already contained the approved `Plots 72 & 73, Vijibweni Area, Kigamboni, Dar es Salaam` wording, but the translation source for `footer.address` still overwrote it with Mikocheni at runtime. All six locale values now use the approved Kigamboni location. The backend HQ seed was aligned to the same Vijibweni/Kigamboni address without reconnecting public CMS hydration.

Every footer now includes one safe external LinkedIn link with the exact destination `https://www.linkedin.com/company/lake-energies-group/`, `target="_blank"`, `rel="noopener noreferrer"`, and the accessible label “Lake Group on LinkedIn”. Existing YouTube, Instagram, WhatsApp, Facebook, phone numbers, email, and navigation links were preserved.

| Page | Kigamboni correct | Mikocheni absent | LinkedIn present | URL correct | Other contacts preserved | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 404.html, about.html, acfs.html, aficd.html, agrinova-tech.html, aill.html, assembly-tech.html, atl.html, careers.html, contact.html, cross-country.html, csr.html, dashboard.html, fleet.html | Pass | Pass | Pass | Pass | Pass | Pass |
| gallery.html, gulf-aggregates.html, history.html, index.html, la-home.html, la-projects.html, lake-agro.html, lake-aviation.html, lake-buildings.html, lake-cylinders.html, lake-gas.html, lake-group-financial-dashboard.html, lake-group-org-chart.html, lake-lubes.html | Pass | Pass | Pass | Pass | Pass | Pass |
| lake-oil.html, lake-pipes.html, lake-premix-cement.html, lake-steel.html, lake-trans.html, leadership-ally-edha-awadh.html, leadership.html, media-center.html, nextdrive-motors.html, ocean-galleria.html, offline.html, our-story.html, station-locator.html, sustainability.html | Pass | Pass | Pass | Pass | Pass | Pass |

The lightweight regression guard is `tests/footer-consistency.test.js`, exposed as `npm run test:footer-consistency`. It checks every root HTML footer and all translated `footer.address` values for Kigamboni, absence of Mikocheni, and the exact safe LinkedIn link.
