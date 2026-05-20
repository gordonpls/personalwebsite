import { useState } from "react";
import avatar from "../../assets/avatar.webp";
import avatar2 from "../../assets/avatar2.webp";
import InfoItem from "./InfoItem";
import { emailIcon, locationIcon, linkedInIcon } from "./icons";

export const ProfileCard = () => {
    // State to track which image is shown
    const [isFlipped, setIsFlipped] = useState(false);

    // Click handler to toggle image state
    const toggleImage = () => {
        setIsFlipped((prev) => !prev);
    };

    return (
        <div className="flex flex-col pt-12 items-center bg-base-300 rounded-md w-full sm:max-w-xs md:max-w-md lg:max-w-lg">
            <div className="indicator">
                <span className="indicator-item status status-lg status-success animate-ping"></span>
                <div className="indicator-item status status-lg status-success"></div>

                {/* Use a single container for both images, and flip via click. */}
                <div
                    className="relative cursor-pointer tooltip tooltip-success tooltip-open tooltip-top"
                    onClick={toggleImage}
                    data-tip="Click below!"
                >
                    {/* HEADSHOT: Visible if NOT flipped */}
                    <img
                        src={avatar}
                        alt="Avatar 1"
                        className={`max-w-sm h-84 rounded-md shadow-2xl transition-opacity duration-300 ${isFlipped ? "opacity-0" : "opacity-100"
                            }`}
                    />

                    {/* AVATAR: Visible if flipped */}
                    <img
                        src={avatar2}
                        alt="Avatar 2"
                        className={`max-w-sm h-84 rounded-md shadow-2xl absolute top-0 left-0 transition-opacity duration-300 ${isFlipped ? "opacity-100" : "opacity-0"
                            }`}
                    />
                </div>
            </div>

            <div className="flex flex-row flex-wrap pt-4 justify-center gap-2 w-xs">
                <div className="badge badge-primary">BSCS</div>
                <div className="badge badge-primary">MBA</div>
                <div className="badge badge-primary">ENTJ-A</div>
                <div className="badge badge-primary">Foodie</div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4">
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
                <InfoItem icon={locationIcon} text="Medford, MA 02155" url="" />
            </div>
        </div>
    );
};
