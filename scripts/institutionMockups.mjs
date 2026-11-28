/**
 * Mockups for the institutional supplies (run with the "institutions" set of
 * scripts/buildCatalogMockups.mjs). Every design is for an invented school,
 * "Kosi Valley Public School", printed onto real photos of blank items
 * (free Pexels licence). Pexels ids of the base photos:
 *
 *   idcard 7319158 · certificate 8533264 · reportCard 8490297 (OMR sheet)
 *   omr 8532969 (letterhead) · diary 5798319 · notebook 6373289
 *   envelope 6373188 (admit card) · envelope2 8250863 (envelopes)
 *   admit 8490293 (report card) · folder 8947699 · prospectus 8217425
 *   calendar 8534221
 */

const NAVY = "#1d3557";
const MAROON = "#8b1e3f";
const INK = "#1f2328";
const GREY = "#8f98a3";
const SCHOOL = "Kosi Valley Public School";
const PLACE = "Manjhili Chowk, Purnia, Bihar 854301";

const GOLD = `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".35" stop-color="#f3d27a"/><stop offset=".55" stop-color="#b8892f"/><stop offset=".8" stop-color="#f7e3a1"/><stop offset="1" stop-color="#9a7228"/></linearGradient>`;

/** The school crest: a shield with an open book and a star (100×100). */
const crest = (fill, detail = "#fff") =>
  `<path d="M50 4 L90 16 V48 C90 74 72 90 50 98 C28 90 10 74 10 48 V16 Z" fill="${fill}"/>
   <path d="M26 52 Q38 45 50 52 Q62 45 74 52 V74 Q62 67 50 74 Q38 67 26 74 Z" fill="${detail}" fill-opacity=".92"/>
   <path d="M50 52 V74" stroke="${fill}" stroke-width="2"/>
   <polygon points="50,18 54,29 66,29 56,36 60,47 50,40 40,47 44,36 34,29 46,29" fill="${detail}" fill-opacity=".92"/>`;

const crestAt = (x, y, size, fill, detail) =>
  `<g transform="translate(${x} ${y}) scale(${size / 100})">${crest(fill, detail)}</g>`;

const text = (
  x,
  y,
  size,
  content,
  {
    fill = INK,
    weight = 400,
    family = "Segoe UI, Arial, sans-serif",
    anchor = "start",
    spacing = 0,
    italic = false,
  } = {},
) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" ${italic ? 'font-style="italic"' : ""} letter-spacing="${spacing}" text-anchor="${anchor}" fill="${fill}">${content}</text>`;
const serif = "Georgia, serif";

/** Crest, school name and town in one row: the header of most documents. */
const schoolHeader = (x, y, w, color, { crestSize = 70, nameSize = 30, sub = PLACE, detail = "#fff" } = {}) =>
  `${crestAt(x, y, crestSize, color, detail)}
   ${text(x + crestSize * 1.18, y + crestSize * 0.48, nameSize, SCHOOL, { fill: color, weight: 700, family: serif })}
   ${text(x + crestSize * 1.18, y + crestSize * 0.48 + nameSize * 0.95, nameSize * 0.45, sub, { fill: color, spacing: 1 })}`;

/** Grey bars standing in for lines of typed text. */
const typedLines = (x, y, widths, { gap = 26, h = 9, fill = GREY, opacity = 0.55 } = {}) =>
  widths
    .map(
      (w, i) =>
        `<rect x="${x}" y="${y + i * gap}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" fill-opacity="${opacity}"/>`,
    )
    .join("");

/* ------------------------------------------------------------------ */
/* Designs                                                             */
/* ------------------------------------------------------------------ */

