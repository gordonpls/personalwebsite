import { useEffect, useRef, useState, type CSSProperties } from "react";
// Refined typing animation; swap back to "./subcomponents/TypingGreeting" to use the classic one.
import TypingGreetingRefined from "./subcomponents/TypingGreetingRefined";
// Caret shape: "block" | "underscore" | "bar"
const TypingGreeting = () => <TypingGreetingRefined caret="bar" />;
import InfoItem from "./ProfileCard/InfoItem";
import { emailIcon, locationIcon, linkedInIcon } from "./ProfileCard/icons";
import avatar from "../assets/avatar.webp";
import avatarCartoon from "../assets/avatar.jpeg";
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
                        <div className="">
                            <div className="p-4 mx-auto border border-secondary border-4 business:border-[#2f6fe0]">
                                <div className="flex flex-wrap gap-2 justify-center mx-auto self-center">
                                    <div className="badge badge-secondary business:!bg-[#2f6fe0] business:!text-white business:!border-transparent">BSCS</div>
                                    <div className="badge badge-secondary business:!bg-[#2f6fe0] business:!text-white business:!border-transparent">MBA</div>
                                    <div className="badge badge-secondary business:!bg-[#2f6fe0] business:!text-white business:!border-transparent">MSF</div>
                                    <div className="badge badge-secondary business:!bg-[#2f6fe0] business:!text-white business:!border-transparent">ESTJ-A</div>
                                    <div className="badge badge-secondary business:!bg-[#2f6fe0] business:!text-white business:!border-transparent">Foodie</div>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-2 pt-4 justify-center place-self-center">
                                    <InfoItem
                                        icon={emailIcon}
                                        text="me@gordonzhong.com"
                                        url="mailto:me@gordonzhong.com"
                                    />
                                    <InfoItem
                                        icon={linkedInIcon}
                                        text="in/gordon-zhong"
                                        url="https://linkedin.com/in/gordon-zhong"
                                    />
                                    <InfoItem icon={locationIcon} text="Medford, MA 02155" url=""/>
                                </div>
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
