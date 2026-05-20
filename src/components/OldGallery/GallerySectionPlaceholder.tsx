const GallerySectionPlaceholder = ({ title, count, sectionId }) => {
  return (
    <div className="flex flex-col items-center" id={`gallery-section-${sectionId}`}>

      <div className="flex flex-row items-center">
        <h2 className="text-xl lg:text-2xl font-bold">{title} (coming soon)</h2>
      </div>
      <progress className="progress progress-success w-56 my-2"></progress>

      {/* Carousel Container */}
      <div
        id={`carousel-container-${sectionId}`}
        className="relative sm:w-auto sm:px-0 overflow-x-hidden"
      >
        {/* Horizontal Carousel (Large Screens) */}
        <div className="hidden sm:flex carousel carousel-horizontal rounded-box pb-2 lg:-mx-24 md:-mx-12 sm:mx-0">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              id={`carousel-horizontal-${sectionId}-${index}`}
              className="carousel-item cursor-pointer relative group overflow-y-clip"
            >
              <img className="w-64 h-64 skeleton rounded-none border border-accent border-2 transition-transform duration-300"></img>
            </div>
          ))}
        </div>

        {/* Mobile Carousel (Small Screens) */}
        <div
          id={`carousel-mobile-container-${sectionId}`}
          className="sm:hidden flex carousel w-[255px] h-64"
        >
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              id={`carousel-mobile-${sectionId}-${index}`}
              className="carousel-item cursor-pointer relative group"
            >
              <img className="w-[235px] h-64 skeleton rounded-none border-accent border-2 transition-transform duration-300"></img>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GallerySectionPlaceholder;
