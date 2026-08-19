// Skia is a native canvas: there is no honest way to run it outside the app, so
// this stands in for the two values `film-log-photos` imports and refuses to
// pretend. Every member throws, which keeps the grayscale pass out of tests
// while making any test that reaches it fail loudly instead of passing against
// an invented image pipeline.
function unavailable(member: string): never {
  throw new Error(
    `Skia.${member} is native-only and unavailable outside the app; ` +
      'the grayscale pass cannot run in a test.'
  );
}

export const Skia = {
  get Data(): never {
    return unavailable('Data');
  },
  get Image(): never {
    return unavailable('Image');
  },
  get Surface(): never {
    return unavailable('Surface');
  },
  get ColorFilter(): never {
    return unavailable('ColorFilter');
  },
  Paint: (): never => unavailable('Paint'),
};

// The real values from @shopify/react-native-skia's ImageFormat enum.
export const ImageFormat = { JPEG: 3, PNG: 4, WEBP: 6 } as const;
