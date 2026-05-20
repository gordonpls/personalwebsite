import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import resumePDF from "../assets/Gordon Zhong 2026 Resume.pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

export const Resume = () => {
    const [numPages, setNumPages] = useState(null);
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(null);

    const updateWidth = useCallback(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
    }, []);

    useEffect(() => {
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [updateWidth]);

    return (
        <div
            className="text-left bg-base-200 p-4 lg:p-8 lg:w-full mx-auto rounded-md border-2 border-secondary scroll-mt-24"
            id="resume"
        >
            {/* Breadcrumbs */}
            <div className="breadcrumbs max-w-fit">
                <ul>
                    <li className="pointer-events-none">
                        <span className="inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-base lg:text-xl">Home</span>
                        </span>
                    </li>
                    <li className="pointer-events-none">
                        <span className="inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-base lg:text-xl">Documents</span>
                        </span>
                    </li>
                    <li>
                        <a href={resumePDF} download>
                            <span className="inline-flex items-center gap-2 animate-pulse text-info">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-base lg:text-xl">Download Resume</span>
                            </span>
                        </a>
                    </li>
                </ul>
            </div>

            {/* PDF Viewer */}
            <div
                ref={containerRef}
                className="mt-8 w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:max-w-2xl mx-auto"
            >
                <a href={resumePDF} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                    <Document
                        file={resumePDF}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading={
                            <div className="flex justify-center py-12">
                                <span className="loading loading-spinner loading-lg text-info" />
                            </div>
                        }
                    >
                        {Array.from({ length: numPages || 0 }, (_, i) => (
                            <Page
                                key={i + 1}
                                pageNumber={i + 1}
                                width={containerWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="mb-4 rounded-md overflow-hidden shadow-lg"
                            />
                        ))}
                    </Document>
                </a>
            </div>
        </div>
    );
};
