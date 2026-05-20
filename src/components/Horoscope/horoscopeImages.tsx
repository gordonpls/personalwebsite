const HoroscopeImages = Object.fromEntries(
    Object.entries(import.meta.glob('../../assets/horoscope-signs/*.png', { eager: true }))
    .map(([path, module]) => {
      const name = path.split('/').pop().replace('.png', ''); // Extract file name
      return [name, module.default];
    })
  );
  
  export default HoroscopeImages;