const idCard = (w, h) => {
  const photoW = w * 0.42;
  const photoH = photoW * 1.2;
  const px = (w - photoW) / 2;
  const py = h * 0.24;
  return `<rect width="${w}" height="${h * 0.19}" fill="${NAVY}"/>
    ${crestAt(w * 0.06, h * 0.028, h * 0.13, "#ffffff", NAVY)}
    ${text(w * 0.3, h * 0.08, h * 0.034, "KOSI VALLEY", { fill: "#fff", weight: 700, spacing: 1 })}
    ${text(w * 0.3, h * 0.125, h * 0.034, "PUBLIC SCHOOL", { fill: "#fff", weight: 700, spacing: 1 })}
    ${text(w * 0.3, h * 0.16, h * 0.018, "PURNIA, BIHAR", { fill: "#cfd8e3", spacing: 2 })}
    <rect x="${px}" y="${py}" width="${photoW}" height="${photoH}" rx="8" fill="#dfe4ea" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="${w / 2}" cy="${py + photoH * 0.38}" r="${photoW * 0.2}" fill="#aab5c2"/>
    <path d="M${px + photoW * 0.14} ${py + photoH} C${px + photoW * 0.14} ${py + photoH * 0.62} ${px + photoW * 0.86} ${py + photoH * 0.62} ${px + photoW * 0.86} ${py + photoH} Z" fill="#aab5c2"/>
    ${text(w / 2, h * 0.64, h * 0.042, "Aarav Kumar", { fill: NAVY, weight: 700, family: serif, anchor: "middle" })}
    ${text(w / 2, h * 0.685, h * 0.026, "Class VIII · Section B", { fill: MAROON, weight: 600, anchor: "middle" })}
    ${[
      ["Roll No.", "21"],
      ["Adm. No.", "KV/2019/0451"],
      ["Blood Group", "B+"],
      ["Phone", "90000 12345"],
    ]
      .map(
        ([k, v], i) =>
          text(w * 0.12, h * (0.75 + i * 0.045), h * 0.024, `${k}`, { fill: GREY }) +
          text(w * 0.88, h * (0.75 + i * 0.045), h * 0.024, v, { fill: INK, weight: 600, anchor: "end" }),
      )
      .join("")}
    <rect y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="${MAROON}"/>
    ${text(w / 2, h * 0.975, h * 0.026, "SESSION 2026–27", { fill: "#fff", weight: 700, anchor: "middle", spacing: 3 })}`;
};

const certificate = (w, h) =>
  `<rect x="${w * 0.04}" y="${h * 0.03}" width="${w * 0.92}" height="${h * 0.94}" fill="none" stroke="${MAROON}" stroke-width="6"/>
   <rect x="${w * 0.065}" y="${h * 0.048}" width="${w * 0.87}" height="${h * 0.904}" fill="none" stroke="#b08a3e" stroke-width="2"/>
   ${crestAt(w / 2 - w * 0.075, h * 0.08, w * 0.15, MAROON)}
   ${text(w / 2, h * 0.255, w * 0.03, SCHOOL.toUpperCase(), { fill: NAVY, weight: 700, anchor: "middle", spacing: 2 })}
   ${text(w / 2, h * 0.35, w * 0.095, "Certificate", { fill: MAROON, family: serif, anchor: "middle" })}
   ${text(w / 2, h * 0.395, w * 0.035, "OF MERIT", { fill: NAVY, weight: 700, anchor: "middle", spacing: 8 })}
   ${text(w / 2, h * 0.47, w * 0.03, "This certificate is proudly presented to", { fill: GREY, anchor: "middle" })}
   ${text(w / 2, h * 0.55, w * 0.075, "Ananya Singh", { fill: NAVY, family: serif, italic: true, anchor: "middle" })}
   <line x1="${w * 0.2}" y1="${h * 0.565}" x2="${w * 0.8}" y2="${h * 0.565}" stroke="#b08a3e" stroke-width="2"/>
   ${text(w / 2, h * 0.62, w * 0.03, "for securing First Position in Class X", { fill: INK, anchor: "middle" })}
   ${text(w / 2, h * 0.655, w * 0.03, "in the Annual Examination 2026–27", { fill: INK, anchor: "middle" })}
   <line x1="${w * 0.12}" y1="${h * 0.84}" x2="${w * 0.38}" y2="${h * 0.84}" stroke="${INK}" stroke-width="1.5"/>
   <line x1="${w * 0.62}" y1="${h * 0.84}" x2="${w * 0.88}" y2="${h * 0.84}" stroke="${INK}" stroke-width="1.5"/>
   ${text(w * 0.25, h * 0.87, w * 0.026, "Class Teacher", { fill: GREY, anchor: "middle" })}
   ${text(w * 0.75, h * 0.87, w * 0.026, "Principal", { fill: GREY, anchor: "middle" })}`;

