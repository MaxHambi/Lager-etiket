# Commit-Message-Regeln für dieses Repo

## Keine KI-Attributions-Fußzeilen

Commits in diesem Repository enthalten **keine** automatischen Fußzeilen wie:

```
🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
```

oder vergleichbare `Co-Authored-By`-Trailer auf Agenten-Namen, die nicht
tatsächlich mitgearbeitet haben.

### Wie Commits stattdessen aussehen

Klassisches Conventional-Commits-Format (siehe auch `AGENTS.md`):

```
<type>(<scope>): <kurze beschreibung im imperative>

<optionaler body mit details>
```

Beispiele: `feat(compose): 3-stufige Pure-Functions-Pipeline ergänzt`,
`fix(ci): allowBuilds für esbuild gesetzt`.

### Warum

- Die Historie soll sauber und ausschließlich dem Projekt zugeordnet sein.
- Fußzeilen verweisen auf Werkzeuge, nicht auf Autoren — das gehört nicht in
  die permanente Git-Historie.
- Bestehende Commits bleiben unverändert (History-Rewrite wurde bewusst
  abgelehnt), aber **alle zukünftigen Commits** folgen dieser Regel.

### Für Agenten (Codebuff, Claude, …)

Agenten, die in diesem Repo committen, lassen die Fußzeile weg. Der Commit
erhält nur die eigentliche Message. Agent-Nutzung darf gerne im Body
erwähnt werden ("erzeugt mit Codebuff-Session"), aber nicht als
`Co-Authored-By`-Trailer.
