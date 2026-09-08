import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FileUpload } from "./components/ui/file-upload";
import styles from "./careers-file-upload.css?inline";

const style = document.createElement("style");
style.textContent = styles;
document.head.appendChild(style);

const mount = document.getElementById("career-cv-upload-root");

if (mount) {
  flushSync(() => {
    createRoot(mount).render(
      <FileUpload
        inputId="career-cv"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />,
    );
  });
}
