/**
 * Declare type for bundled text assets.
 * For example: import xxx from "@/twee/example.twee" to import files as raw strings.
 */
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.twee' {
  const content: string;
  export default content;
}

declare module '*.yaml' {
  const content: string;
  export default content;
}

declare module '*.yml' {
  const content: string;
  export default content;
}
