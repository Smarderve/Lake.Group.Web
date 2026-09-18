/* CMS V2 public hydration is intentionally opt-in. Production remains static
 * until the controlled Lake Aviation pilot is explicitly enabled. */
window.LAKE_CMS_CONTENT_V2 = window.LAKE_CMS_CONTENT_V2 || {
  enabled: false,
  page: 'lake-aviation',
  pointerUrl: '/public-content/cms-v2/current.json',
};
