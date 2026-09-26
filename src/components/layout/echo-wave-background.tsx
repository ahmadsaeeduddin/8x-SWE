const waves = [
  { delay: "0s", duration: "14s" },
  { delay: "-2.8s", duration: "14s" },
  { delay: "-5.6s", duration: "14s" },
  { delay: "-8.4s", duration: "14s" },
  { delay: "-11.2s", duration: "14s" },
];

export function EchoWaveBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_5%,rgba(255,122,26,0.08),transparent_35rem),radial-gradient(circle_at_10%_90%,rgba(100,211,255,0.045),transparent_38rem)]" />
      <div className="echo-wave-stage absolute inset-0">
        {waves.map((wave, index) => (
          <span
            key={index}
            className="echo-wave-ring"
            style={{ animationDelay: wave.delay, animationDuration: wave.duration }}
          />
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#05050a] via-[#05050a]/65 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#05050a]/75 to-transparent" />
    </div>
  );
}
