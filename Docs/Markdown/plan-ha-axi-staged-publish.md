# Plan: npm Staged Publishing in GHA

## Annahme
- `@dtrywets/ha-axi` existiert noch nicht; direkter `npm publish` mit Bypass-2FA-Token scheiterte mit EOTP.
- Bypass-2FA-Tokens: Account-Aktionen schon eingeschränkt; Direkt-Publish wird bis Jan 2027 abgebaut ([Changelog](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/)). Staging braucht keine 2FA.
- Captain: CI stagt, Freigabe macht er selbst mit Passkey auf npmjs.com.
- npm-Doku: Staging funktioniert für neue Pakete (Placeholder `0.0.0-stage`); CLI ≥ 11.15.0, Node ≥ 22.14; Provenance bei `npm stage publish` möglich.

## Zwei Wege
1. **Auftragsweg:** `publish.yml` → `npm stage publish --provenance` mit `NODE_AUTH_TOKEN`; Captain approved auf npmjs.com.
2. **Alternativ (überholt):** Trusted Publishing/OIDC für Erstpublish — Captain-Präzisierung verwirft das; Staging deckt Erstpaket ab.

**Gewählt:** Weg 1. **Gelassen:** Approve/Publish ausführen, Token anlegen, Release anlegen.

## Ablehnung
- Weiterhin `npm publish` im Workflow (EOTP-Pfad).
- Staging ohne npm ≥ 11.15.0.
- Endgültiges Freigeben im Auftrag.

## Nachweis
- Workflow enthält `npm stage publish --provenance` und npm-Upgrade-Schritt.
- `npm test` / `npm run build` grün.
- PR mit Captain-Schritten (Staged Packages → Approve + Passkey).

## Grenze
- Kein endgültiges Publish, kein Approve, kein Token-Wert lesen.
- Nur Workflow (+ Plan); App-Code unangetastet.
