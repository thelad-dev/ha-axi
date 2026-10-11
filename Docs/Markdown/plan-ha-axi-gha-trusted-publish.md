# Plan: npm Publish via GitHub Actions

## Annahme
- `@dtrywets/ha-axi` existiert auf npm noch nicht; PR #2 (scoped Name) ist auf `main`.
- Captain hat Repo-Secret `NPM_TOKEN` (granular, 90 Tage) bereitgestellt; Worker kennt den Wert nicht.
- Trusted Publishing (OIDC) erst nach Erstveröffentlichung sinnvoll; hier späterer Wechsel, keine Voraussetzung.

## Zwei Wege
1. **Auftragsweg (aktuell):** `publish.yml` mit `NODE_AUTH_TOKEN` aus `secrets.NPM_TOKEN`, `registry-url`, `--provenance`; Auslöser Release + `workflow_dispatch`; Trusted Publishing im PR als Folgeschritt beschreiben.
2. **Früherer Weg:** OIDC-only ohne Token — Captain-Update verwirft das als Voraussetzung, weil Erstpublish und Secret bereits da sind.

**Gewählt:** Weg 1. **Gelassen:** Token anlegen/lesen, Release anlegen, `npm publish` ausführen.

## Ablehnung
- Token-Wert in Logs/PR schreiben.
- Trusted Publishing als Blocker vor dem ersten Publish darstellen.
- Publish oder Release in diesem Auftrag auslösen.

## Nachweis
- Workflow: Trigger, Permissions (`id-token: write` für Provenance), Steps inkl. `NODE_AUTH_TOKEN`.
- `npm test` / `npm run build` grün.
- PR mit Captain-Schritten (Release auslösen; später Trusted Publisher).

## Grenze
- Kein Publish, kein Release, Secret-Wert nicht lesen.
- Nur Workflow (+ Plan); App-Code und `ci.yml` unangetastet.
