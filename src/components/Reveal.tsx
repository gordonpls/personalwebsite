import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Fade + rise a section into view as it enters the viewport (once).
export const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
    <motion.div
        className={className}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
        {children}
    </motion.div>
);
