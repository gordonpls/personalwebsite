const DenverImages = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/gallery/denver/*.webp', { eager: true }))
    .map(([path, module]) => {
      const name = path.split('/').pop().replace('.webp', ''); // Extract file name
      return [name, module.default];
    })
);

const ThailandImages = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/gallery/thailand/*.webp', { eager: true }))
    .map(([path, module]) => {
      const name = path.split('/').pop().replace('.webp', ''); // Extract file name
      return [name, module.default];
    })
);

const VegasImages = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/gallery/vegas/*.webp', { eager: true }))
    .map(([path, module]) => {
      const name = path.split('/').pop().replace('.webp', ''); // Extract file name
      return [name, module.default];
    })
);

export { DenverImages, ThailandImages, VegasImages };
