// The built-in lists behind the film log's Brand and Mount pickers (#733):
// common film-era lens mounts and camera and lens makers. Pure data, so it is
// tested for unique ids and alias collisions in `gear-catalog.test.ts`.
//
// A mount's `id` is what a camera's or lens's `mountId` stores, so an id must
// never change or be reused once shipped (rename the `name` instead). Brands are
// stored as their display name text (see `film-log.schema.ts`), so a brand's
// `id` is only a list key.

export interface CatalogEntry {
  id: string;
  /** What the picker and the film log show. */
  name: string;
  /** Other names a search should find it by. */
  aliases: readonly string[];
}

export type LensMount = CatalogEntry;

export interface GearBrand extends CatalogEntry {
  /** Offered in the camera form's Brand picker. */
  camera: boolean;
  /** Offered in the lens form's Brand picker. */
  lens: boolean;
}

export const LENS_MOUNTS: readonly LensMount[] = [
  // 35mm rangefinders
  {
    id: 'leica-ltm',
    name: 'Leica thread mount (L39)',
    aliases: [
      'LTM',
      'L39',
      'M39 rangefinder',
      'LSM',
      'Leica screw mount',
      'Leica 39mm screw',
    ],
  },
  { id: 'leica-m', name: 'Leica M', aliases: ['M mount'] },
  {
    id: 'contax-rf',
    name: 'Contax rangefinder',
    aliases: ['Contax RF', 'Kiev rangefinder', 'Contax I', 'Contax II'],
  },
  { id: 'nikon-s', name: 'Nikon S', aliases: ['Nikon rangefinder', 'S mount'] },
  { id: 'contax-g', name: 'Contax G', aliases: ['G1', 'G2'] },
  // 35mm SLRs
  {
    id: 'm42',
    name: 'M42 screw mount',
    aliases: ['M42', 'Pentax screw', 'Praktica screw', 'Universal screw mount'],
  },
  // Same thread as Leica's, but a different flange distance: not the same mount.
  {
    id: 'zenit-m39',
    name: 'Zenit M39 (SLR)',
    aliases: ['M39 SLR', 'Zenit M39'],
  },
  {
    id: 'pentax-k',
    name: 'Pentax K',
    aliases: ['PK', 'K mount', 'KA', 'KAF'],
  },
  {
    id: 'nikon-f',
    name: 'Nikon F',
    aliases: ['F mount', 'AI', 'AI-S', 'Non-AI'],
  },
  {
    id: 'canon-fd',
    name: 'Canon FD',
    aliases: ['FD', 'New FD', 'FL', 'Canon FL', 'Canonflex R', 'Breech-lock'],
  },
  { id: 'canon-ef', name: 'Canon EF', aliases: ['EF', 'EOS'] },
  {
    id: 'minolta-sr',
    name: 'Minolta SR',
    aliases: ['SR', 'MC', 'MD'],
  },
  {
    id: 'minolta-a',
    name: 'Minolta / Sony A',
    aliases: ['A mount', 'Maxxum', 'Dynax', 'Minolta AF', 'Sony A'],
  },
  { id: 'olympus-om', name: 'Olympus OM', aliases: ['OM', 'OM Zuiko'] },
  { id: 'olympus-pen-f', name: 'Olympus Pen F', aliases: ['Pen F', 'Pen FT'] },
  {
    id: 'contax-yashica',
    name: 'Contax/Yashica (C/Y)',
    aliases: ['C/Y', 'CY', 'Yashica/Contax'],
  },
  { id: 'konica-ar', name: 'Konica AR', aliases: ['AR', 'Hexanon AR'] },
  { id: 'exakta', name: 'Exakta', aliases: ['Exakta bayonet', 'Topcon RE'] },
  { id: 'leica-r', name: 'Leica R', aliases: ['R mount', 'Leicaflex'] },
  { id: 'rollei-qbm', name: 'Rollei QBM', aliases: ['QBM', 'Rolleiflex SL35'] },
  { id: 'fujica-x', name: 'Fujica X', aliases: ['X-Fujinon', 'Fujica AX'] },
  // Panoramic and medium format
  {
    id: 'hasselblad-xpan',
    name: 'Hasselblad XPan',
    aliases: ['XPan', 'Fuji TX-1', 'TX-1', 'TX-2'],
  },
  {
    id: 'hasselblad-v',
    name: 'Hasselblad V',
    aliases: ['V system', 'Hasselblad 500', 'CF', 'CFi', 'CFE'],
  },
  { id: 'hasselblad-h', name: 'Hasselblad H', aliases: ['H1', 'H2', 'HC'] },
  { id: 'mamiya-645', name: 'Mamiya 645', aliases: ['M645', 'Sekor C 645'] },
  { id: 'mamiya-rb67', name: 'Mamiya RB67', aliases: ['RB67'] },
  { id: 'mamiya-rz67', name: 'Mamiya RZ67', aliases: ['RZ67'] },
  { id: 'mamiya-7', name: 'Mamiya 7', aliases: ['Mamiya 7 II'] },
  { id: 'mamiya-6', name: 'Mamiya 6', aliases: ['Mamiya 6 MF'] },
  {
    id: 'mamiya-c',
    name: 'Mamiya C (TLR)',
    aliases: ['Mamiya TLR', 'C330', 'C220'],
  },
  { id: 'contax-645', name: 'Contax 645', aliases: [] },
  {
    id: 'pentax-645',
    name: 'Pentax 645',
    aliases: ['P645', '645N', '645NII'],
  },
  { id: 'pentax-67', name: 'Pentax 6x7', aliases: ['Pentax 67', 'P67'] },
  {
    id: 'bronica-etr',
    name: 'Bronica ETR',
    aliases: ['ETR', 'ETRS', 'ETRSi', 'Zenzanon PE'],
  },
  {
    id: 'bronica-sq',
    name: 'Bronica SQ',
    aliases: ['SQ', 'SQ-A', 'SQ-Ai', 'Zenzanon PS'],
  },
  {
    id: 'bronica-gs1',
    name: 'Bronica GS-1',
    aliases: ['GS-1', 'GS1', 'Zenzanon PG'],
  },
  { id: 'bronica-s', name: 'Bronica S', aliases: ['S2', 'S2A', 'Bronica EC'] },
  { id: 'kiev-88', name: 'Kiev 88', aliases: ['Kiev-88', 'Salyut'] },
  {
    id: 'pentacon-six',
    name: 'Pentacon Six (P6)',
    aliases: ['P6', 'Praktisix', 'Kiev 60', 'Kiev 6C', 'Kiev 88CM', 'Arax-CM'],
  },
  // Large format: lenses move between cameras on boards, so one entry.
  {
    id: 'large-format',
    name: 'Large format (lens board)',
    aliases: [
      'Lens board',
      'View camera',
      'Copal',
      'Compur',
      'Copal 0',
      'Copal 1',
      'Copal 3',
      'Technika',
      'Sinar board',
      'Graflex board',
    ],
  },
];

