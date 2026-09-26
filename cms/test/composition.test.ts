import { describe, expect, it } from "vitest";
import {
  componentRegistry,
  compositionDiff,
  compositionFromLegacy,
  duplicateNode,
  effectiveLayout,
  insertNode,
  makeNode,
  moveNode,
  removeNode,
  renderComposition,
  resetResponsive,
  setResponsiveLayout,
  updateNode,
} from "../src/features/control-center/composition";

const legacy = () => ({
  hero: {
    heading: "Lake Aviation",
    description: "Reliable fuel",
    image: "/hero.webp",
    alt: "Aircraft",
  },
  introduction: { heading: "About", body: "Operations across East Africa." },
  cta: { label: "Contact", href: "/contact.html" },
  sections: [
    { key: "services", heading: "Services", body: "Into-plane fueling" },
  ],
});

describe("CMS V2 composition engine", () => {
  it('keeps website links and forms inside the protected editing preview', () => {
    const preview = document.implementation.createHTMLDocument('Preview');
    preview.body.innerHTML = '<nav><a href="/about.html">About</a></nav><section><h1>Page</h1></section><form></form>';
    renderComposition(preview, compositionFromLegacy('Page', legacy()), 'desktop', () => {}, () => {}, '');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    preview.querySelector('a')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    preview.querySelector('form')!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
  });
  it("registers production component families and creates a structured migration", () => {
    expect(Object.keys(componentRegistry)).toContain("company-hero");
    expect(Object.keys(componentRegistry)).toContain("service-card");
    const composition = compositionFromLegacy("Lake Aviation", legacy());
    expect(composition.root.children.map((node) => node.type)).toEqual([
      "company-hero",
      "image-text",
      "service-card",
      "cta",
    ]);
    expect(composition.root.children[0].locked).toBe(true);
  });

  it("supports insert, duplicate, reorder, hide and delete with protected nodes", () => {
    let composition = compositionFromLegacy("Page", legacy());
    const card = makeNode("service-card");
    composition = insertNode(composition, card);
    composition = duplicateNode(composition, card.id);
    expect(composition.root.children).toHaveLength(6);
    composition = moveNode(composition, card.id, -1);
    composition = updateNode(composition, card.id, (node) => {
      node.visible = false;
    });
    expect(
      composition.root.children.find((node) => node.id === card.id)?.visible,
    ).toBe(false);
    composition = removeNode(composition, card.id);
    expect(composition.root.children.some((node) => node.id === card.id)).toBe(
      false,
    );
    expect(() => removeNode(composition, "hero")).toThrow(/Protected/);
    expect(() => duplicateNode(composition, "hero")).toThrow(/Protected/);
    expect(() => moveNode(composition, "hero", 1)).toThrow(/Protected/);
  });

  it("protects complex systems inside an otherwise editable section", () => {
    const composition = compositionFromLegacy("Home", legacy());
    const section = makeNode("section");
    section.children.push(makeNode("custom-globe"));
    composition.root.children.push(section);
    expect(() => removeNode(composition, section.id)).toThrow(/Protected/);
    expect(() => duplicateNode(composition, section.id)).toThrow(/Protected/);
    expect(composition.root.children.at(-1)?.children[0].locked).toBe(true);
  });

  it("persists sparse responsive span overrides and resets inheritance", () => {
    let composition = compositionFromLegacy("Page", legacy());
    composition = updateNode(composition, "section-services", (node) => {
      node.layout.span = 4;
      setResponsiveLayout(node, "tablet", "span", 6);
      setResponsiveLayout(node, "mobile", "span", 12);
    });
    const node = composition.root.children[2];
    expect(effectiveLayout(node, "desktop").span).toBe(4);
    expect(effectiveLayout(node, "tablet").span).toBe(6);
    expect(effectiveLayout(node, "mobile").span).toBe(12);
    resetResponsive(node, "tablet", "span");
    expect(effectiveLayout(node, "tablet").span).toBe(4);
  });

  it("rejects invalid nesting and reports structured move/layout/visibility differences", () => {
    const before = compositionFromLegacy("Page", legacy());
    expect(() => insertNode(before, makeNode("section"), "hero")).toThrow(
      /cannot be inserted/,
    );
    let after = moveNode(before, "section-services", -1);
    after = updateNode(after, "section-services", (node) => {
      node.layout.span = 6;
      node.visible = false;
    });
    const changes = compositionDiff(before, after);
    expect(changes.some((change) => change.kind === "moved")).toBe(true);
    expect(changes.some((change) => change.label.includes("layout"))).toBe(
      true,
    );
    expect(changes.some((change) => change.label.includes("visible"))).toBe(
      true,
    );
  });
});
