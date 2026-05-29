"use client";

import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2, Users, Plus, X, ChevronRight } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface Client {
  id: string;
  name: string;
}

interface UploadResponse {
  file_id: string;
  filename: string;
  saved_path: string;
  text_preview: string;
}

const MODEL_OPTIONS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
];

function generateEngagementId(): string {
  const num = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `KAT-${num}`;
}

export default function UploadPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Pipeline state
  const [engagementId, setEngagementId] = useState(generateEngagementId);
  const [selectedModel, setSelectedModel] = useState("deepseek-chat");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch clients on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/clients/`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.clients ?? [];
        setClients(list);
      })
      .catch((err) => {
        setClientsError(err.message);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (!droppedFile) return;

      const ext = droppedFile.name.toLowerCase().split(".").pop();
      if (!ext || !["pdf", "md", "markdown", "txt"].includes(ext)) {
        setUploadError("Please drop a PDF, markdown, or text file.");
        return;
      }

      setFile(droppedFile);
      setUploadError(null);
      setUploadResult(null);
    },
    [],
  );

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setUploadError(null);
    setUploadResult(null);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setUploadError(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Upload file
  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/uploads/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { detail?: string }).detail || `Upload failed (HTTP ${res.status})`);
      }

      const data: UploadResponse = await res.json();
      setUploadResult(data);
      if (selectedClientId || newClientName.trim()) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file, selectedClientId, newClientName]);

  // Run pipeline
  const handleRunPipeline = useCallback(async () => {
    if (!uploadResult) return;

    let clientId = selectedClientId;

    // If creating a new client, do that first via upload (the backend creates client from upload)
    // For now, we just pass what we have — the backend might create the client implicitly
    if (!clientId && newClientName.trim()) {
      clientId = newClientName.trim();
    }

    if (!clientId) {
      setRunError("Please select or create a client first.");
      return;
    }

    setRunning(true);
    setRunError(null);

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          source_file: uploadResult.saved_path,
          engagement_id: engagementId,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { detail?: string }).detail || `Pipeline failed (HTTP ${res.status})`);
      }

      setRunSuccess(true);
      // Redirect after a brief moment
      setTimeout(() => {
        router.push(`/clients/${clientId}`);
      }, 1500);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Pipeline run failed");
    } finally {
      setRunning(false);
    }
  }, [uploadResult, selectedClientId, newClientName, engagementId, selectedModel, router]);

  // --- RENDER ---

  return (
    <div className="min-h-full px-8 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Upload</h1>
        <p className="text-gray-400">
          Drop a document to generate a pipeline report.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors ${
                step >= s
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-700 text-gray-600"
              }`}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-sm font-medium ${
                step >= s ? "text-gray-200" : "text-gray-600"
              }`}
            >
              {s === 1 ? "Client" : s === 2 ? "Upload" : "Configure"}
            </span>
            {s < 3 && (
              <ChevronRight className="w-4 h-4 text-gray-700 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: Select Client */}
      <section
        className={`mb-8 p-6 rounded-xl border ${
          step === 1
            ? "border-gray-700 bg-gray-900/50"
            : "border-gray-800 bg-transparent opacity-60"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Select Client</h2>
        </div>

        {clientsLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading clients…
          </div>
        )}

        {clientsError && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Could not load clients: {clientsError}
          </div>
        )}

        {!clientsLoading && !clientsError && (
          <>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setShowNewClientForm(false);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         appearance-none cursor-pointer"
            >
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="mt-3">
              {!showNewClientForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientForm(true);
                    setSelectedClientId("");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create new client
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name…"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                               placeholder:text-gray-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientForm(false);
                      setNewClientName("");
                    }}
                    className="p-2.5 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* STEP 2: Drag & Drop Upload */}
      <section
        className={`mb-8 p-6 rounded-xl border ${
          step === 2 || step === 3
            ? "border-gray-700 bg-gray-900/50"
            : "border-gray-800 bg-transparent opacity-60"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <UploadIcon className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Upload Document</h2>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-indigo-400 bg-indigo-400/10 scale-[1.02]"
              : file
                ? "border-green-600 bg-green-500/5"
                : "border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.md,.markdown,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file && (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <UploadIcon className="w-7 h-7 text-gray-500" />
              </div>
              <p className="text-gray-300 font-medium mb-1">
                Drop PDF or markdown here
              </p>
              <p className="text-gray-500 text-sm">
                or click to browse • PDF, MD, TXT
              </p>
            </>
          )}

          {file && (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-indigo-400" />
              <div className="text-left">
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-gray-400 text-sm">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="ml-4 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Upload button */}
        {file && !uploadResult && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Upload &amp; Extract Text
              </>
            )}
          </button>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
          </div>
        )}

        {/* Upload success / preview */}
        {uploadResult && (
          <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-medium">
                Uploaded: {uploadResult.filename}
              </span>
            </div>
            {uploadResult.text_preview && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Text Preview
                </p>
                <pre className="text-gray-400 text-xs whitespace-pre-wrap bg-gray-900/50 rounded-lg p-3 max-h-40 overflow-y-auto font-mono">
                  {uploadResult.text_preview}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* STEP 3: Configure & Run */}
      {(uploadResult || step === 3) && (
        <section className="mb-8 p-6 rounded-xl border border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">
              Generate Report
            </h2>
          </div>

          {/* Engagement ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Engagement ID
            </label>
            <input
              type="text"
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated. You can edit this.
            </p>
          </div>

          {/* Model selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         appearance-none cursor-pointer"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Run button */}
          <button
            type="button"
            onClick={handleRunPipeline}
            disabled={running || runSuccess || !uploadResult}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating report…
              </>
            ) : runSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Report created! Redirecting…
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>

          {/* Run error */}
          {runError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {runError}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Inline sparkles icon to avoid lucide import issues */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
