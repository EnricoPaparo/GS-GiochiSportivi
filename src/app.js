import { restoreSession, setSession } from "./auth/authService.js";
import { listenFirebaseAuth, logoutFirebaseUser, mapFirebaseUserToSession } from "./auth/firebaseAuthService.js";
import { getFirebaseUserProfile } from "./auth/firebaseUserService.js";
import { render as renderUi } from "./ui/render.js";
import { bindEventHandlers } from "./events/eventHandlers.js";
import { bindFirestoreBackupHandlers } from "./events/firestoreBackupHandlers.js";
import { bindFirestoreSportsDaysSyncHandlers } from "./events/firestoreSportsDaysSyncHandlers.js";
import { bindFirestoreSportsSyncHandlers } from "./events/firestoreSportsSyncHandlers.js";
import { bindFirestoreSchoolStructureSyncHandlers } from "./events/firestoreSchoolStructureSyncHandlers.js";
import { getDay } from "./domain/days.js";
import { displaySportName } from "./domain/sports.js";
import { state } from "./state.js";

// Temporary compatibility bridge for render modules split from the legacy app.js.
// TODO: remove after importing these dependencies directly in renderSport.js.
globalThis.getDay = getDay;
globalThis.displaySportName = displaySportName;

const app = document.querySelector("#app");
function render() {
  renderUi(app);
}

async function activateFirebaseSession(firebaseUser) {
  const profile = await getFirebaseUserProfile(firebaseUser.uid);

  if (!profile?.role) {
    await logoutFirebaseUser();
    setSession(null);
    state.view = "auth";
    render();
    return;
  }

  setSession({
    ...mapFirebaseUserToSession(firebaseUser),
    provider: "firebase",
    role: profile.role
  });

  if (state.view === "auth") {
    state.view = "dashboard";
  }

  render();
}

restoreSession();
listenFirebaseAuth(async (firebaseUser) => {
  if (!firebaseUser) {
    if (state.user?.provider === "firebase") {
      setSession(null);
      state.view = "auth";
      render();
    }
    return;
  }

  await activateFirebaseSession(firebaseUser);
});

bindEventHandlers(app, render);
bindFirestoreBackupHandlers(app, render);
bindFirestoreSportsDaysSyncHandlers(app, render);
bindFirestoreSportsSyncHandlers(app, render);
bindFirestoreSchoolStructureSyncHandlers(app, render);

render();
