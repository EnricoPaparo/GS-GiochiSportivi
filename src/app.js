import { restoreSession, setSession } from "./auth/authService.js";
import { listenFirebaseAuth, mapFirebaseUserToSession } from "./auth/firebaseAuthService.js";
import { getFirebaseUserProfile } from "./auth/firebaseUserService.js";
import { render as renderUi } from "./ui/render.js";
import { bindEventHandlers } from "./events/eventHandlers.js";
import { getDay } from "./domain/days.js";
import { displaySportName } from "./domain/sports.js";

// Temporary compatibility bridge for render modules split from the legacy app.js.
// TODO: remove after importing these dependencies directly in renderSport.js.
globalThis.getDay = getDay;
globalThis.displaySportName = displaySportName;

const app = document.querySelector("#app");
function render() {
  renderUi(app);
}

restoreSession();
listenFirebaseAuth(async (firebaseUser) => {
  if (!firebaseUser) return;

  const profile = await getFirebaseUserProfile(firebaseUser.uid);
  if (!profile) {
    setSession(null);
    render();
    return;
  }

  setSession({
    ...mapFirebaseUserToSession(firebaseUser),
    provider: "firebase",
    role: profile.role
  });
  render();
});
bindEventHandlers(app, render);
render();