const certificateSeal = (w, h) =>
  `<g transform="translate(${w / 2} ${h * 0.79})">
     ${Array.from({ length: 24 }, (_, i) => `<polygon points="0,-${w * 0.085} ${w * 0.012},-${w * 0.065} -${w * 0.012},-${w * 0.065}" transform="rotate(${i * 15})" fill="url(#gold)"/>`).join("")}
     <circle r="${w * 0.068}" fill="url(#gold)"/><circle r="${w * 0.052}" fill="none" stroke="#7a5a1c" stroke-width="1.5"/>
     ${text(0, w * 0.012, w * 0.022, "MERIT", { fill: "#6b4c14", weight: 700, anchor: "middle", spacing: 2 })}
   </g>`;

const reportCard = (w, h) => {
  const rows = [
    ["English", 86, 91, "A1"],
    ["Hindi", 78, 82, "A2"],
    ["Mathematics", 92, 95, "A1"],
    ["Science", 88, 90, "A1"],
    ["Social Science", 81, 85, "A2"],
    ["Computer", 95, 97, "A1"],
    ["Art Education", 90, 92, "A1"],
  ];
  const tx = w * 0.07;
  const tw = w * 0.86;
  const ty = h * 0.33;
  const rh = h * 0.042;
  const cols = [0, 0.48, 0.66, 0.84];
  return `${crestAt(w / 2 - w * 0.09, h * 0.035, w * 0.18, NAVY)}
    ${text(w / 2, h * 0.135, w * 0.05, SCHOOL, { fill: NAVY, weight: 700, family: serif, anchor: "middle" })}
    ${text(w / 2, h * 0.16, w * 0.026, PLACE, { fill: GREY, anchor: "middle" })}
    <rect x="${tx}" y="${h * 0.18}" width="${tw}" height="${h * 0.035}" fill="${MAROON}"/>
    ${text(w / 2, h * 0.205, w * 0.036, "PROGRESS REPORT · 2026–27", { fill: "#fff", weight: 700, anchor: "middle", spacing: 2 })}
    ${[
      ["Name", "Ananya Singh"],
      ["Class", "X – A"],
      ["Roll No.", "07"],
    ]
      .map(
        ([k, v], i) =>
          text(tx, h * (0.25 + i * 0.026), w * 0.03, `${k}:`, { fill: GREY }) +
          text(tx + w * 0.2, h * (0.25 + i * 0.026), w * 0.03, v, { fill: INK, weight: 600 }),
      )
      .join("")}
    <rect x="${tx}" y="${ty}" width="${tw}" height="${rh}" fill="${NAVY}"/>
    ${["Subject", "Term 1", "Term 2", "Grade"].map((c, i) => text(tx + tw * cols[i] + 8, ty + rh * 0.68, w * 0.028, c, { fill: "#fff", weight: 700 })).join("")}
    ${rows
      .map((row, r) => {
        const y = ty + rh * (r + 1);
        return `<rect x="${tx}" y="${y}" width="${tw}" height="${rh}" fill="${r % 2 ? "#eef1f5" : "#fff"}" stroke="#c9d1da" stroke-width="1"/>${row
          .map((c, i) =>
            text(tx + tw * cols[i] + 8, y + rh * 0.68, w * 0.028, c, { fill: INK, weight: i === 3 ? 700 : 400 }),
          )
          .join("")}`;
      })
      .join("")}
    ${text(tx, ty + rh * 9, w * 0.03, "Attendance: 192 / 200 days", { fill: INK })}
    ${text(tx, ty + rh * 10, w * 0.034, "Result: PROMOTED TO CLASS XI", { fill: MAROON, weight: 700 })}
    <line x1="${tx}" y1="${h * 0.93}" x2="${tx + tw * 0.38}" y2="${h * 0.93}" stroke="${INK}"/>
    <line x1="${tx + tw * 0.62}" y1="${h * 0.93}" x2="${tx + tw}" y2="${h * 0.93}" stroke="${INK}"/>
    ${text(tx + tw * 0.19, h * 0.955, w * 0.026, "Class Teacher", { fill: GREY, anchor: "middle" })}
    ${text(tx + tw * 0.81, h * 0.955, w * 0.026, "Principal", { fill: GREY, anchor: "middle" })}`;
};

