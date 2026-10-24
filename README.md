# 日本語 クイズ · Nihongo

App de estudio de japonés: repaso de gramática y vocabulario,
entrenador de conjugación de verbos, práctica de kanji del Basic Kanji Book 1
y una referencia con las reglas de cada grupo.

Hecho con **Astro + React + Tailwind + daisyUI**. Los datos viven en JSON, así que
agregar preguntas o verbos es editar un archivo.

## Estructura

```
src/
  data/items.json        ← léxico (verbos, sustantivos, adjetivos…)
  data/exercises.json    ← banco de preguntas del repaso
  data/lessons.json      ← capítulos (agrupan ejercicios)
  data/kanji.json        ← los 251 kanji del BKB1 (lección · on · kun · significado)
  data/kanji-words.json  ← palabras con esos kanji, en furigana: [新|しん][聞|ぶん]
  lib/conjugator.ts      ← reglas de conjugación (ます · ない · た · て · なければ…)
  lib/kanji.ts           ← arma los ejercicios de kanji y sus distractores
  components/            QuizRunner · Quiz · KanjiQuiz · ConjugationCard · Reference…
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
publica en `https://esacco.dev/nihongo/`.
