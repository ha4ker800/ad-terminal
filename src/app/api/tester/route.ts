import { NextRequest, NextResponse } from "next/server";

interface TestRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// POST /api/tester - Test HTTP endpoints
export async function POST(request: NextRequest) {
  try {
    const body: TestRequest = await request.json();
    const { method, url, headers = {}, body: requestBody, timeout = 30000 } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    };

    if (requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = requestBody;
    }

    // Make the request
    const response = await fetch(url, fetchOptions);
    const endTime = Date.now();
    
    // Get response details
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get response body
    let responseBody: string;
    const contentType = response.headers.get("content-type") || "";
    
    try {
      if (contentType.includes("application/json")) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }
    } catch {
      responseBody = "[Unable to parse response body]";
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time: endTime - startTime,
      size: new Blob([responseBody]).size,
    });
  } catch (error) {
    console.error("[AD TERMINAL :: API ERROR] API test failed:", error);
    
    let errorMessage = "Request failed";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timeout";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/tester - Get tester status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AD TERMINAL API Tester ready",
    supportedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  });
}
