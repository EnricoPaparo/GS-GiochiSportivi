# Data Layer

La persistenza applicativa attuale usa Firestore e mantiene la stessa struttura dati gia usata dall'app.

`repository.js` e l'API astratta usata dal resto dell'app. Espone funzioni per caricare e salvare il database applicativo e mantiene `localStorage` soltanto per la sessione di login:

- `getDb()`
- `saveDb(db)`
- `resetDb()`
- `getSession()`
- `saveSession(session)`
- `clearSession()`

`firestoreRepository.js` gestisce lettura e scrittura del documento remoto principale. I repository Firestore dedicati gestiscono le collection normalizzate usate per la sincronizzazione granulare.

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

## Collection Firestore

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
