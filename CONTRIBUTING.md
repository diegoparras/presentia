# Contributing to Presentia

**Presentia** is the presentation satellite of the [Escriba Suite](https://getescriba.com),
maintained as a fork of [Presenton](https://github.com/presenton/presenton).
Issues, ideas and pull requests are welcome.

## Development setup

```bash
git clone https://github.com/diegoparras/presentia.git
cd presentia
docker compose up -d --build development   # hot reload for both servers
```

- **Frontend** — Next.js at `servers/nextjs` (App Router, Redux Toolkit, TipTap, Tailwind).
- **Backend** — FastAPI at `servers/fastapi` (SQLModel, Alembic; SQLite by default, PostgreSQL via `DATABASE_URL`).
- The code map (services, seams, request flow and where each fork feature lives) is in [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Before opening a PR

```bash
# Typecheck the frontend
cd servers/nextjs && ./node_modules/.bin/tsc --noEmit -p tsconfig.json

# Backend unit tests
cd servers/fastapi && python -m pytest tests/unit
```

- Keep changes scoped: one feature or fix per PR.
- Editor features must survive **reload and export** (PPTX/PDF render through the
  same React pipeline — verify both).
- User-facing strings go through the i18n layer (7 languages).

## Reporting bugs

Open a [GitHub Issue](https://github.com/diegoparras/presentia/issues) with steps to
reproduce, the deck template involved, and — for export problems — whether it happens
in the editor, the PDF, the PPTX or all of them. Screenshots help a lot.

## Upstream

Generation-engine issues that reproduce on vanilla
[Presenton](https://github.com/presenton/presenton) are best reported upstream too —
this fork tracks it and benefits from their fixes.

## License

By contributing you agree that your contributions are licensed under
[Apache 2.0](LICENSE), the same license as the project.
