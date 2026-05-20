export const SESSION_KEY = "giornateSportive.session.v1";

export function emptyDb() {
  return {
    meta: {
      participantsScopedBySport: true
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
