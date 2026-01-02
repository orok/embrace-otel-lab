import { useState } from "react";

export default function App() {
  const [result, setResult] = useState<string>("");

  async function doSuccessFetch() {
    setResult("Loading...");
    const res = await fetch("https://httpbin.org/status/200");
    setResult(`Success: ${res.status}`);
  }

  async function doErrorFetch() {
    setResult("Loading...");
    const res = await fetch("https://httpbin.org/status/500");
    setResult(`Error: ${res.status}`);
  }

  async function doSlowFetch() {
    setResult("Loading...");
    const res = await fetch("https://httpbin.org/delay/2");
    setResult(`Slow response: ${res.status}`);
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Embrace + OpenTelemetry Local Lab</h1>
      <p>
        Click buttons to generate network activity and verify traces in Jaeger.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={doSuccessFetch}>Success fetch (200)</button>
        <button onClick={doErrorFetch}>Error fetch (500)</button>
        <button onClick={doSlowFetch}>Slow fetch (2s)</button>
      </div>

      <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12 }}>
        {result}
      </pre>

      <p style={{ marginTop: 16 }}>
        Jaeger UI: <a href="http://localhost:16686">http://localhost:16686</a>
      </p>
    </div>
  );
}
