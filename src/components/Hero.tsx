import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
// Refined typing animation; swap back to "./subcomponents/TypingGreeting" to use the classic one.
import TypingGreetingRefined from "./subcomponents/TypingGreetingRefined";
// Caret shape: "block" | "underscore" | "bar"
const TypingGreeting = () => <TypingGreetingRefined caret="bar" />;
import { trackEvent } from "../lib/analytics";
import CopyEmail from "./ProfileCard/CopyEmail";
import { BADGES, HeroBadge } from "./HeroBadge";
import { emailIcon, locationIcon, linkedInIcon } from "./ProfileCard/icons";
// Avatars render at most 336px (h-84); ship ~2× that, as webp.
import avatar from "../assets/avatar.webp?w=720&format=webp";
import avatarCartoon from "../assets/avatar.jpeg?w=720&format=webp";
import { NowPlaying } from "./NowPlaying";

import CLOUDS from "vanta/dist/vanta.clouds.min";

// Star centres relative to the avatar: a large one near the top-right edge
// and four small ones at the points of a diamond around it, twinkling in turn
// (centre, then top → right → bottom → left).
const AVATAR_STARS = [
    { top: "15%", right: "15%", size: "2.25rem", delay: "2.3s" },
    { top: "-3%", right: "15%", size: "1rem", delay: "2.45s" },
    { top: "15%", right: "-3%", size: "1rem", delay: "2.6s" },
    { top: "33%", right: "15%", size: "0.75rem", delay: "2.75s" },
    { top: "15%", right: "33%", size: "0.75rem", delay: "2.9s" },
];

// Frosted-glass surface shared by badges and contact chips. The sky behind is
// light in both themes, so dark ink on white glass reads everywhere.
// Contact line items: plain icon + text (no container), so they read as a
// business-card footer rather than another row of buttons.
const CONTACT = "flex items-center gap-2 text-sm font-medium text-slate-800 [&>svg]:size-5";
const DEGREES = new Set(["BSCS", "MBA", "MSF"]);
const STICKER_TILTS = [-4, 3];

export const Hero = () => {
    const myRef = useRef(null);
    // Both avatar faces must be loaded before the flip starts, or the spin
    // could land on a blank cartoon side.
    const [facesLoaded, setFacesLoaded] = useState(0);
    const onFaceLoad = () => setFacesLoaded((n) => n + 1);
    useEffect(() => {
        const effect = CLOUDS({
            el: myRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            // Light blue sky; muted clouds with a darker blue shadow for contrast/depth.
            skyColor: 0x8ec5e6,
            cloudColor: 0xadc1de,
            cloudShadowColor: 0x476d93,
            sunGlareColor: 0x181210,
            sunlightColor: 0xf08b40
        });
        // The container grows after late-loading content (avatar images, fonts)
        // reflows it. Vanta only sizes its canvas on init and on window resize,
        // so re-measure whenever the container's own size changes — otherwise the
        // canvas stays at its shorter initial height and leaves a gap at the bottom.
        // Only resize on a real size change, at most once per frame: the avatar's
        // 3D spin fires the observer every frame without changing the size, and
        // resizing Vanta on each of those starved the page into never loading.
        let last = "";
        let frame = 0;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            const size = `${Math.round(width)}x${Math.round(height)}`;
            if (size === last) return;
            last = size;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => effect?.resize());
        });
        if (myRef.current) observer.observe(myRef.current);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            effect?.destroy();
        };
    }, [])

    return (
        <div ref={myRef} className="bg-base-200 border-2 border-secondary business:border-[#2f6fe0] rounded-md p-4 overflow-hidden">
            <div className="flex flex-col items-center gap-4 md:gap-8 sm:py-4 md:py-8 lg:py-16">
                {/* Top row: Component + Picture side-by-side */}
                <div className="flex flex-col md:flex-row md:justify-center md:items-start gap-4 md:space-x-6 lg:space-x-12">
                    {/* Picture (left) + now-playing under it */}
                    <div className="flex flex-col items-center gap-4 self-center pt-8 md:pt-0">
                        {/* Photo spins into the cartoon on load (see .avatar-flip in index.css). */}
                        <div className={`avatar-flip relative max-w-sm h-64 md:h-64 lg:h-84 aspect-square ${facesLoaded >= 2 ? "is-spinning" : ""}`}>
                            <div className="avatar-flip-inner">
                                <img
                                    src={avatar}
                                    alt=""
                                    aria-hidden="true"
                                    onLoad={onFaceLoad}
                                    className="avatar-flip-face shadow-2xl ring-4 ring-primary business:ring-[#2f6fe0]"
                                />
                                <img
                                    src={avatarCartoon}
                                    alt="Gordon Zhong"
                                    onLoad={onFaceLoad}
                                    className="avatar-flip-face avatar-flip-back shadow-2xl ring-4 ring-primary business:ring-[#2f6fe0]"
                                />
                            </div>
                            {/* Diamond of four-point stars that twinkle once the cartoon lands. */}
                            {AVATAR_STARS.map(({ top, right, size, delay }) => (
                                <svg
                                    key={`${top}-${right}`}
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    className="avatar-flip-star"
                                    style={{ top, right, "--s": size, animationDelay: delay } as CSSProperties}
                                >
                                    <path fill="currentColor" d="M12 0C12.9 6.6 17.4 11.1 24 12 17.4 12.9 12.9 17.4 12 24 11.1 17.4 6.6 12.9 0 12 6.6 11.1 11.1 6.6 12 0Z" />
                                </svg>
                            ))}
                        </div>
                        <NowPlaying />
                    </div>
                    {/* Component (right) */}
                    <div className="w-full self-center">
                        <div className="flex justify-center">
                            <TypingGreeting />
                        </div>
                        {/* Credentials (dotted-underline text), personality stickers, and a
                            plain contact line: three roles, three distinct looks. */}
                        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 pt-2">
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                                <ul className="flex items-center gap-2.5" aria-label="Degrees">
                                    {BADGES.filter((b) => DEGREES.has(b.label)).map((b, i) => (
                                        <Fragment key={b.label}>
                                            {i > 0 && <li aria-hidden="true" className="text-slate-800/50">·</li>}
                                            <HeroBadge badge={b} variant="credential" />
                                        </Fragment>
                                    ))}
                                </ul>
                                <ul className="flex items-center gap-3" aria-label="About me">
                                    {BADGES.filter((b) => !DEGREES.has(b.label)).map((b, i) => (
                                        <HeroBadge key={b.label} badge={b} variant="sticker" tilt={STICKER_TILTS[i % STICKER_TILTS.length]} />
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 [&>*+*]:border-l [&>*+*]:border-slate-800/20 [&>*+*]:pl-4">
                                <CopyEmail icon={emailIcon} email="me@gordonzhong.com" className={CONTACT} />
                                <a
                                    href="https://linkedin.com/in/gordon-zhong"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackEvent("linkedin_clicked")}
                                    className={`${CONTACT} hover:underline`}
                                >
                                    {linkedInIcon}
                                    in/gordon-zhong
                                </a>
                                <span className={CONTACT}>
                                    {locationIcon}
                                    New York, NY
                                </span>
                            </div>
                        </div>
                        {/* <div className="justify-self-center py-4">
                            <button className="btn btn-primary">View Resume</button>
                        </div> */}
                    </div>
                </div>
            </div>

        </div>
    )

};
