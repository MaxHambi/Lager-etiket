# ADR-0004: Zentrale Fehlertaxonomie mit etiket-Integration und Meldungs-Mapper

## Status

Accepted

## Date

2026-09-16

## Context

Vor dieser Entscheidung wurden Fehler in `composeLabel`/`getGenerator` als
generische `(err as Error).message`-Strings ausgegeben. Das hatte drei
Probleme:

1. **etiket-Fehler waren ununterscheidbar.** etiket wirft typisierte
   Fehlerklassen (`InvalidInputError`, `CapacityError`, `CheckDigitError`,
   alle unter `EtiketError`), aber die Aufrufer behandelten sie wie jeden
   anderen `Error`. Nutzer sahen englische Encoder-Meldungen ohne
   Zusammenhang („unknown character“) statt einer verständlichen Erklärung.
2. **Keine gemeinsame Sprache.** Jede Ausgabestelle (Preview, Generator,
   CLI) baute eigene Meldungs-Strings — Formulierungen drifteten auseinander.
3. **Keine erweiterbare Taxonomie.** Es gab kein Muster, um zukünftige
   Fehlerstellen (Datei-I/O, Config-Validierung, Netzwerk) mit eigenen,
   maschinen-lesbaren Codes zu erfassen.

Alternative betrachtet: **Exceptions nur mit Text, keine Klassen** —
abgelehnt, weil dann `instanceof`-Prüfungen unmöglich sind und jede
Ausgabestelle die Texte parsen müsste (fragil, nicht lokalisierbar).

## Decision

1. **etiket-Fehler werden re-exportiert und typisiert behandelt**
   (`packages/core/src/errors.ts`): `EtiketError` und Subklassen sind Teil
   der öffentlichen API von `@lager-etiket/core`. `isEtiketError()` (Name-
   Whitelist) trennt „Input von der Bibliothek abgelehnt" von allem anderen.

2. **Projektweiter `AppError` mit `ErrorCode`-Union**: für alles, was nicht
   von etiket kommt (Vorlage fehlt, Config kaputt, Bereich ungültig,
   Datei-I/O, Netzwerk). Jeder Code hat in `hint()` einen optionalen
   deutschen Lösungshinweis.

3. **`describeError(err, context?)` als einzige Meldungs-Funktion**: mappt
   jedes geworfene Objekt auf eine nutzerfreundliche deutsche Meldung —
   etiket-typisiert, AppError mit Hinweis, bekannte Browser-/Node-Texte
   spezifisch, Rest generisch. Alle Ausgabestellen (Generator, Preview,
   CLI) rufen nur noch diese Funktion im `catch` auf.

4. **Typisierte Durchreichung statt Wrapping**: `renderBarcodeSvg()` lässt
   `EtiketError` unverändert durch (kein Wrapping in AppError), damit
   `instanceof`-Prüfungen in Aufrufern funktionieren. Nur *fremde* Fehler
   werden in `AppError(RENDER_FAILED)` gekapselt.

5. **CLI hält eine JS-Kopie des Mappers** (`barcode.mjs` kann kein TS aus
   `@lager-etiket/core` importieren). Beide Implementierungen sind
   kommentarweise verknüpft; Synchronisation ist dokumentierte Pflicht.

## Alternatives Considered

### Errors ausschließlich über Strings (keine Klassen)
- Pros: keine API-Fläche für Fehlerklassen nötig
- Cons: kein `instanceof`, kein maschinen-lesbarer Code, keine
  automatisierten Lösungshinweise
- **Rejected:** Texte sind ein privates Implementierungsdetail, das sich
  mit etiket-Versionen ändern kann — Code-Identifikation ist stabil.

### etiket-Fehler in AppError wrappen
- Pros: nur eine Fehlertaxonomie nach außen
- Cons: verliert die Typisierung der Bibliothek; ein `instanceof
  InvalidInputError` im UI wäre nicht mehr möglich; doppelte
  Code-Führung (etiket-Code + AppError-Code)
- **Rejected:** Die Bibliotheksklassen sind bereits gut designed und
  dokumentiert — wir führen nichts doppelt.

### try/catch pro UI-Stelle mit eigener Message
- Pros: maximal lokal anpassbar
- Cons: genau der Zustand, den wir beseitigen wollen (driftende Formulierungen)
- **Rejected:** Der Mapper ist die Schnittstelle; lokale Anpassung geschieht
  über den `context`-Parameter, nicht über eigene Meldungslogik.

## Consequences

- Alle Nutzer-meldungen sind einheitlich deutsch, mit Originaltext für Diagnose.
- Neue Fehlerstellen folgen dem Muster: `ErrorCode` ergänzen, Helper/`hint()`
  erweitern, Test schreiben (Anleitung: `docs/ERROR-HANDLING.md` §4).
- 11 Unit-Tests decken den Mapper ab (`packages/core/test/errors.test.mjs`).
- Die CLI-Kopie muss bei Mapper-Änderungen mitsynchronisiert werden
  (dokumentiert in beiden Dateien) — kleinster Wartungsaufwand, da die
  Mapper-Logik stabil ist.
- etiket-Upgrades mit neuen Fehlerklassen erfordern eine Whitelist- und
  Mapper-Erweiterung (im Test sofort sichtbar).
