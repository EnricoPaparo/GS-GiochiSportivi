export const SESSION_KEY = "giornateSportive.session.v1";

export function emptyDb() {
  return {
    meta: {
      participantsScopedBySport: true,
      guestsEnabled: true,
      firebaseUsage: {
        date: "",
        writes: 0
      }
    },
    users: [],
    sportsDays: [],
    sports: [],
    years: [],
    sections: [],
    participants: [],
    relayTeams: [],
    results: [],
    attempts: [],
    rankings: []
  };
}
