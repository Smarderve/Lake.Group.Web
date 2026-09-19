# CMS V2 media

`/control/media` reuses the governed backend media inventory and secure upload/metadata records. It provides search, thumbnails, dimensions, size, format, alt text, V2 composition usage, editor deep links and deletion guidance. The visual inspector can choose imported page media, edit alt text, fit and focal point.

Replace everywhere scans explicit V2 `src` fields, validates each affected document, and saves them in one atomic transaction. A failure leaves every draft pointer unchanged. Governed media deletion remains protected by the existing usage endpoint and the V2 workspace reports composition usages before linking to the governed record.
