"use client";
import { cn } from "../../lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconFileCv, IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 22,
    y: -16,
    opacity: 1,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

const getFileTypeLabel = (file: File) => {
  const extension = file.name.split(".").pop()?.toUpperCase();
  return extension ? `${extension} document` : "CV document";
};

export const FileUpload = ({
  onChange,
  accept,
  inputId = "file-upload-handle",
}: {
  onChange?: (files: File[]) => void;
  accept?: string;
  inputId?: string;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointerFrame = useRef<number | null>(null);
  const pointerRect = useRef<DOMRect | null>(null);
  const pointerPosition = useRef({ x: 0, y: 0 });

  useEffect(() => () => {
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
  }, []);

  const handleFileChange = (newFiles: File[], syncInput = true) => {
    const nextFile = newFiles[0];
    if (!nextFile) return;
    setFiles([nextFile]);
    if (syncInput && fileInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(nextFile);
      fileInputRef.current.files = transfer.files;
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    onChange && onChange([nextFile]);
  };

  const removeFile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    onChange && onChange([]);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") pointerRect.current = event.currentTarget.getBoundingClientRect();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = event.currentTarget;
    pointerPosition.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const rect = pointerRect.current;
      if (!rect) return;
      const normalizedX = Math.max(-1, Math.min(1, (pointerPosition.current.x - (rect.left + rect.width / 2)) / (rect.width / 2)));
      const normalizedY = Math.max(-1, Math.min(1, (pointerPosition.current.y - (rect.top + rect.height / 2)) / (rect.height / 2)));
      target.style.setProperty("--mouse-x", `${pointerPosition.current.x - rect.left}px`);
      target.style.setProperty("--mouse-y", `${pointerPosition.current.y - rect.top}px`);
      target.style.setProperty("--tile-x", `${normalizedX * 24}px`);
      target.style.setProperty("--tile-y", `${normalizedY * 16}px`);
      target.style.setProperty("--tile-proximity", `${Math.max(0, 1 - Math.min(1, Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY))).toFixed(3)}`);
    });
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const target = event.currentTarget;
    pointerRect.current = null;
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      target.style.setProperty("--mouse-x", "50%");
      target.style.setProperty("--mouse-y", "50%");
      target.style.setProperty("--tile-x", "0px");
      target.style.setProperty("--tile-y", "0px");
      target.style.setProperty("--tile-proximity", "0");
    });
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (newFiles) => handleFileChange(newFiles),
    accept: accept
      ? {
          "application/pdf": [".pdf"],
          "application/msword": [".doc"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
        }
      : undefined,
    onDropRejected: (errors) => {
      const code = errors[0]?.errors?.[0]?.code;
      const message = code === "file-too-large" ? "Your CV is larger than the 10 MB limit." : code === "too-many-files" ? "Only one CV can be uploaded." : "This CV format is not supported.";
      window.dispatchEvent(new CustomEvent("career-cv-error", { detail: message }));
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        whileHover="animate"
        className={cn("cr-ac-upload-surface group/file relative block w-full cursor-pointer overflow-hidden rounded-lg p-10", isDragActive && "is-drag-active")}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={accept}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []), false)}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="relative flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-[#0181BB]">
            Upload your CV
          </p>
          <p className="relative z-20 mt-2 max-w-[22rem] text-balance font-sans text-sm font-normal text-neutral-500">
            {isDragActive ? "DROP YOUR CV HERE" : "Drop your CV here or click to select"}
          </p>
          <div className="relative mx-auto mt-8 w-full max-w-xl">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "cr-ac-upload-file relative z-40 mx-auto mt-4 flex w-full flex-col items-start justify-start overflow-hidden",
                  )}
                >
                  <div className="cr-ac-upload-file-top flex w-full items-center gap-4">
                    <div className="cr-ac-upload-file-icon" aria-hidden="true">
                      <IconFileCv />
                    </div>
                    <div className="min-w-0 flex-1">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="cr-ac-upload-file-name max-w-full truncate"
                      >
                        {file.name}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="cr-ac-upload-file-size"
                      >
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </motion.p>
                    </div>
                  </div>

                  <div className="cr-ac-upload-file-actions mt-3 flex w-full items-center justify-between gap-3">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="cr-ac-upload-file-type"
                    >
                      {getFileTypeLabel(file)}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="flex items-center gap-3"
                    >
                      <button type="button" className="cr-ac-upload-replace" onClick={(event) => { event.stopPropagation(); handleClick(); }}>Replace</button>
                      <button type="button" className="cr-ac-upload-remove" onClick={removeFile}>Remove</button>
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "cr-ac-upload-empty relative z-40 mx-auto mt-4 flex items-center justify-center",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="cr-ac-upload-empty-content"
                  >
                    <IconUpload />
                    <span>Drop your CV here</span>
                  </motion.p>
                ) : (
                  <span className="cr-ac-upload-empty-content">
                    <IconUpload />
                    <span>ADD FILE</span>
                  </span>
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="cr-ac-upload-drag-overlay absolute inset-0 z-30 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-dashed border-sky-400 bg-transparent opacity-0"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="cr-ac-grid flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-gray-100 dark:bg-neutral-900">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
                className={`cr-ac-grid-cell flex h-10 w-10 shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:bg-neutral-950 dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        }),
      )}
    </div>
  );
}
