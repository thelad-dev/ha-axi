# Plan: ha-axi public launch (Schaufenster + Contributor-Surface)

## Annahme
- `@dtrywets/ha-axi@0.1.0` ist auf npm veröffentlicht; Binary bleibt `ha-axi`.
- Unscoped `ha-axi` auf npm ist ein fremdes Paket und muss im README klar abgegrenzt werden.
- Beispielausgaben im README sind erfundene, plausible TOON-Snippets in der echten Befehlsform — keine echten IPs, Tokens, privaten Entity-/Area-Namen oder Hausdaten.
- Repo-Themen und Homepage setzt dieser Lauf per `gh-axi` (nicht im Diff); Nachweis im PR-Text.
- GitHub-Release, Tag und npm-Publish bleiben beim Captain; hier nur `CHANGELOG.md` und Release-Notizen als PR-Textbaustein.

## Zwei Wege
1. **Auftragsweg:** README als internationales Schaufenster neu schreiben (Schnellstart mit Ausgabe, anonymisierte Beispiele, MCP-Vergleich, Sicherheit, Skill, Badges, Scoped-Name-Warnung) plus CONTRIBUTING, SECURITY, Issue-/PR-Vorlagen, CHANGELOG 0.1.0 und diese Plan-Datei; Metadaten per API.
2. **Alternativ (nicht gewählt):** Nur README polieren und Contributor-Dateien weglassen — schneller Diff, aber ein fremder Beitragender findet weder PR-Pfad noch Security-Meldeweg.

**Gewählt:** Weg 1. **Gelassen:** Weg 2, öffentliche Ankündigungen, CLI-Features, neue Dependencies, Doku außerhalb des Repos.

## Ablehnung
- Echte Instanzdaten (IP, Entity-Namen, Areas) im README → Datenschutz und Vertrauensbruch.
- Öffentliche Ankündigung (Forum/Reddit/HN/Social) → Brief verbietet das; nur Textvorschlag im PR.
- CLI-Umbau „nebenbei“ → Scope-Verletzung; echte Bugs nur als Fundliste im PR, außer offensichtlicher Einzeiler klar benannt.
- Badges oder Install-Beispiele auf unscoped `ha-axi` → Verwechslung mit dem fremden Paket.

## Nachweis
- `npm test && npm run build`
- Jeder Schnellstart-/Beispielbefehl einmal gegen die lokal konfigurierte Instanz ausgeführt (Lesebefehle; Token nicht ausgegeben); Bestätigung im PR-Text
- README-Durchgang: fremder HA-Nutzer kommt ohne Nachfragen zu Install → Token → doctor → erstem Lese-Befehl
- `gh-axi repo view` / API: Themen und Homepage gesetzt

## Grenze
- Keine Funktionsänderung an der CLI (`src/`, Verhalten); keine neuen Dependencies; keine Projektstruktur-Umbauten.
- Kein Publish, kein Tag, kein GitHub-Release, keine öffentliche Ankündigung.
- Keine Doku-Seite außerhalb dieses Repos; Skill nur verweisen/anbinden, nicht umbauen außer wo Install-Hinweise schon scoped sind.
