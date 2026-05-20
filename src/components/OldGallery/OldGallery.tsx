import { ThailandImages, VegasImages, DenverImages } from "../Gallery/GalleryImages";
import GallerySection from "./GallerySection";
import GallerySectionPlaceholder from "./GallerySectionPlaceholder";

export const OldGallery = () => {
    return (
        <div className="min-h-screen flex flex-col bg-base-200 p-4 lg:p-8 rounded-md border-2 border-secondary">

            {/* Scroll Indicator - Horizontal (Large Screens) */}
            <p className="hidden sm:block font-bold uppercase text-primary text-lg text-center mb-2">
                ← Click to Zoom →
            </p>

            <p className="sm:hidden font-bold uppercase text-primary text-center mb-2">
                ← Swipe Left & Right →
            </p>

            {/* Scroll Indicator - Vertical (Small Screens) */}
            <p className="sm:hidden font-bold uppercase text-primary text-center mb-2">
                Tap to Zoom
            </p>

            <GallerySection title="Vegas" images={VegasImages} sectionId="vegas" stars={4.5}/>
            <GallerySection title="Thailand" images={ThailandImages} sectionId="thailand" stars={5}/>
            <GallerySection title="Denver" images={DenverImages} sectionId="denver" stars={3.5}/>
            <GallerySectionPlaceholder
                title="New York"
                count="12" 
                sectionId="ny"
            />

        </div>
    );
};
