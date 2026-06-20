import { Tag } from '@dorkroom/ui';

// Brand/source tags — color is derived from the tag text (official-* + community).
export const BrandTags = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 360 }}>
    <Tag>official-ilford</Tag>
    <Tag>official-kodak</Tag>
    <Tag>official-fuji</Tag>
    <Tag>official-cinestill</Tag>
    <Tag>official-rollei</Tag>
    <Tag>community</Tag>
  </div>
);

// Film-type tags — bw / color / slide each map to their own palette.
export const FilmTypeTags = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 360 }}>
    <Tag>bw</Tag>
    <Tag>color</Tag>
    <Tag>slide</Tag>
  </div>
);

// The explicit variant axis: discontinued (semantic error) and info (muted).
export const Variants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 360 }}>
    <Tag variant="discontinued">discontinued</Tag>
    <Tag variant="info">35mm</Tag>
  </div>
);

// Size axis — xs (default, 10px) vs sm (12px).
export const Sizes = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360 }}>
    <Tag size="xs">official-kodak</Tag>
    <Tag size="sm">official-kodak</Tag>
  </div>
);
