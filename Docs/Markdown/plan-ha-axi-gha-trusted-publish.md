# Plan: npm Publish via GitHub Actions (Trusted Publishing)

## Annahme
- `@dtrywets/ha-axi` existiert auf npm noch nicht (404); PR #2 (scoped Name) ist auf `main` gemergt.
- Trusted Publisher lässt sich erst konfigurieren, wenn das Paket auf npm existiert (npm-Doku: Package-Settings; Community/Tools bestätigen: kein Pending Publisher wie bei PyPI).
- Captain kann lokal/CI nicht mit Passkey-OTP publishen; GHA-OIDC ist der Dauerweg.

## Zwei Wege
1. **Auftragsweg:** `.github/workflows/publish.yml` mit OIDC (`id-token: write`), Auslöser Release + `workflow_dispatch`, ohne `NPM_TOKEN`; Erstveröffentlichung als dokumentierten Einmal-Schritt (granularer Token mit 2FA-Bypass als Repo-Secret, einmal publishen, Secret löschen, danach Trusted Publisher).
2. **Alternativ (nicht gewählt):** Nur Token-basierter Dauer-Publish in Actions — widerspricht Captain-Intent (kein OTP/Passkey-Weg dauerhaft) und Trusted-Publishing-Ziel.

**Gewählt:** Weg 1. **Gelassen:** Token anlegen, Release anlegen, `npm publish` ausführen.

## Ablehnung
- Workflow mit hardcodiertem/ dauerhaftem `NPM_TOKEN` ohne Hinweis auf Erstveröffentlichungs-Lücke.
- Trusted Publisher als „funktioniert ab Tag 0 ohne Paket“ behaupten.
- Node/npm unter den OIDC-Mindestversionen (Node ≥22.14, npm ≥11.5.1).

## Nachweis
- Workflow-Datei syntaktisch/inhaltlich: Trigger, Permissions, Steps (`npm ci`, `test`, `build`, `publish`).
- `npm test` / `npm run build` im Worktree weiterhin grün (keine Code-Änderung nötig, aber Regression prüfen).
- PR nennt Captain-Schritte für npmjs.com + Erstveröffentlichung.

## Grenze
- Kein Publish, kein Release, kein Token anlegen.
- Keine Features außerhalb des Publish-Workflows; `ci.yml` und App-Code unangetastet.
