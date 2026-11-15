"use client";

export function PrintButton() {
  return (
    <button className="btn btn-text no-print !min-h-9 text-sm" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
