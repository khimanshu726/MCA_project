# Inkwell Press

React + Vite storefront for a print shop with:

- product listing and detail pages
- image gallery and customization preview
- persistent cart with shared cart state
- cart + checkout flow
- saved delivery addresses with validation and city autocomplete

## Tech Stack

- React
- Vite
- React Router
- Context API + `useReducer`
- localStorage persistence

## Getting Started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually:

- `http://localhost:5173`

## Production Build

```bash
npm run build
```

## Production Preview

```bash
npm run preview:prod
```

## Project Structure

```text
src/
  assets/
  components/
  context/
  data/
  pages/
  utils/
```

## Notes

- `public/images` contains product images
- `src/assets/images` contains static UI images
- `uploads/` is reserved as a backend-facing upload reference folder
