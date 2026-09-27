/**
 * Declare type for bundled text assets.
 * For example: import xxx from "@/twee/example.twee" to import files as raw strings.
 */
declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module '*.twee?raw' {
  const content: string;
  export default content;
}

declare module '*.yaml?raw' {
  const content: string;
  export default content;
}

declare module '*.yml?raw' {
  const content: string;
  export default content;
}
