"use client";

import { useEffect, useRef, useState } from "react";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UploadedFile {
  name: string;
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  errorMessage?: string;
  uploadResponse?: {
    success: boolean;
    message: string;
    summary?: {
      total: number;
      inserted: number;
      duplicates: number;
      errors: number;
    };
    details?: {
      duplicateEmails: string[];
      errors: Array<{ row: number; error: string }>;
    };
  };
}

export function FileUploadZone() {
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dzInstanceRef = useRef<Dropzone | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent browser's default drag-and-drop behavior (opening/downloading the file)
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add handlers to document to prevent browser from opening the file
    document.addEventListener("dragover", preventDefaults);
    document.addEventListener("drop", preventDefaults);

    return () => {
      document.removeEventListener("dragover", preventDefaults);
      document.removeEventListener("drop", preventDefaults);
    };
  }, []);

  useEffect(() => {
    if (!dropzoneRef.current) return;

    // Prevent Dropzone from adding its default message
    dropzoneRef.current.classList.add("dropzone");

    // Initialize Dropzone
    const dz = new Dropzone(dropzoneRef.current, {
      url: "/api/contacts/upload",
      autoProcessQueue: false,
      acceptedFiles:
        ".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
      maxFilesize: 10,
      addRemoveLinks: false,
      dictDefaultMessage: "",
      previewsContainer: false,
      clickable: true,
    });

    // Manually handle click to ensure it works
    const handleClick = (e: MouseEvent) => {
      // Only trigger if clicking on the dropzone itself, not on buttons
      const target = e.target as HTMLElement;
      if (!target.closest("button")) {
        dz.hiddenFileInput?.click();
      }
    };
    dropzoneRef.current.addEventListener("click", handleClick);

    // Event handlers
    dz.on("addedfile", (file) => {
      // Remove any existing files first (manual single file handling)
      if (dz.files.length > 1) {
        dz.removeFile(dz.files[0]);
      }

      setFiles([
        {
          name: file.name,
          size: file.size,
          status: "pending",
          progress: 0,
        },
      ]);
    });

    dz.on("uploadprogress", (file, progress) => {
      setFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, progress } : f)),
      );
    });

    dz.on("success", (file, response: UploadedFile["uploadResponse"]) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? {
                ...f,
                status: "success",
                progress: 100,
                uploadResponse: response,
              }
            : f,
        ),
      );
    });

    dz.on("error", (file, errorMessage) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? {
                ...f,
                status: "error",
                errorMessage:
                  typeof errorMessage === "string"
                    ? errorMessage
                    : "Upload failed",
              }
            : f,
        ),
      );
    });

    dz.on("dragenter", () => setIsDragging(true));
    dz.on("dragleave", () => setIsDragging(false));
    dz.on("drop", () => setIsDragging(false));

    dzInstanceRef.current = dz;

    return () => {
      dropzoneRef.current?.removeEventListener("click", handleClick);
      dz.destroy();
    };
  }, []);

  const handleUpload = () => {
    if (dzInstanceRef.current && files.length > 0) {
      dzInstanceRef.current.processQueue();
    }
  };

  const handleRemove = () => {
    if (dzInstanceRef.current) {
      dzInstanceRef.current.removeAllFiles();
      setFiles([]);
      // Re-enable the dropzone after removing files
      dzInstanceRef.current.enable();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Upload Zone */}
      <div
        ref={dropzoneRef}
        className={`
                    relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-300 ease-in-out
                    ${
                      isDragging
                        ? "border-blue-500 bg-blue-50 scale-[1.02]"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
                    }
                `}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`
                        p-4 rounded-full transition-colors duration-300
                        ${isDragging ? "bg-blue-100" : "bg-white"}
                    `}
          >
            <Upload
              className={`
                            h-12 w-12 transition-colors duration-300
                            ${isDragging ? "text-blue-600" : "text-gray-400"}
                        `}
            />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-700">
              {isDragging
                ? "Drop your file here"
                : "Drag & drop your file here"}
            </p>
            <p className="text-sm text-gray-500">
              or{" "}
              <span className="text-blue-600 font-medium">click to browse</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Supports: CSV, XLSX, XLS (Max 10MB)</span>
          </div>
        </div>
      </div>

      {/* File Preview */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Selected File
          </h3>

          {files.map((file, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {file.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <button
                    onClick={handleRemove}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {file.status === "uploading" && (
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}

              {/* Error Message */}
              {file.status === "error" && file.errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{file.errorMessage}</span>
                </div>
              )}

              {/* Success Message with Details */}
              {file.status === "success" && file.uploadResponse && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{file.uploadResponse.message}</span>
                  </div>

                  {/* Upload Summary */}
                  {file.uploadResponse.summary && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="bg-blue-50 px-3 py-2 rounded-lg text-center">
                        <div className="font-semibold text-blue-900">
                          {file.uploadResponse.summary.total}
                        </div>
                        <div className="text-blue-600">Total</div>
                      </div>
                      <div className="bg-green-50 px-3 py-2 rounded-lg text-center">
                        <div className="font-semibold text-green-900">
                          {file.uploadResponse.summary.inserted}
                        </div>
                        <div className="text-green-600">Inserted</div>
                      </div>
                      <div className="bg-yellow-50 px-3 py-2 rounded-lg text-center">
                        <div className="font-semibold text-yellow-900">
                          {file.uploadResponse.summary.duplicates}
                        </div>
                        <div className="text-yellow-600">Duplicates</div>
                      </div>
                      <div className="bg-red-50 px-3 py-2 rounded-lg text-center">
                        <div className="font-semibold text-red-900">
                          {file.uploadResponse.summary.errors}
                        </div>
                        <div className="text-red-600">Errors</div>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Emails */}
                  {file.uploadResponse.details?.duplicateEmails &&
                    file.uploadResponse.details.duplicateEmails.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-yellow-900 mb-2">
                          Duplicate Emails (skipped):
                        </p>
                        <div className="text-xs text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                          {file.uploadResponse.details.duplicateEmails.map(
                            (email, idx) => (
                              <div key={idx}>• {email}</div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Errors */}
                  {file.uploadResponse.details?.errors &&
                    file.uploadResponse.details.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-900 mb-2">
                          Import Errors:
                        </p>
                        <div className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                          {file.uploadResponse.details.errors.map(
                            (error, idx) => (
                              <div key={idx}>
                                • Row {error.row}: {error.error}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}

          {/* Upload Button */}
          {files.some((f) => f.status !== "success") && (
            <button
              onClick={handleUpload}
              disabled={files.some((f) => f.status === "uploading")}
              className="mt-4 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                                transition-colors duration-200"
            >
              {files.some((f) => f.status === "uploading")
                ? "Uploading..."
                : "Upload File"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
