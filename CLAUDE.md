# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository is **not yet scaffolded**. As of this writing it contains only `README.md`
and `.gitignore`. There is no `package.json`, no source code, no tests, and no NestJS
application yet.

The stated intent (`README.md` + the NestJS-oriented `.gitignore`) is to build **a weather
app using [NestJS](https://nestjs.com/)** (Node.js / TypeScript).

> **Action for future instances:** Once the project is scaffolded, replace the placeholder
> sections below with the real commands and architecture. Do not document anything that does
> not yet exist in the tree.

## Scaffolding the project

Nothing here is fixed yet, but the `.gitignore` (`/dist`, `/node_modules`, `/build`) confirms
a standard NestJS layout is intended. To bootstrap:

```bash
npm i -g @nestjs/cli      # or use: npx @nestjs/cli ...
nest new .                # scaffold into this directory
```

The package manager is not yet decided — the `.gitignore` carries the default Nest template's
references to npm, pnpm, and yarn. Pick one when scaffolding and remove this note.

## Expected commands (once scaffolded)

These are the conventional NestJS scripts a `nest new` project ships with. Verify against the
generated `package.json` before relying on them:

```bash
npm run start:dev         # run in watch mode
npm run build             # compile to /dist
npm run lint              # eslint
npm test                  # unit tests (Jest)
npm run test:e2e          # end-to-end tests
npm test -- <pattern>     # run a single test file / matching tests
```

## Configuration

`.gitignore` ignores `.env`, `.env.development`, `.env.test`, and `.env.production` — environment
config is expected to live in dotenv files. A weather app will need at least one external
weather-provider API key; store it in `.env`, never in committed code.
