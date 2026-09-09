import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FileUpload } from "./components/ui/file-upload";
import styles from "./careers-file-upload.css?inline";

declare global {
  interface Window {
    __LAKE_CAREERS_UPLOAD_MOUNTED__?: boolean;
  }
}

const mount = document.getElementById("career-cv-upload-root");

// The static page can be revisited through BFCache or a soft navigation.
// Keep one React root and one style node per document so an accidental
// duplicate script cannot create competing trees or animation handlers.
if (mount && !window.__LAKE_CAREERS_UPLOAD_MOUNTED__) {
  window.__LAKE_CAREERS_UPLOAD_MOUNTED__ = true;
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
  flushSync(() => {
    createRoot(mount).render(
      <FileUpload
        inputId="career-cv"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />,
    );
  });
}
