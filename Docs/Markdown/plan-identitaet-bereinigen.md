# Plan: Identitaet bereinigen (ha-axi)

## Annahme
- Die sechs betroffenen Dateien sind `AGENTS.md`, `.github/workflows/publish.yml` und die vier `Docs/Markdown/plan-ha-axi-*.md`.
- `CLAUDE.md` ist Symlink auf `AGENTS.md`; eine Zeilenkorrektur dort reicht.
- Git-Historie und Forge-Texte (PR-Bodies) bleiben unangetastet; das ist ein eigener Auftrag.

## Zwei Wege
1. **Loeschen und minimal editieren:** Vier Plan-Dateien entfernen; in `AGENTS.md` nur die eine Rollenzeile neutralisieren; den Kommentar in `publish.yml` ohne Rollenwort umformulieren.
2. **Umschreiben statt loeschen:** Plan-Dateien behalten und nur umformulieren — belaesst die Handwerk-/Protokollform auf dem Default-Branch.

**Gewaehlt:** Weg 1. **Gelassen:** Weg 2; Historie-Rewrite; PR-Body-Bereinigung.

## Ablehnung
- Weitere Docs oder Skills umschreiben → Scope-Verletzung.
- In `AGENTS.md` Abschnitte ergaenzen oder Wissen nachziehen → Brief verbietet das.
- History-Rewrite oder erzwungenen Push → eigener Auftrag, hier verboten.

## Nachweis
- `rg -n -i 'captain|firstmate|crewmate|auftraggeber|auftragsweg' AGENTS.md .github/workflows/publish.yml Docs/Markdown/` liefert keine Treffer in den genannten Alt-Dateien; die vier `plan-ha-axi-*.md` fehlen.
- `npm test && npm run build`

## Grenze
- Nur die sechs genannten Dateien (zwei Edit, vier Delete) plus diese Gate-Datei.
- Kein History-Rewrite, kein Push auf den Default-Branch, keine PR-Bodies, keine anderen Repos.
