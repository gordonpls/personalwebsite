import { useEffect, useRef } from "react";
// Refined typing animation; swap back to "./subcomponents/TypingGreeting" to use the classic one.
import TypingGreetingRefined from "./subcomponents/TypingGreetingRefined";
// Caret shape: "block" | "underscore" | "bar"
const TypingGreeting = () => <TypingGreetingRefined caret="bar" />;
import InfoItem from "./ProfileCard/InfoItem";
import { emailIcon, locationIcon, linkedInIcon } from "./ProfileCard/icons";
import avatar from "../assets/avatar.webp";
import { NowPlaying } from "./NowPlaying";

import CLOUDS from "vanta/dist/vanta.clouds.min";

export const Hero = () => {
    const myRef = useRef(null);
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
        const observer = new ResizeObserver(() => effect?.resize());
        if (myRef.current) observer.observe(myRef.current);
        return () => {
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
                        <img
                            src={avatar}
                            alt="Gordon Zhong"
                            className="max-w-sm h-64 md:h-64 lg:h-84 aspect-square object-cover rounded-full shadow-2xl ring-4 ring-primary business:ring-[#2f6fe0]"
                        />
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
