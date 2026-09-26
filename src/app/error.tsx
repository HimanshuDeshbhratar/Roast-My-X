"use client";

import ErrorCard from "@/components/ErrorCard";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <ErrorCard
        headline="Something burned that wasn't supposed to."
        detail="An unexpected error popped the oven door. You can retry — or just roast something else."
        onRetry={reset}
      />
    </main>
  );
}
