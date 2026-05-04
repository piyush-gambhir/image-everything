declare module "heic-decode" {
  interface DecodeInput {
    buffer: ArrayBuffer | Buffer | Uint8Array;
    image?: number;
  }

  interface DecodeOutput {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }

  interface AllResult {
    width: number;
    height: number;
    data: () => Promise<DecodeOutput>;
  }

  function decode(input: DecodeInput): Promise<DecodeOutput>;
  namespace decode {
    function all(input: DecodeInput): Promise<AllResult[]>;
  }

  export default decode;
}