const omrSheet = (w, h) => {
  const red = "#c8324a";
  const filled = new Set([
    "r0-2",
    "r1-0",
    "r2-2",
    "r3-7",
    "r4-1",
    "q1-1",
    "q2-3",
    "q3-0",
    "q4-2",
    "q5-1",
    "q6-0",
    "q7-3",
    "q8-2",
    "q9-1",
    "q10-0",
    "q11-2",
    "q12-3",
    "q13-1",
    "q16-0",
    "q17-2",
    "q18-1",
  ]);
  let marks = "";
  for (let i = 0; i < 26; i += 1)
    marks += `<rect x="${w * 0.015}" y="${h * 0.28 + i * h * 0.026}" width="${w * 0.04}" height="${h * 0.01}" fill="#111"/>`;
  // Roll number: 5 columns of 0–9.
  let roll = "";
  for (let c = 0; c < 5; c += 1) {
    for (let d = 0; d < 10; d += 1) {
      const cx = w * (0.14 + c * 0.075);
      const cy = h * (0.205 + d * 0.0175);
      roll += `<circle cx="${cx}" cy="${cy}" r="${w * 0.018}" fill="${filled.has(`r${c}-${d}`) ? "#111" : "none"}" stroke="${red}" stroke-width="1.5"/>`;
    }
  }
  // Questions 1–40 in two columns, A–D.
  let questions = "";
  for (let q = 0; q < 40; q += 1) {
    const col = q < 20 ? 0 : 1;
    const row = q % 20;
    const x0 = w * (0.13 + col * 0.44);
    const y = h * (0.42 + row * 0.0265);
    questions += text(x0, y + w * 0.012, w * 0.03, `${q + 1}`.padStart(2, "0"), { fill: red, weight: 700 });
    for (let o = 0; o < 4; o += 1) {
      const cx = x0 + w * (0.1 + o * 0.075);
      questions += `<circle cx="${cx}" cy="${y}" r="${w * 0.02}" fill="${filled.has(`q${q + 1}-${o}`) ? "#111" : "none"}" stroke="${red}" stroke-width="1.5"/>${filled.has(`q${q + 1}-${o}`) ? "" : text(cx, y + w * 0.009, w * 0.02, "ABCD"[o], { fill: red, anchor: "middle" })}`;
    }
  }
  return `${marks}
    ${crestAt(w * 0.09, h * 0.035, w * 0.13, NAVY)}
    ${text(w * 0.25, h * 0.06, w * 0.045, SCHOOL, { fill: NAVY, weight: 700, family: serif })}
    ${text(w * 0.25, h * 0.08, w * 0.03, "ANNUAL EXAMINATION 2026–27", { fill: red, weight: 700, spacing: 1 })}
    <rect x="${w * 0.09}" y="${h * 0.1}" width="${w * 0.84}" height="${h * 0.028}" fill="${red}"/>
    ${text(w / 2, h * 0.12, w * 0.032, "OMR ANSWER SHEET", { fill: "#fff", weight: 700, anchor: "middle", spacing: 3 })}
    ${text(w * 0.1, h * 0.16, w * 0.028, "Name ____________________", { fill: INK })}
    ${text(w * 0.1, h * 0.185, w * 0.026, "ROLL NUMBER", { fill: red, weight: 700 })}
    ${roll}
    <rect x="${w * 0.56}" y="${h * 0.195}" width="${w * 0.36}" height="${h * 0.17}" fill="none" stroke="${red}" stroke-width="1.5"/>
    ${text(w * 0.74, h * 0.215, w * 0.024, "INSTRUCTIONS", { fill: red, weight: 700, anchor: "middle" })}
    ${typedLines(w * 0.59, h * 0.23, [w * 0.3, w * 0.26, w * 0.29, w * 0.22, w * 0.27], { gap: h * 0.022, h: 5 })}
    ${questions}
    ${text(w * 0.1, h * 0.97, w * 0.026, "Signature of Invigilator ______________", { fill: INK })}`;
};

