"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0d0c",
          color: "#f4efe8",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            border: "1px solid #2e2823",
            borderRadius: 16,
            background: "#14110f",
            padding: 28,
          }}
        >
          <p style={{ color: "#e85d04", fontWeight: 700, margin: 0 }}>
            Roast My X
          </p>
          <h1 style={{ fontSize: 22, margin: "16px 0 8px" }}>
            The whole kitchen went dark.
          </h1>
          <p style={{ color: "#d4cbc0", fontSize: 14, lineHeight: 1.5 }}>
            A top-level crash. Hit retry, or refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#e85d04",
              color: "#1a0e06",
              border: 0,
              borderRadius: 12,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
