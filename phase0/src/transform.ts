import { Matrix, solve } from 'ml-matrix';

export type PixelPoint = { x: number; y: number };
export type GeoPoint = { lat: number; lon: number };
export type ReferencePair = { pixel: PixelPoint; geo: GeoPoint };

export type AffineTransform = {
  // Forward (pixel → geo):
  //   lat = a·x + b·y + c
  //   lon = d·x + e·y + f
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

/**
 * Fit an affine transform from 3+ (pixel, geo) reference pairs using
 * least-squares. With exactly 3 points the result is an exact fit;
 * with more it is a best fit.
 */
export function computeTransform(pairs: ReferencePair[]): AffineTransform {
  if (pairs.length < 3) {
    throw new Error(`Need at least 3 reference pairs, got ${pairs.length}`);
  }

  // Design matrix A (n×3): each row is [xᵢ, yᵢ, 1]
  const A = new Matrix(pairs.map((p) => [p.pixel.x, p.pixel.y, 1]));

  // Response matrix B (n×2): columns are lat and lon
  const B = new Matrix(pairs.map((p) => [p.geo.lat, p.geo.lon]));

  // Normal equations: (AᵀA) · params = Aᵀ · B
  // params is 3×2; column 0 = [a,b,c], column 1 = [d,e,f]
  const AT = A.transpose();
  const params = solve(AT.mmul(A), AT.mmul(B));

  return {
    a: params.get(0, 0),
    b: params.get(1, 0),
    c: params.get(2, 0),
    d: params.get(0, 1),
    e: params.get(1, 1),
    f: params.get(2, 1),
  };
}

/** Project a pixel coordinate to a geographic point using the forward transform. */
export function projectPixelToGeo(
  transform: AffineTransform,
  pixel: PixelPoint,
): GeoPoint {
  const { a, b, c, d, e, f } = transform;
  return {
    lat: a * pixel.x + b * pixel.y + c,
    lon: d * pixel.x + e * pixel.y + f,
  };
}

/**
 * Project a geographic point back to pixel coordinates using the analytically
 * inverted forward transform.
 *
 * The forward transform in homogeneous coordinates is the 3×3 matrix
 *   M = [[a, b, c], [d, e, f], [0, 0, 1]]
 * Inverting the 2×2 submatrix [[a,b],[d,e]] with det = ae − bd gives:
 *   x = ( e·lat − b·lon + b·f − c·e ) / det
 *   y = ( −d·lat + a·lon + c·d − a·f ) / det
 */
export function projectGeoToPixel(
  transform: AffineTransform,
  geo: GeoPoint,
): PixelPoint {
  const { a, b, c, d, e, f } = transform;
  const det = a * e - b * d;
  if (Math.abs(det) < 1e-12) {
    throw new Error('Transform is degenerate (determinant ≈ 0)');
  }
  return {
    x: (e * geo.lat - b * geo.lon + b * f - c * e) / det,
    y: (-d * geo.lat + a * geo.lon + c * d - a * f) / det,
  };
}