const both = { camera: true, lens: true } as const;
const cameraOnly = { camera: true, lens: false } as const;
const lensOnly = { camera: false, lens: true } as const;

export const GEAR_BRANDS: readonly GearBrand[] = [
  {
    id: 'nikon',
    name: 'Nikon',
    aliases: ['Nikkor', 'Nippon Kogaku', 'Nikkormat'],
    ...both,
  },
  { id: 'canon', name: 'Canon', aliases: [], ...both },
  {
    id: 'pentax',
    name: 'Pentax',
    aliases: ['Asahi', 'Asahi Pentax', 'Takumar'],
    ...both,
  },
  { id: 'minolta', name: 'Minolta', aliases: ['Rokkor'], ...both },
  { id: 'olympus', name: 'Olympus', aliases: ['Zuiko'], ...both },
  { id: 'leica', name: 'Leica', aliases: ['Leitz', 'Ernst Leitz'], ...both },
  {
    id: 'voigtlander',
    name: 'Voigtländer',
    aliases: ['Voigtlaender', 'Cosina Voigtländer'],
    ...both,
  },
  {
    id: 'zeiss',
    name: 'Zeiss',
    aliases: ['Carl Zeiss', 'Carl Zeiss Jena'],
    ...lensOnly,
  },
  { id: 'zeiss-ikon', name: 'Zeiss Ikon', aliases: [], ...cameraOnly },
  { id: 'contax', name: 'Contax', aliases: [], ...both },
  { id: 'yashica', name: 'Yashica', aliases: ['Yashinon'], ...both },
  { id: 'konica', name: 'Konica', aliases: ['Hexanon', 'Hexar'], ...both },
  {
    id: 'fujifilm',
    name: 'Fujifilm',
    aliases: ['Fuji', 'Fujica', 'Fujinon'],
    ...both,
  },
  { id: 'mamiya', name: 'Mamiya', aliases: ['Sekor'], ...both },
  {
    id: 'bronica',
    name: 'Bronica',
    aliases: ['Zenza Bronica', 'Zenzanon'],
    ...both,
  },
  { id: 'hasselblad', name: 'Hasselblad', aliases: [], ...both },
  {
    id: 'rollei',
    name: 'Rollei',
    aliases: ['Rolleiflex', 'Rolleicord', 'Franke & Heidecke'],
    ...both,
  },
  { id: 'kodak', name: 'Kodak', aliases: ['Ektar', 'Retina'], ...both },
  { id: 'ricoh', name: 'Ricoh', aliases: ['Rikenon'], ...both },
  { id: 'praktica', name: 'Praktica', aliases: [], ...cameraOnly },
  { id: 'pentacon', name: 'Pentacon', aliases: [], ...both },
  { id: 'exakta', name: 'Exakta', aliases: ['Ihagee'], ...both },
  { id: 'zorki', name: 'Zorki', aliases: [], ...cameraOnly },
  { id: 'kowa', name: 'Kowa', aliases: [], ...both },
  { id: 'petri', name: 'Petri', aliases: [], ...both },
  { id: 'chinon', name: 'Chinon', aliases: [], ...both },
  {
    id: 'zenit',
    name: 'Zenit',
    aliases: ['KMZ', 'Krasnogorsk', 'Helios'],
    ...both,
  },
  { id: 'kiev', name: 'Kiev', aliases: ['Arsenal'], ...cameraOnly },
  { id: 'fed', name: 'FED', aliases: [], ...cameraOnly },
  { id: 'lomo', name: 'LOMO', aliases: ['LC-A', 'Lubitel'], ...both },
  { id: 'lomography', name: 'Lomography', aliases: [], ...both },
  { id: 'holga', name: 'Holga', aliases: [], ...cameraOnly },
  { id: 'polaroid', name: 'Polaroid', aliases: [], ...cameraOnly },
  { id: 'minox', name: 'Minox', aliases: [], ...cameraOnly },
  { id: 'topcon', name: 'Topcon', aliases: ['Topcor'], ...both },
  { id: 'miranda', name: 'Miranda', aliases: [], ...both },
  { id: 'linhof', name: 'Linhof', aliases: ['Technika'], ...cameraOnly },
  { id: 'sinar', name: 'Sinar', aliases: [], ...cameraOnly },
  {
    id: 'toyo',
    name: 'Toyo',
    aliases: ['Toyo-View', 'Toyo-Field'],
    ...cameraOnly,
  },
  {
    id: 'graflex',
    name: 'Graflex',
    aliases: ['Speed Graphic', 'Crown Graphic'],
    ...cameraOnly,
  },
  { id: 'wista', name: 'Wista', aliases: [], ...cameraOnly },
  { id: 'chamonix', name: 'Chamonix', aliases: [], ...cameraOnly },
  { id: 'intrepid', name: 'Intrepid', aliases: [], ...cameraOnly },
  { id: 'horseman', name: 'Horseman', aliases: ['Komamura'], ...cameraOnly },
  { id: 'arca-swiss', name: 'Arca-Swiss', aliases: [], ...cameraOnly },
  { id: 'plaubel', name: 'Plaubel', aliases: ['Makina'], ...cameraOnly },
  { id: 'agfa', name: 'Agfa', aliases: ['Agfa-Gevaert'], ...both },
  { id: 'ilford', name: 'Ilford', aliases: [], ...cameraOnly },
  { id: 'cosina', name: 'Cosina', aliases: [], ...both },
  { id: 'sigma', name: 'Sigma', aliases: [], ...both },
  { id: 'tamron', name: 'Tamron', aliases: ['Adaptall'], ...lensOnly },
  { id: 'tokina', name: 'Tokina', aliases: [], ...lensOnly },
  { id: 'vivitar', name: 'Vivitar', aliases: [], ...both },
  {
    id: 'schneider-kreuznach',
    name: 'Schneider-Kreuznach',
    aliases: ['Schneider'],
    ...lensOnly,
  },
  { id: 'rodenstock', name: 'Rodenstock', aliases: [], ...lensOnly },
  {
    id: 'meyer-optik-goerlitz',
    name: 'Meyer-Optik Görlitz',
    aliases: ['Meyer Optik', 'Meyer-Optik Goerlitz'],
    ...lensOnly,
  },
  { id: 'angenieux', name: 'Angénieux', aliases: [], ...lensOnly },
  { id: 'samyang', name: 'Samyang', aliases: ['Rokinon'], ...lensOnly },
  { id: '7artisans', name: '7Artisans', aliases: ['7 Artisans'], ...lensOnly },
  {
    id: 'ttartisan',
    name: 'TTArtisan',
    aliases: ['TT Artisan', 'TTArtisans'],
    ...lensOnly,
  },
];

const MOUNT_BY_ID: ReadonlyMap<string, LensMount> = new Map(
  LENS_MOUNTS.map((mount) => [mount.id, mount])
);

/** A built-in mount by id, or undefined for a custom or unknown id. */
export function builtInMount(id: string): LensMount | undefined {
  return MOUNT_BY_ID.get(id);
}

/** The brands offered for a camera or for a lens. */
export function brandsFor(kind: 'camera' | 'lens'): readonly GearBrand[] {
  return GEAR_BRANDS.filter((brand) => brand[kind]);
}

/** The id prefix of a mount the user added, so it can never equal a built-in id. */
export const CUSTOM_MOUNT_PREFIX = 'custom-mount-';
