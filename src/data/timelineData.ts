export type EntryType = "role" | "education" | "break";

export type TimelineEntry = {
    type: EntryType;
    title: string;
    org: string;
    period: string;
    location?: string;
    bullets?: string[];
    note?: string;
};

export const TIMELINE_ENTRIES: TimelineEntry[] = [
    {
        type: "education",
        title: "M.S. in Finance",
        org: "Boston University, Questrom School of Business",
        period: "Aug 2025 – May 2026",
        location: "Boston, MA",
        note: "GPA: 3.86",
    },
    {
        type: "role",
        title: "Shift Supervisor",
        org: "7 Leaves Cafe",
        period: "Mar 2024 – Dec 2024 · 10 mos",
        location: "Las Vegas, NV",
        bullets: [
            "Trained and mentored a new team to build an inclusive and collaborative culture with positive morale.",
            "Directed shift operations during an ownership transition, resolving issues and maintaining service quality.",
            "Delivered operational excellence and high customer satisfaction in a fast-paced, high-pressure environment.",
        ],
    },
    {
        type: "education",
        title: "Master of Business Administration",
        org: "University of Northern Colorado",
        period: "Aug 2023 – May 2024",
        location: "Greeley, CO",
        note: "GPA: 3.94",
    },
    {
        type: "break",
        title: "Travel — Asia",
        org: "Career Break",
        period: "Jan 2023 – Aug 2023 · 8 mos",
        note: "Travelled through Japan, South Korea, and Thailand — immersing in diverse cultures, adapting to new environments, and gaining fresh perspectives.",
    },
    {
        type: "role",
        title: "Associate II Software Engineer",
        org: "S&P Global",
        period: "Mar 2022 – Jan 2023 · 11 mos",
        location: "Englewood, CO",
        bullets: [
            "Developed and optimized a full-stack analytics web application integrating geospatial data with real-time visualizations across large energy datasets.",
            "Translated technical delivery and data constraints into stakeholder-ready insights, influencing roadmap prioritization and aligning cross-functional teams.",
            "Led adoption of a scalable front-end architecture and UI component library with 100+ components, accelerating delivery cycles across the Energy Division.",
        ],
    },
    {
        type: "role",
        title: "Associate I Software Engineer",
        org: "IHS Markit",
        period: "Jun 2020 – Mar 2022 · 1 yr 10 mos",
        location: "Englewood, CO",
        bullets: [
            "Built and deployed full-stack features focused on front-end workflows, improving Angular application speed and seamless component communication.",
            "Converted UI/UX wireframes and Figma designs into responsive, interactive components, reducing design-to-development turnaround time.",
            "Resolved critical UI bugs and performance bottlenecks, boosting system stability and cutting page load times.",
        ],
    },
    {
        type: "education",
        title: "B.S. in Computer Science, with Honors",
        org: "University of Colorado Denver",
        period: "May 2020",
        location: "Denver, CO",
        note: "GPA: 3.67",
    },
    {
        type: "role",
        title: "Data Engineer Intern",
        org: "Health Data Compass",
        period: "Jan 2019 – Jun 2020 · 1 yr 6 mos",
        location: "Denver, CO",
        bullets: [
            "Automated manual processes using Python, reducing processing time and freeing staff for higher-value analysis.",
            "Presented analysis of enterprise APIs to support board-level strategic planning.",
            "Researched and documented Google Cloud Platform tooling to improve ETL reliability and team throughput.",
        ],
    },
];
