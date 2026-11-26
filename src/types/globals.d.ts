export {};

declare global {
  interface Window {
    /** A share link's sign-in fragment, moved here by the inline head script before hydration. */
    __e6link?: string;
  }
}
