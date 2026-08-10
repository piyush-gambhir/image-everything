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

  interface DeferredDecodeOutput {
    width: number;
    height: number;
    decode(): Promise<DecodeOutput>;
  }

  interface DecodeCollection extends Array<DeferredDecodeOutput> {
    dispose(): void;
  }

  function decode(input: DecodeInput): Promise<DecodeOutput>;
  namespace decode {
    function all(input: DecodeInput): Promise<DecodeCollection>;
  }
  export default decode;
}