const letterhead = (w, h) =>
  `${schoolHeader(w * 0.08, h * 0.04, w, NAVY, { crestSize: w * 0.12, nameSize: w * 0.045 })}
   <rect x="${w * 0.08}" y="${h * 0.15}" width="${w * 0.84}" height="${h * 0.006}" fill="${MAROON}"/>
   <rect x="${w * 0.08}" y="${h * 0.159}" width="${w * 0.84}" height="${h * 0.002}" fill="#b08a3e"/>
   ${text(w * 0.08, h * 0.2, w * 0.024, "Ref. No. KVPS/ADM/2026/118", { fill: GREY })}
   ${text(w * 0.92, h * 0.2, w * 0.024, "Date: 12 July 2026", { fill: GREY, anchor: "end" })}
   ${typedLines(w * 0.08, h * 0.25, [w * 0.18, w * 0.42, w * 0.36], { gap: h * 0.022 })}
   ${typedLines(w * 0.08, h * 0.35, [w * 0.84, w * 0.8, w * 0.83, w * 0.78, w * 0.81, w * 0.5], { gap: h * 0.024 })}
   ${typedLines(w * 0.08, h * 0.52, [w * 0.82, w * 0.84, w * 0.79, w * 0.4], { gap: h * 0.024 })}
   ${typedLines(w * 0.62, h * 0.7, [w * 0.2, w * 0.28], { gap: h * 0.024 })}
   <rect x="0" y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="${NAVY}"/>
   ${text(w / 2, h * 0.972, w * 0.022, `${PLACE}  ·  +91 90000 12345`, { fill: "#fff", anchor: "middle" })}`;

const envelopeFront = (w, h) =>
  `${schoolHeader(w * 0.04, h * 0.07, w, NAVY, { crestSize: h * 0.2, nameSize: h * 0.075 })}
   ${text(w * 0.04, h * 0.93, h * 0.05, "ON SCHOOL SERVICE", { fill: MAROON, weight: 700, spacing: 3 })}
   ${text(w * 0.55, h * 0.5, h * 0.05, "To,", { fill: GREY })}
   ${typedLines(w * 0.55, h * 0.56, [w * 0.3, w * 0.36, w * 0.28, w * 0.22], { gap: h * 0.08, h: h * 0.025 })}`;

const admitCard = (w, h) =>
  `<rect width="${w}" height="${h * 0.2}" fill="${NAVY}"/>
   ${crestAt(w * 0.03, h * 0.025, h * 0.15, "#fff", NAVY)}
   ${text(w * 0.17, h * 0.095, h * 0.06, SCHOOL, { fill: "#fff", weight: 700, family: serif })}
   ${text(w * 0.17, h * 0.16, h * 0.035, "ANNUAL EXAMINATION 2027", { fill: "#cfd8e3", spacing: 2 })}
   ${text(w / 2, h * 0.29, h * 0.06, "ADMIT CARD", { fill: MAROON, weight: 700, anchor: "middle", spacing: 6 })}
   ${[
     ["Name", "Aarav Kumar"],
     ["Roll No.", "2027-0451"],
     ["Class", "X – A"],
     ["Centre", "Main Campus, Purnia"],
   ]
     .map(
       ([k, v], i) =>
         text(w * 0.05, h * (0.4 + i * 0.075), h * 0.038, `${k}`, { fill: GREY }) +
         text(w * 0.22, h * (0.4 + i * 0.075), h * 0.038, v, { fill: INK, weight: 600 }),
     )
     .join("")}
   <rect x="${w * 0.76}" y="${h * 0.34}" width="${w * 0.19}" height="${h * 0.36}" fill="#dfe4ea" stroke="${NAVY}" stroke-width="2"/>
   ${text(w * 0.855, h * 0.53, h * 0.03, "PHOTO", { fill: GREY, anchor: "middle", spacing: 2 })}
   <rect x="${w * 0.05}" y="${h * 0.72}" width="${w * 0.9}" height="${h * 0.15}" fill="none" stroke="#c9d1da"/>
   ${["Maths  ·  2 Mar", "Science  ·  6 Mar", "English  ·  10 Mar"].map((t, i) => text(w * (0.08 + i * 0.3), h * 0.81, h * 0.032, t, { fill: INK })).join("")}
   <line x1="${w * 0.62}" y1="${h * 0.94}" x2="${w * 0.95}" y2="${h * 0.94}" stroke="${INK}"/>
   ${text(w * 0.785, h * 0.98, h * 0.026, "Controller of Examinations", { fill: GREY, anchor: "middle" })}`;

