import { useQuery } from "@tanstack/react-query";
import { controlApi } from "./api";
import type { CompositionNode } from "./composition";

export type NavItem = {
  id: string;
  label: string;
  destination: string;
  type: "internal" | "external" | "parent";
  visible: boolean;
  desktop: boolean;
  mobile: boolean;
  children: NavItem[];
};
export type GlobalField = {
  key: string;
  label: string;
  value: string;
  type: string;
};
export type GlobalData = {
  organization: Record<string, string>;
  statistics: Array<{ label: string; value: string; scope: string }>;
  socialLinks: Array<{ label: string; href: string }>;
  dataFields?: GlobalField[];
  navigation?: NavItem[];
  reusableComponents?: CompositionNode[];
};
export type GlobalDocument = {
  currentDraftRevision: {
    id: string;
    data: GlobalData;
    createdAt: string;
  } | null;
  currentPublishedRevision: { id: string; data: GlobalData } | null;
};
export function canonicalFields(data?: GlobalData): GlobalField[] {
  if (!data) return [];
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  return (
    data.dataFields ?? [
      ...Object.entries(data.organization ?? {}).map(([key, value]) => ({
        key: `group.${slug(key)}`,
        label: key,
        value,
        type: key.includes("email")
          ? "email"
          : key.includes("phone")
            ? "telephone"
            : "text",
      })),
      ...(data.statistics ?? []).map((stat) => ({
        key: `group.${slug(stat.scope)}.${slug(stat.label)}`,
        label: `${stat.label} · ${stat.scope}`,
        value: stat.value,
        type: "number",
      })),
      ...(data.socialLinks ?? []).map((link) => ({
        key: `social.${slug(link.label)}`,
        label: link.label,
        value: link.href,
        type: "url",
      })),
    ]
  );
}
export function useGlobal(enabled = true) {
  return useQuery({
    enabled,
    staleTime: 60_000,
    queryKey: ["control-global"],
    queryFn: async () =>
      (await controlApi.document("global"))
        .document as unknown as GlobalDocument,
  });
}
export function usePageDocuments() {
  return useQuery({
    staleTime: 60_000,
    queryKey: ["control-reference-documents"],
    queryFn: async () => {
      const catalog = await controlApi.pages();
      return Promise.all(
        catalog.pages.map(async (page) => {
          try {
            return {
              page,
              document: (await controlApi.document(page.key)).document,
            };
          } catch {
            return { page, document: null };
          }
        }),
      );
    },
  });
}
export function findNav(items: NavItem[], id: string): NavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findNav(item.children, id);
    if (child) return child;
  }
}
export function moveNav(
  items: NavItem[],
  source: string,
  target: string,
): NavItem[] | null {
  const next = structuredClone(items);
  const visit = (list: NavItem[]): boolean => {
    const from = list.findIndex((item) => item.id === source),
      to = list.findIndex((item) => item.id === target);
    if (from >= 0 && to >= 0) {
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return true;
    }
    return list.some((item) => visit(item.children));
  };
  return visit(next) ? next : null;
}
