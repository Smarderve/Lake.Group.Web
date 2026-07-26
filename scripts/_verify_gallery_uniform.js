const fs = require("fs");
const path = require("path");
const h = fs.readFileSync(path.join(__dirname, "..", "gallery.html"), "utf8");
const checks = [];
function ok(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail || "" });
}
ok("tile count", (h.match(/class="gallery-tile"/g) || []).length === 44, String((h.match(/class="gallery-tile"/g) || []).length));
ok("no masonry class", !h.includes("gallery-masonry"));
ok("no overlay g-label", !h.includes('class="g-label"'));
ok("caption below", (h.match(/gallery-tile__caption/g) || []).length >= 44);
ok("anime vendor", h.includes("assets/vendor/animejs/anime.umd.min.js"));
ok("body gallery-page", h.includes('class="gallery-page"'));
ok("2-col", h.includes("repeat(2, 1fr)") || h.includes("repeat(2,1fr)"));
ok("3-col", h.includes("repeat(3, 1fr)") || h.includes("repeat(3,1fr)"));
ok("4-col", h.includes("repeat(4, 1fr)") || h.includes("repeat(4,1fr)"));
ok("h240", h.includes("height:240px"));
ok("h220", h.includes("height:220px"));
ok("h260", h.includes("height:260px"));
ok("object-fit cover", /object-fit:\s*cover/.test(h));
ok("max-width 1280", h.includes("max-width:1280px"));
ok("footer once", (h.match(/class="site-footer"/g) || []).length === 1);
ok("chat untouched", h.includes('id="chat-widget"'));
ok("no old g-item markup", !h.includes('class="g-item'));
checks.forEach((c) => console.log((c.pass ? "PASS" : "FAIL") + "  " + c.name + (c.detail ? " (" + c.detail + ")" : "")));
process.exit(checks.some((c) => !c.pass) ? 1 : 0);
