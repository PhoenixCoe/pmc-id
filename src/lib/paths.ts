/* The address of every screen. No React in here, so the build can read it. */
export const CREATE = ['name', 'about', 'email', 'password', 'review', 'code'];
export const TABS = ['home', 'info', 'security', 'apps', 'wallet', 'data'];
export const PLAIN = ['signin', 'reset', 'going', 'add', 'profile', ...TABS];
/** Every path the static build has to write out as a page. */
export const ALL_PATHS: string[][] = [[], ...PLAIN.map((p) => [p]), ...CREATE.map((c) => ['create', c])];
