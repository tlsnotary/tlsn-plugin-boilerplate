declare module 'main' {
  export function start(): I32;
  export function two(): I32;
  export function parseDiscordDm(): I32;
  export function three(): I32;
  export function config(): I32;
}

declare module 'extism:host' {
  interface user {
    redirect(ptr: I64): void;
    notarize(ptr: I64): I64;
  }
}
