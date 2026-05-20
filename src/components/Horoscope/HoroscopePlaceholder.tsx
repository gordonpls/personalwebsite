import React, { useState, useEffect } from "react";
import zodiacConversations from "./zodiacConvos.json"; // Adjust path as needed
import horoscopeImages from "../../components/Horoscope/HoroscopeImages"; // Adjust path as needed

const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

export const HoroscopePlaceholder = ({ hasSubmitted }) => {
    const [selectedZodiac, setSelectedZodiac] = useState(null);
    const [selectedResponses, setSelectedResponses] = useState([]);

    useEffect(() => {
        if (!hasSubmitted) {
            const zodiacKeys = Object.keys(zodiacConversations);
            const chosenZodiac = getRandomElement(zodiacKeys);

            // Select 3 random zodiacs for responses (excluding the chosen zodiac)
            const remainingZodiacs = zodiacKeys.filter(z => z !== chosenZodiac);
            const shuffledResponses = [...remainingZodiacs].sort(() => 0.5 - Math.random()).slice(0, 3);

            setSelectedZodiac(chosenZodiac);
            setSelectedResponses(shuffledResponses);
        }
    }, [hasSubmitted]);

    if (hasSubmitted || !selectedZodiac || selectedResponses.length === 0) return null; // Hide if user submitted info

    return (
        <div className="py-4">
            {/* Zodiac Saying */}
            <div className="chat chat-start">
                <div className="chat-image avatar">
                    <div className="w-10 rounded-full ring">
                        <img alt="Horoscope Avatar" src={horoscopeImages[selectedZodiac]} />
                    </div>
                </div>
                <div className="chat-header">
                    {selectedZodiac} {/* Display zodiac sign name */}
                    <time className="text-xs opacity-50">
                        {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                </div>
                <div className="chat-bubble">"{zodiacConversations[selectedZodiac].saying}"</div>
                <div className="chat-footer opacity-50">Delivered</div>
            </div>

            {/* Responses from 3 other zodiac signs */}
            {selectedResponses.map((responseZodiac, index) => (
                <div key={index} className="chat chat-end">
                    <div className="chat-image avatar">
                        <div className="w-10 rounded-full ring">
                            <img alt="Horoscope Avatar" src={horoscopeImages[responseZodiac]} />
                        </div>
                    </div>
                    <div className="chat-header">
                        {responseZodiac} {/* Display zodiac sign name */}
                        <time className="text-xs opacity-50">
                            {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </time>
                    </div>
                    <div className="chat-bubble">{zodiacConversations[selectedZodiac].responses[responseZodiac]}</div>
                    <div className="chat-footer opacity-50">Delivered</div>
                </div>
            ))}
        </div>
    );
};

export default HoroscopePlaceholder;
