import React, { useState, useMemo, useEffect } from "react";

// Reusable GallerySection Component
const GallerySection = ({ title, images, sectionId, stars }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasOpenedModal, setHasOpenedModal] = useState(false);

  // Shuffle images once
  const shuffledImages = useMemo(() => {
    const entries = Object.entries(images);
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  }, [images]);

  // Pick the middle index as soon as we have shuffled images
  useEffect(() => {
    if (shuffledImages.length > 0) {
      const midIndex = Math.floor(shuffledImages.length / 2);
      setSelectedIndex(midIndex);
    }

  }, [shuffledImages]);

  // Open modal and set the selected image/index
  const openModal = (index) => {
    setSelectedIndex(index);
    setSelectedImage(shuffledImages[index][1]); // The image source
    setHasOpenedModal(true);
  };

  // Keyboard navigation for the modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImage) return; // Only listen when modal is open

      if (e.key === "ArrowRight") {
        const nextIndex = (selectedIndex + 1) % shuffledImages.length;
        setSelectedIndex(nextIndex);
        setSelectedImage(shuffledImages[nextIndex][1]);
      }

      if (e.key === "ArrowLeft") {
        const prevIndex =
          (selectedIndex - 1 + shuffledImages.length) % shuffledImages.length;
        setSelectedIndex(prevIndex);
        setSelectedImage(shuffledImages[prevIndex][1]);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedImage(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, selectedIndex, shuffledImages]);

  useEffect(() => {
    // Only do this when the modal is closed
    // if (!selectedImage) {
    // 1) Identify the section itself
    const gallerySectionElement = document.getElementById(
      `gallery-section-${sectionId}`
    );
    if (!gallerySectionElement) return;

    // 2) Check if the gallery section is somewhat in the viewport
    //    Adjust conditions to your preference:
    const rect = gallerySectionElement.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

    // If NOT in the viewport, skip auto-scrolling
    if (!inViewport) {
      return;
    }

    const container = document.getElementById(
      `carousel-container-${sectionId}`
    );
    const slide = document.getElementById(
      `carousel-horizontal-${sectionId}-${selectedIndex}`
    );

    if (container && slide) {
      // The midpoint of the target slide
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;

      // Subtract half the container width to center the slide
      const containerCenter = container.clientWidth / 2;
      const scrollLeft = slideCenter - containerCenter;

      container.scrollTo({
        left: scrollLeft,
        behavior: hasOpenedModal ? "smooth" : "auto",
      });
    }

    if (slide) {
      slide.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }

    // Same for vertical container if desired
    const vContainer = document.getElementById(
      `carousel-mobile-container-${sectionId}`
    );
    const vSlide = document.getElementById(
      `carousel-mobile-${sectionId}-${selectedIndex}`
    );

    if (vContainer && vSlide) {
      const slideMiddle = vSlide.offsetTop + vSlide.offsetHeight / 2;
      const containerMiddle = vContainer.clientHeight / 2;
      const scrollTop = slideMiddle - containerMiddle;

      vContainer.scrollTo({
        top: scrollTop,
        behavior: hasOpenedModal ? "smooth" : "auto",
      });
    }

    if (vSlide) {
      vSlide.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
      });
    }
    // }
  }, [selectedIndex, sectionId, selectedImage, hasOpenedModal]);

  return (
    <div className="scroll-mt-56">
      <div className="flex flex-col items-center pb-4" id={`gallery-section-${sectionId}`}>
        <div className="flex flex-row items-center">
          <h2 className="text-xl lg:text-2xl font-bold pr-2">{title} - </h2>

          <div className="rating rating-md rating-half">
            {Array.from({ length: 5 }, (_, index) => {
              const fullStar = index + 1;
              const halfStar = index + 0.5;

              return (
                <React.Fragment key={index}>
                  {/* Left Half-Star */}
                  <div
                    className="mask mask-star-2 mask-half-1 bg-success"
                    aria-label={`${halfStar} star`}
                    aria-current={stars === halfStar ? "true" : undefined}
                  ></div>

                  {/* Right Full-Star */}
                  <div
                    className="mask mask-star-2 mask-half-2 bg-success"
                    aria-label={`${fullStar} star`}
                    aria-current={stars === fullStar ? "true" : undefined}
                  ></div>
                </React.Fragment>
              );
            })}
          </div>


        </div>

        {/* Carousel Container */}
        <div
          id={`carousel-container-${sectionId}`}
          className="relative sm:w-auto sm:px-0 overflow-x-hidden"
        >
          {/* Horizontal Carousel (Large Screens) */}
          <div className="hidden sm:flex carousel carousel-horizontal rounded-box pb-2 lg:-mx-24 md:-mx-12 sm:mx-0">
            {shuffledImages.map(([name, src], index) => (
              <div
                key={index}
                id={`carousel-horizontal-${sectionId}-${index}`}
                className={`carousel-item cursor-pointer relative group overflow-y-clip ${index === selectedIndex ? "active" : ""
                  }`}
                onClick={() => openModal(index)}
              >
                <img
                  src={src}
                  alt={name}
                  className="w-64 h-64 object-cover transition-transform duration-300 hover:scale-105 border border-accent border-2"
                />
                {/* Click Indicator */}
                <p className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to Zoom
                </p>
              </div>
            ))}
          </div>

          {/* Mobile Carousel (Small Screens) */}
          <div
            id={`carousel-mobile-container-${sectionId}`}
            className="sm:hidden flex carousel w-[250px] h-64"
          >
            {shuffledImages.map(([name, src], index) => (
              <div
                key={index}
                id={`carousel-mobile-${sectionId}-${index}`}
                className={`carousel-item cursor-pointer relative group ${index === selectedIndex ? "active" : ""
                  }`}
                onClick={() => openModal(index)}
              >
                <img
                  src={src}
                  alt={name}
                  className="w-[225px] h-64 object-cover transition-transform duration-300 hover:scale-105 border-accent border-2"
                />
                {/* Tap Indicator */}
                <p className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  Tap to Zoom
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Zoom */}
        {selectedImage && (
          <div
            id="modalBackground"
            className="fixed inset-0 bg-black flex justify-center items-center z-50"
            onClick={(e) =>
              e.target.id === "modalBackground" && setSelectedImage(null)
            }
          >
            <div className="relative max-w-full max-h-full p-4">
              {/* Close Button */}
              <button
                className="absolute top-5 right-5 w-[30px] h-[30px] bg-white text-black border-2 border-error"
                onClick={() => setSelectedImage(null)}
              >
                ✕
              </button>

              {/* Left Arrow Button */}
              <button
                className="absolute top-1/2 left-6 transform -translate-y-1/2 h-[30px] w-[30px] bg-white text-black rounded-full text-lg"
                onClick={() => {
                  const prevIndex =
                    (selectedIndex - 1 + shuffledImages.length) %
                    shuffledImages.length;
                  setSelectedIndex(prevIndex);
                  setSelectedImage(shuffledImages[prevIndex][1]);
                }}
              >
                ←
              </button>

              {/* Enlarged Image */}
              <img
                src={selectedImage}
                alt="Zoomed"
                className="max-w-[90vw] max-h-[90vh] object-contain shadow-xl border-accent border-2"
              />

              {/* Right Arrow Button */}
              <button
                className="absolute top-1/2 right-6 transform -translate-y-1/2 h-[30px] w-[30px] bg-white text-black rounded-full text-lg"
                onClick={() => {
                  const nextIndex = (selectedIndex + 1) % shuffledImages.length;
                  setSelectedIndex(nextIndex);
                  setSelectedImage(shuffledImages[nextIndex][1]);
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

export default GallerySection;
