/**
 * Curated print-friendly graphics. Each entry is a single filled SVG path
 * in a 24×24 viewBox — rendered as an SVG on the stage and via Path2D at
 * print resolution, so they stay vector-crisp at any product size.
 */
export const GRAPHICS = [
  {
    id: "star",
    label: "Star",
    pathData:
      "M12 2l2.9 6.26L21.5 9.1l-4.9 4.5 1.3 6.7L12 16.9l-5.9 3.4 1.3-6.7-4.9-4.5 6.6-.84L12 2z",
  },
  {
    id: "heart",
    label: "Heart",
    pathData:
      "M12 21s-7.5-4.9-10-9.5C.3 8 2 4.5 5.5 4.5c2 0 3.5 1.2 4.5 2.6 1-1.4 2.5-2.6 4.5-2.6C18 4.5 21.7 8 20 11.5 17.5 16.1 12 21 12 21z",
  },
  {
    id: "badge",
    label: "Badge",
    pathData:
      "M12 1l2.4 2.4 3.3-.6.6 3.3L21.7 8l-1.5 3 1.5 3-3.4 1.9-.6 3.3-3.3-.6L12 21l-2.4-2.4-3.3.6-.6-3.3L2.3 14l1.5-3-1.5-3 3.4-1.9.6-3.3 3.3.6L12 1z",
  },
  {
    id: "leaf",
    label: "Leaf",
    pathData:
      "M21 3c-9 0-16 4-17.5 12.5-.3 1.8-.5 3.7-.5 5.5 1.8 0 3.7-.2 5.5-.5C17 19 21 12 21 3z",
  },
  {
    id: "diamond",
    label: "Diamond",
    pathData: "M12 1l6 6-6 16L6 7l6-6z",
  },
  {
    id: "sun",
    label: "Sun",
    pathData:
      "M12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5zM11 0h2v4h-2V0zm0 20h2v4h-2v-4zM0 11h4v2H0v-2zm20 0h4v2h-4v-2zM3.5 5L5 3.5 7.8 6.3 6.3 7.8 3.5 5zm12.7 12.7l1.5-1.5 2.8 2.8-1.5 1.5-2.8-2.8zM3.5 19l2.8-2.8 1.5 1.5L5 20.5 3.5 19zM16.2 6.3L19 3.5 20.5 5l-2.8 2.8-1.5-1.5z",
  },
  {
    id: "moon",
    label: "Moon",
    pathData:
      "M21 15.5A9.5 9.5 0 0 1 8.5 3 9.5 9.5 0 1 0 21 15.5z",
  },
  {
    id: "bolt",
    label: "Bolt",
    pathData: "M13 1L4 14h6l-2 9 9-13h-6l2-9z",
  },
  {
    id: "check-circle",
    label: "Check",
    pathData:
      "M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1zm-1.6 15.6l-4.2-4.2 1.7-1.7 2.5 2.5 5.7-5.7 1.7 1.7z",
  },
  {
    id: "flower",
    label: "Flower",
    pathData:
      "M12 8.5a3.5 3.5 0 1 1 3.5-3.5A3.5 3.5 0 0 1 12 8.5zm0 15a3.5 3.5 0 1 1 3.5-3.5A3.5 3.5 0 0 1 12 23.5zM4.5 16A3.5 3.5 0 1 1 8 12.5 3.5 3.5 0 0 1 4.5 16zm15 0a3.5 3.5 0 1 1 3.5-3.5A3.5 3.5 0 0 1 19.5 16zM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3z",
  },
  {
    id: "ribbon",
    label: "Ribbon",
    pathData:
      "M12 2a7 7 0 0 0-3 13.3V22l3-2 3 2v-6.7A7 7 0 0 0 12 2z",
  },
  {
    id: "quote",
    label: "Quote",
    pathData:
      "M10 4H4v8h4c0 3-1 5-4 6v2c5-1 8-4 8-10V4zm12 0h-6v8h4c0 3-1 5-4 6v2c5-1 8-4 8-10V4z",
  },
];
