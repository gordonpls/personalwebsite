import { useState, useEffect, useRef } from "react";
// Refined typing animation; swap back to "./subcomponents/TypingGreeting" to use the classic one.
import TypingGreetingRefined from "./subcomponents/TypingGreetingRefined";
// Caret shape: "block" | "underscore" | "bar"
const TypingGreeting = () => <TypingGreetingRefined caret="bar" />;
import InfoItem from "./ProfileCard/InfoItem";
import { emailIcon, locationIcon, linkedInIcon } from "./ProfileCard/icons";
import avatar from "../assets/avatar.webp";
import avatar2 from "../assets/avatar2.webp";
import { NowPlaying } from "./NowPlaying";

import CLOUDS from "vanta/dist/vanta.clouds.min";

export const Hero = () => {
    const [isHovered, setIsHovered] = useState(false);

    const [vantaEffect, setVantaEffect] = useState<any>(null);
    const myRef = useRef(null);
    useEffect(() => {
        if (!vantaEffect) {
            setVantaEffect(CLOUDS({
                el: myRef.current,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                sunGlareColor: 0x181210,
                sunlightColor: 0xf08b40
            }))
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy()
        }
    }, [vantaEffect])

    return (
        <div ref={myRef} className="bg-base-200 border-2 border-secondary rounded-md p-4 overflow-hidden">
            <div className="flex flex-col items-center gap-4 md:gap-8 sm:py-4 md:py-8 lg:py-16">
                {/* Top row: Component + Picture side-by-side */}
                <div className="flex flex-col md:flex-row md:justify-center md:items-start gap-4 md:space-x-6 lg:space-x-12">
                    {/* Picture (left) + now-playing under it */}
                    <div className="flex flex-col items-center gap-4 self-center pt-8 md:pt-0">
                        <div
                            className="relative cursor-pointer tooltip tooltip-success tooltip-open tooltip-top"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onTouchStart={() => setIsHovered(true)}
                            onTouchEnd={() => setIsHovered(false)}
                            data-tip="Hover me!"
                        >
                            {/* HEADSHOT: Visible when not hovered */}
                            <img
                                src={avatar}
                                alt="Avatar 1"
                                className={`max-w-sm h-64 md:h-64 lg:h-84 aspect-square object-cover rounded-full shadow-2xl transition-opacity duration-300 ring-4 ring-primary ${isHovered ? "opacity-0" : "opacity-100"}`}
                            />

                            {/* AVATAR: Visible when hovered */}
                            <img
                                src={avatar2}
                                alt="Avatar 2"
                                className={`max-w-sm h-64 md:h-64 lg:h-84 aspect-square object-cover rounded-full shadow-2xl absolute top-0 left-0 transition-opacity duration-300 ring-4 ring-primary ${isHovered ? "opacity-100" : "opacity-0"}`}
                            />
                        </div>
                        <NowPlaying />
                    </div>
                    {/* Component (right) */}
                    <div className="w-full self-center">
                        <div className="flex justify-center">
                            <TypingGreeting />
                        </div>
                        <div className="">
                            <div className="p-4 mx-auto">
                                <div className="flex flex-wrap gap-2 justify-center mx-auto self-center">
                                    <div className="badge badge-secondary">BSCS</div>
                                    <div className="badge badge-secondary">MBA</div>
                                    <div className="badge badge-secondary">MSF</div>
                                    <div className="badge badge-secondary">ESTJ-A</div>
                                    <div className="badge badge-secondary">Foodie</div>
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
