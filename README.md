# 日本語 クイズ · Nihongo

App de estudio de japonés (Cap 14–17, Nankai): repaso de gramática y vocabulario,
entrenador de conjugación de verbos y una referencia con las reglas de cada grupo.

Hecho con **Astro + React + Tailwind + daisyUI**. Los datos viven en JSON, así que
agregar preguntas o verbos es editar un archivo.

## Estructura

```
src/
  data/verbs.json       ← base de verbos (kanji · furigana · grupo · significado)
  data/questions.json   ← banco de preguntas del quiz
  lib/conjugator.ts     ← reglas de conjugación (ます · ない · た · て · なければ…)
  components/           App · Quiz · Conjugation · Reference · Furigana (React)
  layouts/ · pages/ · styles/
```

## Desarrollo

```sh
pnpm install
pnpm dev       # http://localhost:4321/nihongo
pnpm build     # genera dist/
```

## Deploy

GitHub Pages vía Actions (`.github/workflows/deploy.yml`): cada push a `main`
publica en `https://saccoe.github.io/nihongo/`.
