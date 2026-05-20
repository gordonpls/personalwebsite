import { useState, useRef, useEffect } from "react";
import HoroscopeImages from "./HoroscopeImages";
import zodiacInfo from './horoscopeInfo.json';
import { getZodiacSign } from "../functions/getZodiacSign";
import { fixPunctuationSpacing } from "../functions/HelperFunctions";
import { HoroscopeForm } from "./HoroscopeForm";
import HoroscopeResponse from "./HoroscopeResponse";
import HoroscopePlaceholder from "./HoroscopePlaceholder";

export const Horoscope = () => {
    const [name, setName] = useState('');
    const [sign, setSign] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [attributeMessage, setAttributeMessage] = useState(null);
    const [dailyHoroscopeMessage, setDailyHoroscopeMessage] = useState(null);
    const [weeklyHoroscopeMessage, setWeeklyHoroscopeMessage] = useState(null);
    const [horoscopeImage, setHoroscopeImage] = useState(null);
    const [error, setError] = useState(null);

    const bottomRef = useRef(null);

    useEffect(() => {
        if (dailyHoroscopeMessage || weeklyHoroscopeMessage) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [dailyHoroscopeMessage, weeklyHoroscopeMessage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!month || !day) {
            setError("Please enter your birthday.");
            return;
        }

        const calculatedSign = getZodiacSign(month, day);
        if (!calculatedSign) {
            setError("Could not determine your sign. Please check your date.");
            return;
        }

        setSign(calculatedSign);

        try {
            const dailyResponse = await fetch(`/api/api/v1/get-horoscope/daily?sign=${calculatedSign}&day=TODAY`);
            const weeklyResponse = await fetch(`/api/api/v1/get-horoscope/weekly?sign=${calculatedSign}`);

            if (!dailyResponse.ok || !weeklyResponse.ok) {
                throw new Error("Failed to divine your horoscope. Please try again later!");
            }

            const dailyResult = await dailyResponse.json();
            const weeklyResult = await weeklyResponse.json();

            if (dailyResult.success && weeklyResult.success) {
                setAttributeMessage(`Ah, quite the unique ${zodiacInfo[calculatedSign].element} sign. As a ${calculatedSign}, you must be reasonably ${zodiacInfo[calculatedSign].attributes}!`);

                const dailyHoroscopeData = dailyResult.data;
                const dailyMessage = dailyHoroscopeData.horoscope_data;
                const parts = dailyMessage.split(new RegExp(`\\b${calculatedSign}\\b`, 'gi'));
                const personalizedDailyMessage = (
                    <>
                        <strong>{dailyHoroscopeData.date}: </strong>
                        {parts.map((part, index) => (
                            <span key={index}>
                                {part}
                                {index !== parts.length - 1 && <span className="text-blue-500 font-bold">{name}</span>}
                            </span>
                        ))}
                    </>
                );

                setHoroscopeImage(HoroscopeImages[calculatedSign]);
                setDailyHoroscopeMessage(personalizedDailyMessage);

                const weeklyHoroscopeData = weeklyResult.data;
                const week = weeklyHoroscopeData.week;
                const weeklyMessage = weeklyHoroscopeData.horoscope_data;
                setWeeklyHoroscopeMessage(
                    <>
                        <strong>Week of {week}:</strong> {fixPunctuationSpacing(weeklyMessage)}
                    </>
                );
            } else {
                throw new Error('Something went wrong. Please try again later.');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="h-auto">
            <h1 className="lg:text-5xl lg:text-left text-3xl text-center font-bold pb-4">Horoscope</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 justify-items-center">
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <HoroscopeForm name={name} setName={setName} month={month} setMonth={setMonth} day={day} setDay={setDay} handleSubmit={handleSubmit} />
                <HoroscopeResponse
                    sign={sign}
                    name={name}
                    attributeMessage={attributeMessage}
                    dailyHoroscopeMessage={dailyHoroscopeMessage}
                    weeklyHoroscopeMessage={weeklyHoroscopeMessage}
                    horoscopeImage={horoscopeImage}
                />
                <HoroscopePlaceholder hasSubmitted={!!dailyHoroscopeMessage} />
            </div>
            <div ref={bottomRef}></div>
        </div>
    );
};