const folderFront = (w, h) =>
  `${crestAt(w / 2 - w * 0.13, 0, w * 0.26, "#2b2118", "#c9a77a")}
   ${text(w / 2, h * 0.78, w * 0.068, SCHOOL, { fill: "#2b2118", weight: 700, family: serif, anchor: "middle" })}
   ${text(w / 2, h * 0.92, w * 0.034, "PURNIA, BIHAR", { fill: "#2b2118", anchor: "middle", spacing: 4 })}`;

const folderLabel = (w, h) =>
  `${text(w * 0.1, h * 0.18, w * 0.07, "EXAMINATION", { fill: INK, weight: 700, spacing: 2 })}
   ${text(w * 0.1, h * 0.28, w * 0.07, "RECORDS", { fill: INK, weight: 700, spacing: 2 })}
   ${text(w * 0.1, h * 0.4, w * 0.05, "Class X · 2026–27", { fill: MAROON, weight: 600 })}
   ${["Section", "Teacher", "Room"].map((k, i) => `${text(w * 0.1, h * (0.56 + i * 0.12), w * 0.045, k, { fill: GREY })}<line x1="${w * 0.4}" y1="${h * (0.56 + i * 0.12)}" x2="${w * 0.9}" y2="${h * (0.56 + i * 0.12)}" stroke="${GREY}"/>`).join("")}`;

