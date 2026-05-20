# Data Layer

La persistenza applicativa attuale usa Firestore e mantiene la stessa struttura dati gia usata dall'app.

`repository.js` e l'API astratta usata dal resto dell'app. Espone funzioni per inizializzare e salvare il database applicativo e mantiene `localStorage` soltanto per la sessione di login:

- `getDb()`
- `saveDb(db)`
- `resetDb()`
- `getSession()`
- `saveSession(session)`
- `clearSession()`

`firestoreRepository.js` gestisce lettura e scrittura del documento remoto principale `appData/main`. Questo documento e l'unica source of truth per i dati applicativi.

## Struttura dati attuale

Il database applicativo contiene array normalizzati:

- `users`
- `sportsDays`
- `sports`
- `years`
- `sections`
- `participants`
- `relayTeams`
- `results`
- `attempts`
- `rankings`

## Firestore

Source of truth attuale:

- collection `appData`
- documento `main`
- campo `db`, che contiene gli array normalizzati sotto elencati

Se in futuro servira scalare oltre il documento unico, si potra migrare verso collection separate. In quel caso la migrazione dovra essere atomica: bootstrap, salvataggi e cancellazioni dovranno usare solo quella strategia, senza doppio write parallelo.

Collection future possibili:

- `users`
- `sportsDays`
- `sports`
- `years`
- `sections`
- `participants`
- `relayTeams`
- `attempts`
- `results`
- `publicRankings`
