export function BackgroundPatterns() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(128_90_213_/_0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(128_90_213_/_0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Sparkle Pattern - Layer 1 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:32px_32px] animate-[twinkle_4s_ease-in-out_infinite]"></div>
      {/* Sparkle Pattern - Layer 2 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:48px_48px] animate-[twinkle_6s_ease-in-out_infinite_0.5s]"></div>
    </div>
  );
}
