import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog } from "@headlessui/react";
import { useSwipeable } from "react-swipeable";

const GallerySection = ({ title, images, rating }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [shuffledKeys, setShuffledKeys] = useState([]);
    const [direction, setDirection] = useState(0); // 1 = next, -1 = prev

    // Fisher-Yates shuffle
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Shuffle images on mount
    useEffect(() => {
        if (images) {
            const keys = Object.keys(images);
            setShuffledKeys(shuffleArray(keys));
        }
    }, [images]);

    const currentIndex = selectedImage ? shuffledKeys.indexOf(selectedImage) : -1;

    const handleNext = () => {
        if (currentIndex < shuffledKeys.length - 1) {
            setDirection(1);
            setSelectedImage(shuffledKeys[currentIndex + 1]);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setSelectedImage(shuffledKeys[currentIndex - 1]);
        }
    };

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleNext(),
        onSwipedRight: () => handlePrev(),
        trackTouch: true,
        trackMouse: false,
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedImage) return;
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") setSelectedImage(null);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedImage, currentIndex, shuffledKeys]);

    useEffect(() => {
        document.body.style.overflow = selectedImage ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [selectedImage]);

    const showLightbox = shuffledKeys.length > 0 && selectedImage;
    const displayTitle = shuffledKeys.length > 0 ? title : `${title} - Coming Soon`;

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
        }),
    };

    return (
        <section className="px-5 max-w-5xl mx-auto h-[90vh]">
            {/* Title */}
            <div className="flex flex-col items-center mb-4">
                <h2 className="text-xl lg:text-2xl font-bold underline decoration-accent">
                    {displayTitle}
                </h2>

                <div className="flex items-center pb-2 pt-2">
                    <span className="badge badge-outline badge-success text-lg p-4">
                        Rating&nbsp;
                        <div className="rating rating-lg rating-half">
                            {Array.from({ length: 5 }, (_, i) => {
                                const full = i + 1;
                                const half = i + 0.5;
                                return (
                                    <Fragment key={i}>
                                        <div
                                            className="mask mask-star-2 mask-half-1 bg-success"
                                            aria-label={`${half} star`}
                                            aria-current={rating === half ? "true" : undefined}
                                        />
                                        <div
                                            className="mask mask-star-2 mask-half-2 bg-success"
                                            aria-label={`${full} star`}
                                            aria-current={rating === full ? "true" : undefined}
                                        />
                                    </Fragment>
                                );
                            })}
                        </div>
                    </span>
                </div>

                <p className="font-bold uppercase text-primary text-center mb-2">
                    ↑ Scroll Up & Down ↓
                </p>
                <p className="hidden sm:block font-bold uppercase text-primary text-center mb-2">
                    Click to Zoom
                </p>
                <p className="sm:hidden font-bold uppercase text-primary text-center mb-2">
                    Tap to Zoom
                </p>
            </div>

            {/* Scrollable gallery container */}
            <div
                className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 p-3 bg-secondary rounded-md overflow-y-auto overscroll-y-contain"
                style={{ maxHeight: "70vh" }}
            >
                {shuffledKeys.length > 0 ? (
                    shuffledKeys.map((name) => (
                        <motion.div
                            key={name}
                            whileHover={{ scale: 1.02 }}
                            className="cursor-pointer"
                            onClick={() => {
                                setDirection(0);
                                setSelectedImage(name);
                            }}
                        >
                            <img
                                src={images[name]}
                                alt={name}
                                className="h-auto max-w-full aspect-square object-cover rounded-md transition-transform duration-300 hover:scale-105"
                            />
                        </motion.div>
                    ))
                ) : (
                    Array.from({ length: 12 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="skeleton aspect-square rounded-md h-auto max-w-full rounded-lg cursor-not-allowed"
                        />
                    ))
                )}
            </div>

            {/* Lightbox Dialog */}
            {showLightbox && (
                <Dialog
                    open={!!selectedImage}
                    onClose={() => setSelectedImage(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                >
                    <div
                        className="absolute inset-0"
                        onClick={() => setSelectedImage(null)}
                    />

                    <motion.div
                        {...swipeHandlers}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative p-4 z-10"
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-5 right-5 w-[30px] h-[30px] 
                         bg-white text-black border-2 border-error"
                        >
                            ✕
                        </button>
                        <button
                            onClick={handlePrev}
                            className="absolute top-1/2 left-6 transform -translate-y-1/2 
                         w-[30px] h-[30px] bg-white text-black border-2 border-primary"
                        >
                            ←
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute top-1/2 right-6 transform -translate-y-1/2
                         w-[30px] h-[30px] bg-white text-black border-2 border-primary"
                        >
                            →
                        </button>

                        {/* Animated Lightbox Image */}
                        <AnimatePresence custom={direction} initial={false} mode="popLayout">
                            <motion.img
                                key={selectedImage}
                                src={images[selectedImage]}
                                alt="Selected"
                                className="max-w-full max-h-[90vh]"
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            />
                        </AnimatePresence>
                    </motion.div>
                </Dialog>
            )}
        </section>
    );
};

export default GallerySection;
