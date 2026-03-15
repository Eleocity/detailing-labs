export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Returns the local login URL with an optional returnTo path.
// Previously used Manus OAuth — now uses email/password auth at /login.
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath) {
    return `/login?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};
