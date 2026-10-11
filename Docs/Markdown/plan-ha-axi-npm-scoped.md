# Plan: ha-axi scoped npm-Name

## Annahme
- `@dtrywets/ha-axi` existiert auf npm noch nicht (404 bestätigt) → Version `0.1.0` bleibt.
- Bin-Name `ha-axi` und `publishConfig.access: public` bleiben unverändert.
- Kein `npm publish` in diesem Auftrag; nur PR.

## Zwei Wege
1. **Auftragsweg:** `package.json` name → `@dtrywets/ha-axi`; README + `skills/ha-axi/SKILL.md` Install/npx-Hinweise umstellen; Hinweis, dass unscoped `ha-axi` ein anderes Projekt ist.
2. **Alternativ (nicht gewählt):** Scoped Name unter anderem Scope oder separates Meta-Paket `ha-axi` als Redirect — unnötig, Captain hat `@dtrywets/ha-axi` bestätigt; Redirect wäre Extra-Scope außerhalb des Auftrags.

**Gewählt:** Weg 1. **Gelassen:** Redirect/Alias-Paket und Code-Änderungen außerhalb Docs/package.json.

## Ablehnung
- Unscoped Install-Beispiele stehen lassen → Agenten ziehen weiter batamire/ha-axi.
- Bin umbenennen → bricht bestehende Aufrufe und Skill-Erwartung.
- `npm publish` vor Merge → Captain/Firstmate-Gate umgangen.

## Nachweis
- `npm test`
- `npm run build`
- `npm pack --dry-run` zeigt Name `@dtrywets/ha-axi` und Dateien `dist`, `skills/ha-axi`, `README.md`, `LICENSE`

## Grenze
- Kein Publish, keine Features, kein Anfassen von `src/`, Tests, Auth, Transport.
- Nur `package.json`, `README.md`, `skills/ha-axi/SKILL.md` (plus diese Plan-Datei).
