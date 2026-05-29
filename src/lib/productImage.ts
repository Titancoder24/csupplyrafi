/**
 * Resolve a product image URL from a name + optional explicit images array.
 * Single source of truth across customer screens (home, category, product
 * detail, cart, search, checkout, order detail).
 *
 * Falls back to a curated Unsplash photo keyed by category keywords found in
 * the product name. Pass `size` to control the rendered width (server-side
 * resizing keeps payloads small on listing screens).
 */

type Bucket =
  | 'cement' | 'steel' | 'bricks' | 'sand' | 'aggregate' | 'paints'
  | 'pipes'  | 'tiles' | 'wood'   | 'glass'| 'hardware'  | 'roofing'
  | 'electrical' | 'plumbing' | 'default';

const PHOTO_ID: Record<Bucket, string> = {
  cement:     '1590725175114-f9d8e62e2ed3',
  steel:      '1504307651254-35680f356dfd',
  bricks:     '1575487870-7000b8c9c22a',
  sand:       '1558618666-fcd25c85cd64',
  aggregate:  '1589939705384-5185137a7f0f',
  paints:     '1562259929-b4e1fd3aef09',
  pipes:      '1581094794329-c8112a89af12',
  tiles:      '1615971677499-5467cbab01b0',
  wood:       '1541123437800-1bb1317badc2',
  glass:      '1620901462635-1f7f9f8b2c9c',
  hardware:   '1581235720704-06d3acfcb36f',
  roofing:    '1503387762-cf2f8b3a2f0e',
  electrical: '1565608087341-404b25492f2c',
  plumbing:   '1558618047-3c8c76ca7d13',
  default:    '1541888946425-d81bb19240f5',
};

function bucketFor(name: string): Bucket {
  const n = (name ?? '').toLowerCase();
  if (n.includes('cement') || n.includes('opc') || n.includes('ppc') || n.includes('concrete')) return 'cement';
  if (n.includes('steel')  || n.includes('tmt') || n.includes('rebar') || n.includes('bar'))    return 'steel';
  if (n.includes('brick')  || n.includes('block') || n.includes('aac'))                          return 'bricks';
  if (n.includes('sand')   || n.includes('m-sand') || n.includes('msand'))                       return 'sand';
  if (n.includes('aggregate') || n.includes('stone') || n.includes('crush') || n.includes('gravel')) return 'aggregate';
  if (n.includes('paint')  || n.includes('emulsion') || n.includes('primer'))                    return 'paints';
  if (n.includes('pipe')   || n.includes('pvc') || n.includes('cpvc'))                           return 'pipes';
  if (n.includes('tile')   || n.includes('vitrified') || n.includes('marble') || n.includes('granite')) return 'tiles';
  if (n.includes('wood')   || n.includes('timber') || n.includes('plywood') || n.includes('ply')) return 'wood';
  if (n.includes('glass')  || n.includes('mirror'))                                              return 'glass';
  if (n.includes('hardware') || n.includes('hinge') || n.includes('lock') || n.includes('screw') || n.includes('nail')) return 'hardware';
  if (n.includes('roof')   || n.includes('sheet') || n.includes('shingle'))                      return 'roofing';
  if (n.includes('wire')   || n.includes('cable') || n.includes('switch') || n.includes('mcb'))   return 'electrical';
  if (n.includes('plumb')  || n.includes('tap')  || n.includes('faucet') || n.includes('basin')) return 'plumbing';
  return 'default';
}

/**
 * Get the canonical image URL for a product.
 * Prefers explicit images supplied on the product row; otherwise picks a
 * curated stock photo by category.
 */
export function getProductImage(
  nameOrProduct: string | { name?: string | null; images?: string[] | null },
  opts?: { size?: number },
): string {
  const size = opts?.size ?? 400;
  let name = '';
  let explicit: string[] | null | undefined;

  if (typeof nameOrProduct === 'string') {
    name = nameOrProduct;
  } else if (nameOrProduct) {
    name     = nameOrProduct.name ?? '';
    explicit = nameOrProduct.images;
  }

  if (explicit && explicit.length && typeof explicit[0] === 'string' && explicit[0].startsWith('http')) {
    return explicit[0];
  }

  const id = PHOTO_ID[bucketFor(name)];
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${size}&q=80`;
}