const prospectusBlocks = (w, h) =>
  `<rect width="${w}" height="${h * 0.52}" fill="${NAVY}"/>
   <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${w * 0.22}" fill="#2a4a74"/>
   <circle cx="${w * 0.05}" cy="${h * 0.48}" r="${w * 0.14}" fill="#2a4a74"/>
   ${[0, 1, 2].map((i) => `<circle cx="${w * (0.2 + i * 0.3)}" cy="${h * 0.74}" r="${w * 0.07}" fill="${["#f3d27a", "#e9b6c2", "#bcd7e6"][i]}"/>`).join("")}
   ${["Smart classes", "Science labs", "Sports"].map((t, i) => text(w * (0.2 + i * 0.3), h * 0.84, w * 0.035, t, { fill: INK, anchor: "middle", weight: 600 })).join("")}
   ${text(w / 2, h * 0.6, w * 0.045, "Admissions open · Nursery to Class XII", { fill: MAROON, weight: 700, anchor: "middle" })}
   <rect y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="${MAROON}"/>`;

const prospectusLight = (w, h) =>
  `${crestAt(w / 2 - w * 0.09, h * 0.07, w * 0.18, "#ffffff", NAVY)}
   ${text(w / 2, h * 0.3, w * 0.05, SCHOOL.toUpperCase(), { fill: "#fff", weight: 700, anchor: "middle", spacing: 1 })}
   ${text(w / 2, h * 0.41, w * 0.115, "Prospectus", { fill: "#fff", family: serif, anchor: "middle" })}
   ${text(w / 2, h * 0.47, w * 0.05, "2026 – 27", { fill: "#f3d27a", weight: 700, anchor: "middle", spacing: 4 })}
   ${text(w / 2, h * 0.975, w * 0.03, "Purnia, Bihar", { fill: "#fff", anchor: "middle", spacing: 3 })}`;

const calendarPage = (w, h) => {
  const start = new Date(Date.UTC(2026, 6, 1)).getUTCDay(); // July 2026
  const gx = w * 0.07;
  const gw = w * 0.86;
  const cw = gw / 7;
  const gy = h * 0.43;
  const rh = h * 0.085;
  let grid = "";
  "SMTWTFS"
    .split("")
    .forEach(
      (d, i) =>
        (grid += text(gx + cw * (i + 0.5), gy, w * 0.04, d, {
          fill: i === 0 ? MAROON : GREY,
          weight: 700,
          anchor: "middle",
        })),
    );
  for (let day = 1; day <= 31; day += 1) {
    const pos = start + day - 1;
    const col = pos % 7;
    const row = Math.floor(pos / 7);
    grid += text(gx + cw * (col + 0.5), gy + rh * (row + 1), w * 0.052, day, {
      fill: col === 0 ? MAROON : INK,
      anchor: "middle",
      weight: col === 0 ? 700 : 400,
    });
  }
  return `${crestAt(w * 0.07, h * 0.06, w * 0.14, NAVY)}
    ${text(w * 0.25, h * 0.1, w * 0.045, "Kosi Valley", { fill: NAVY, weight: 700, family: serif })}
    ${text(w * 0.25, h * 0.135, w * 0.045, "Public School", { fill: NAVY, weight: 700, family: serif })}
    ${text(w * 0.07, h * 0.3, w * 0.12, "July", { fill: MAROON, family: serif })}
    ${text(w * 0.93, h * 0.3, w * 0.06, "2026", { fill: NAVY, weight: 700, anchor: "end" })}
    <rect x="${gx}" y="${h * 0.34}" width="${gw}" height="2" fill="#b08a3e"/>
    ${grid}
    ${text(w / 2, h * 0.97, w * 0.03, "School reopens 1 July · Session 2026–27", { fill: GREY, anchor: "middle" })}`;
};

const exerciseCoverBand = (w, h) =>
  `<rect width="${w}" height="${h * 0.34}" fill="#1f6f78"/>
   ${Array.from({ length: 9 }, (_, i) => `<circle cx="${(i % 3) * w * 0.4 + w * 0.1}" cy="${Math.floor(i / 3) * h * 0.12 + h * 0.05}" r="${w * 0.05}" fill="#2b8790"/>`).join("")}
   <rect x="${w * 0.1}" y="${h * 0.52}" width="${w * 0.8}" height="${h * 0.32}" rx="14" fill="none" stroke="#1f6f78" stroke-width="3"/>
   ${["Name", "Class", "Subject", "School"].map((k, i) => `${text(w * 0.15, h * (0.6 + i * 0.065), w * 0.045, k, { fill: "#1f6f78", weight: 600 })}<line x1="${w * 0.36}" y1="${h * (0.6 + i * 0.065)}" x2="${w * 0.85}" y2="${h * (0.6 + i * 0.065)}" stroke="#1f6f78" stroke-width="1.5"/>`).join("")}
   ${text(w / 2, h * 0.95, w * 0.035, "EXERCISE BOOK · 172 PAGES · RULED", { fill: "#1f6f78", anchor: "middle", spacing: 2, weight: 600 })}`;

const exerciseCoverLight = (w, h) =>
  `${crestAt(w / 2 - w * 0.08, h * 0.04, w * 0.16, "#ffffff", "#1f6f78")}
   ${text(w / 2, h * 0.24, w * 0.058, SCHOOL, { fill: "#fff", weight: 700, family: serif, anchor: "middle" })}
   ${text(w / 2, h * 0.29, w * 0.032, "PURNIA, BIHAR", { fill: "#d8eef0", anchor: "middle", spacing: 4 })}`;

const diaryCover = (w, h) =>
  `${crestAt(w / 2 - w * 0.13, h * 0.17, w * 0.26, "url(#gold)", "#1d3557")}
   ${text(w / 2, h * 0.5, w * 0.085, "STUDENT DIARY", { fill: "url(#gold)", weight: 700, anchor: "middle", spacing: 3 })}
   ${text(w / 2, h * 0.58, w * 0.065, "2026 – 27", { fill: "url(#gold)", family: serif, anchor: "middle", spacing: 4 })}
   <rect x="${w * 0.25}" y="${h * 0.63}" width="${w * 0.5}" height="2" fill="url(#gold)"/>
   ${text(w / 2, h * 0.86, w * 0.048, SCHOOL, { fill: "url(#gold)", family: serif, anchor: "middle" })}`;

/* ------------------------------------------------------------------ */

export const INSTITUTION_MOCKUPS = [
  {
    id: "student-id-cards",
    base: "idcard",
    crop: { left: 0, top: 650, size: 1600 },
    layers: [{ w: 530, h: 840, cx: 727, cy: 1625, body: idCard(530, 840), blend: "multiply" }],
  },
  {
    id: "merit-certificates",
    base: "certificate",
    crop: { left: 0, top: 420, size: 1600 },
    layers: [
      { w: 600, h: 830, cx: 792, cy: 1220, body: certificate(600, 830), blend: "multiply" },
      { w: 600, h: 830, cx: 792, cy: 1220, body: certificateSeal(600, 830), defs: GOLD, blend: "over" },
    ],
  },
  {
    id: "progress-report-cards",
    base: "admit",
    crop: { left: 0, top: 420, size: 1600 },
    layers: [
      {
        w: 470,
        h: 1050,
        origin: [504, 752],
        xVec: [469, -48],
        yVec: [208, 1051],
        body: reportCard(470, 1050),
        blend: "multiply",
      },
    ],
  },
  {
    id: "omr-answer-sheets",
    base: "reportCard",
    crop: { left: 0, top: 380, size: 1600 },
    layers: [{ w: 560, h: 1260, cx: 797, cy: 1310, body: omrSheet(560, 1260), blend: "multiply" }],
  },
  {
    id: "school-diary",
    base: "diary",
    crop: { left: 70, top: 0, size: 1060 },
    layers: [
      {
        w: 400,
        h: 700,
        origin: [412, 99],
        xVec: [388, 89],
        yVec: [8, 691],
        body: `<rect width="400" height="700" fill="#1d3557"/>`,
        blend: "multiply",
      },
      {
        w: 400,
        h: 700,
        origin: [412, 99],
        xVec: [388, 89],
        yVec: [8, 691],
        body: diaryCover(400, 700),
        defs: GOLD,
        blend: "over",
      },
    ],
  },
  {
    id: "exercise-notebooks",
    base: "notebook",
    crop: { left: 400, top: 0, size: 1067 },
    layers: [
      { w: 478, h: 706, cx: 941, cy: 575, body: exerciseCoverBand(478, 706), blend: "multiply" },
      { w: 478, h: 706, cx: 941, cy: 575, body: exerciseCoverLight(478, 706), blend: "over" },
    ],
  },
  {
    id: "school-letterheads",
    base: "omr",
    crop: { left: 0, top: 200, size: 1600 },
    layers: [{ w: 800, h: 1130, cx: 848, cy: 980, body: letterhead(800, 1130), blend: "multiply" }],
  },
  {
    id: "official-envelopes",
    base: "envelope2",
    crop: { left: 0, top: 500, size: 1600 },
    layers: [
      {
        w: 920,
        h: 380,
        origin: [429, 1333],
        xVec: [854, -458],
        yVec: [230, 331],
        body: envelopeFront(920, 380),
        blend: "multiply",
      },
      {
        w: 900,
        h: 340,
        origin: [157, 973],
        xVec: [822, -405],
        yVec: [211, 275],
        body: envelopeFront(900, 340),
        blend: "multiply",
      },
    ],
  },
  {
    id: "admit-cards",
    base: "envelope",
    crop: { left: 0, top: 0, size: 1067 },
    layers: [{ w: 640, h: 425, cx: 568, cy: 642, body: admitCard(640, 425), blend: "multiply" }],
  },
  {
    id: "exam-document-folders",
    base: "folder",
    crop: { left: 0, top: 750, size: 1600 },
    layers: [
      { w: 520, h: 420, cx: 790, cy: 1230, angle: 1, body: folderFront(520, 420), blend: "multiply" },
      { w: 420, h: 590, cx: 924, cy: 1828, angle: 1, body: folderLabel(420, 590), blend: "multiply" },
    ],
  },
  {
    id: "school-prospectus",
    base: "prospectus",
    crop: { left: 266, top: 0, size: 1067 },
    layers: [
      { w: 508, h: 682, cx: 788, cy: 555, body: prospectusBlocks(508, 682), blend: "multiply" },
      { w: 508, h: 682, cx: 788, cy: 555, body: prospectusLight(508, 682), blend: "over" },
    ],
  },
  {
    id: "desk-calendars",
    base: "calendar",
    crop: { left: 0, top: 640, size: 1600 },
    layers: [{ w: 460, h: 700, cx: 1062, cy: 1705, body: calendarPage(460, 700), blend: "multiply" }],
  },
];
