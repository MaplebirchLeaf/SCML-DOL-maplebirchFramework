/**
 * Declare type for raw import modules.
 * For example: import xxx from "xxx.twee?raw" to import files as raw strings.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
