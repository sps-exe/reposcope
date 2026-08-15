// React 19 moved the JSX namespace under React.JSX. Some third-party
// libraries (e.g. rehype-react) still reference the global `JSX` namespace,
// so we restore a permissive global shim.
declare namespace JSX {
  type Element = any;
  interface ElementClass {}
  interface ElementAttributesProperty {}
  interface ElementChildrenAttribute {}
  interface IntrinsicAttributes {
    [name: string]: any;
  }
  interface IntrinsicClassAttributes<T> {
    [name: string]: any;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
