"use client";

import { useState } from "react";
import {
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Plus,
  Save,
  History,
} from "lucide-react";

interface TestResult {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  error?: string;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const EXAMPLE_REQUESTS = [
  {
    name: "GET Users",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/users",
    headers: {},
    body: "",
  },
  {
    name: "POST User",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/users",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "John Doe", email: "john@example.com" }, null, 2),
  },
];

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: "Content-Type", value: "application/json" },
  ]);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const handleSend = async () => {
    if (!url) {
      setError("URL is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) headerObj[h.key] = h.value;
      });

      const response = await fetch("/api/tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          url,
          headers: headerObj,
          body,
          timeout: 30000,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const testResult: TestResult = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          method,
          url,
          status: data.status,
          statusText: data.statusText,
          headers: data.headers,
          body: data.body,
          time: data.time,
          size: data.size,
        };

        setResult(testResult);
        setHistory((prev) => [testResult, ...prev.slice(0, 19)]);
      } else {
        setError(data.error || "Request failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (example: (typeof EXAMPLE_REQUESTS)[0]) => {
    setMethod(example.method);
    setUrl(example.url);
    setHeaders(
      Object.entries(example.headers).map(([key, value]) => ({ key, value }))
    );
    setBody(example.body);
  };

  const formatJson = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-[#00ff41]";
    if (status >= 300 && status < 400) return "text-[#00ffff]";
    if (status >= 400 && status < 500) return "text-[#ffaa00]";
    return "text-[#ff0040]";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#00ff41]" />
          <h2 className="text-[#00ff41] font-bold">API PAYLOAD TESTER</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border rounded transition-colors ${
              showHistory
                ? "bg-[#00ff41] text-black border-[#00ff41]"
                : "text-[#00ff41] border-[#00ff41]/30 hover:border-[#00ff41]"
            }`}
          >
            <History className="w-3 h-3" />
            HISTORY ({history.length})
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Request Panel */}
        <div className={`${showHistory ? "w-1/3" : "w-1/2"} p-4 border-r border-[#222] overflow-y-auto`}>
          {/* Method & URL */}
          <div className="flex gap-2 mb-4">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="input-terminal w-28"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="input-terminal flex-1"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="px-4 py-2 bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              SEND
            </button>
          </div>

          {/* Examples */}
          <div className="mb-4">
            <p className="text-xs text-[#008822] mb-2">EXAMPLES</p>
            <div className="flex gap-2">
              {EXAMPLE_REQUESTS.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => loadExample(ex)}
                  className="px-2 py-1 text-xs bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 rounded hover:bg-[#00ff41]/20"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          {/* Headers */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#008822]">HEADERS</p>
              <button
                onClick={handleAddHeader}
                className="flex items-center gap-1 text-xs text-[#00ff41] hover:text-[#00cc33]"
              >
                <Plus className="w-3 h-3" /> ADD
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((header, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => handleHeaderChange(idx, "key", e.target.value)}
                    placeholder="Key"
                    className="input-terminal flex-1 text-xs"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => handleHeaderChange(idx, "value", e.target.value)}
                    placeholder="Value"
                    className="input-terminal flex-1 text-xs"
                  />
                  <button
                    onClick={() => handleRemoveHeader(idx)}
                    className="p-1.5 text-[#ff0040] hover:bg-[#ff0040]/10 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          {["POST", "PUT", "PATCH"].includes(method) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#008822]">BODY</p>
                <button
                  onClick={() => setBody(formatJson(body))}
                  className="text-xs text-[#00ffff] hover:text-[#00cccc]"
                >
                  FORMAT JSON
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="input-terminal w-full h-40 font-mono text-xs resize-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#ff0040]/10 border border-[#ff0040]/30 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ff0040]" />
              <span className="text-[#ff0040] text-xs">{error}</span>
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div className={`${showHistory ? "w-1/3" : "w-1/2"} p-4 border-r border-[#222] overflow-y-auto`}>
          {result ? (
            <div>
              {/* Status */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#0a0a0a] rounded border border-[#222]">
                <div className={`text-2xl font-bold ${getStatusColor(result.status)}`}>
                  {result.status}
                </div>
                <div className="text-sm text-[#008822]">{result.statusText}</div>
                <div className="flex-1" />
                <div className="flex items-center gap-1 text-xs text-[#008822]">
                  <Clock className="w-3 h-3" />
                  {result.time}ms
                </div>
                <div className="text-xs text-[#008822]">{result.size} bytes</div>
              </div>

              {/* Response Headers */}
              <div className="mb-4">
                <p className="text-xs text-[#008822] mb-2">RESPONSE HEADERS</p>
                <div className="p-2 bg-[#0a0a0a] rounded border border-[#222] font-mono text-xs max-h-32 overflow-y-auto">
                  {Object.entries(result.headers).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-[#00ffff]">{key}:</span>{" "}
                      <span className="text-[#00ff41]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#008822]">RESPONSE BODY</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.body)}
                    className="text-xs text-[#00ff41] hover:text-[#00cc33]"
                  >
                    COPY
                  </button>
                </div>
                <pre className="p-3 bg-[#0a0a0a] rounded border border-[#222] font-mono text-xs overflow-auto max-h-64 text-[#00ff41]">
                  {result.body}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#008822]">
              <div className="text-center">
                <Send className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Send a request to see the response</p>
              </div>
            </div>
          )}
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-1/3 p-4 overflow-y-auto">
            <p className="text-xs text-[#008822] mb-3">REQUEST HISTORY</p>
            {history.length === 0 ? (
              <p className="text-sm text-[#008822]">No requests yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setResult(item)}
                    className="w-full p-2 text-left bg-[#0a0a0a] rounded border border-[#222] hover:border-[#00ff41]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          item.status >= 200 && item.status < 300
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                        }`}
                      >
                        {item.method}
                      </span>
                      <span className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-[#008822] ml-auto">
                        {item.time}ms
                      </span>
                    </div>
                    <p className="text-xs text-[#00ff41] truncate">{item.url}</p>
                    <p className="text-xs text-[#008822]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
