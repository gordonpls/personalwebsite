import React from "react";
import me from '../../assets/me.png';
import zodiacInfo from './horoscopeInfo.json';

export const HoroscopeResponse = ({ 
    sign, 
    name, 
    attributeMessage, 
    dailyHoroscopeMessage, 
    weeklyHoroscopeMessage, 
    horoscopeImage 
}) => {
    if (!dailyHoroscopeMessage) return null; // Hide if no horoscope data is available

    return (
        <div className="py-4">
            <div className="chat chat-start">
                <div className="chat-image avatar">
                    <div className="w-10 rounded-full ring">
                        <img alt="Horoscope Avatar" src={horoscopeImage} />
                    </div>
                </div>
                <div className="chat-header">
                    {sign ? zodiacInfo[sign].nicknames : ''}
                    <time className="text-xs opacity-50">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <div className="chat-bubble ">{attributeMessage}</div>
                <div className="chat-footer opacity-50">Delivered</div>
            </div>

            <div className="chat chat-start">
                <div className="chat-image avatar">
                    <div className="w-10 rounded-full ring">
                        <img alt="Horoscope Avatar" src={horoscopeImage} />
                    </div>
                </div>
                <div className="chat-header">
                    {sign ? zodiacInfo[sign].nicknames : ''}
                    <time className="text-xs opacity-50">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <div className="chat-bubble">{dailyHoroscopeMessage}</div>
                <div className="chat-footer opacity-50">Delivered</div>
            </div>

            <div className="chat chat-start">
                <div className="chat-image avatar">
                    <div className="w-10 rounded-full ring">
                        <img alt="Horoscope Avatar" src={horoscopeImage} />
                    </div>
                </div>
                <div className="chat-header">
                    {sign ? zodiacInfo[sign].nicknames : ''}
                    <time className="text-xs opacity-50">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <div className="chat-bubble">{weeklyHoroscopeMessage}</div>
                <div className="chat-footer opacity-50">Delivered</div>
            </div>

            <div className="chat chat-end">
                <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                        <img src={me} alt="Me.png avatar" />
                    </div>
                </div>
                <div className="chat-header">
                    {name}
                    <time className="text-xs opacity-50">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <div className="chat-bubble">Thank you!</div>
                <div className="chat-footer opacity-50">Delivered</div>
            </div>
        </div>
    );
};

export default HoroscopeResponse;
