type SceneProps = { theme: "ocean" | "forest"; className?: string };

/** Project-authored symbolic vector scene. Not a map or landmark photograph. */
export function DestinationScene({ theme, className }: SceneProps) {
  const forest = theme === "forest";
  return (
    <svg viewBox="0 0 560 340" className={className} aria-hidden="true" focusable="false">
      <rect width="560" height="340" rx="28" fill={forest ? "#e4eddd" : "#d4edef"} />
      <circle cx="424" cy="81" r="34" fill="#f9c75f" />
      <path d="M56 76h67m-42-16h20M298 50h63" stroke="#fffaf0" strokeWidth="12" strokeLinecap="round" />
      {forest ? (
        <>
          <path d="M0 236Q110 95 280 208T560 171V340H0Z" fill="#a5bd92" />
          <path d="M0 285Q200 175 368 252T560 242V340H0Z" fill="#61836b" />
          {[95, 157, 395, 461].map((x, index) => (
            <g key={x} transform={`translate(${x} ${125 + (index % 2) * 32})`}>
              <path d="M0 102V0" stroke="#375247" strokeWidth="9" strokeLinecap="round" />
              <path d="M0-20L-29 36h15l-24 35h76L14 36h15Z" fill="#325d4a" />
            </g>
          ))}
          <path d="M204 226v-74h111v74" fill="#fff7e9" stroke="#375247" strokeWidth="4" />
          <path d="M189 156l69-55 73 55Z" fill="#d67a65" stroke="#375247" strokeWidth="4" strokeLinejoin="round" />
          <path d="M241 226v-41h28v41m21-55h12v16h-12" fill="#e8ad64" stroke="#375247" strokeWidth="3" />
          <path d="M255 237q-30 26 25 103" fill="none" stroke="#dcd1aa" strokeWidth="33" />
        </>
      ) : (
        <>
          <path d="M0 200q90-53 170-8t179-26t211 8v166H0Z" fill="#81c7cf" />
          <path d="M0 253q105-24 224 7t336-24v104H0Z" fill="#fff1ce" />
          <path d="M13 221q48-17 93 0m236 1q62-17 126 0M45 245l81 2m270-55h57" fill="none" stroke="#f6faf2" strokeWidth="6" strokeLinecap="round" />
          <path d="M253 235v-79h67v79" fill="#f2ac85" stroke="#345f66" strokeWidth="4" />
          <path d="M239 160l47-71 49 71Z" fill="#df765e" stroke="#345f66" strokeWidth="4" strokeLinejoin="round" />
          <path d="M277 236v-34h18v34m-21-64h25" fill="#fff7e9" stroke="#345f66" strokeWidth="4" />
          <path d="M114 287v-92m0 0q-31-40-55-9m55 9q31-43 59-11m-59 11q0-47 27-47" fill="none" stroke="#477464" strokeWidth="11" strokeLinecap="round" />
          <path d="M391 305v-59m-32 0q32-44 65 0Z" fill="#e68c76" stroke="#345f66" strokeWidth="4" />
        </>
      )}
      <g transform="translate(475 275)">
        <ellipse rx="27" ry="32" fill="#fff7e9" stroke="#375247" strokeWidth="4" />
        <path d="M-30-13q31-34 60 0" fill="#f9c75f" stroke="#375247" strokeWidth="4" />
        <circle cx="-9" cy="-1" r="3" fill="#263238" /><circle cx="9" cy="-1" r="3" fill="#263238" />
        <path d="M-7 10q7 8 14 0" fill="none" stroke="#263238" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
