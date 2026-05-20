# Data Layer

La persistenza attuale usa `localStorage` del browser e mantiene la stessa struttura dati gia usata dall'app.

`localStorageRepository.js` e l'unico file che accede direttamente a `localStorage`. Espone funzioni per caricare e salvare database e sessione:

- `getDb()`
- `saveDb(db)`
- `resetDb()`
- `getSession()`
- `saveSession(session)`
- `clearSession()`

`repository.js` e l'API astratta usata dal resto dell'app. In futuro sara possibile creare un `firestoreRepository.js` con la stessa interfaccia e cambiare solo questo livello.

## Struttura dati attuale

Il database locale contiene array normalizzati:

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

## Collection Firestore suggerite

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
