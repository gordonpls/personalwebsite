import { useEffect, useState } from 'react';

export const WeatherComponent = () => {
    const [weather, setWeather] = useState(null);
    const [error, setError] = useState(null);

    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY; // from .env

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Step 1: Get user's location based on IP
                const ipRes = await fetch('https://ipapi.co/json/');
                if (!ipRes.ok) throw new Error('Failed to detect location.');

                const ipData = await ipRes.json();
                const { city } = ipData;

                if (!city) throw new Error('Could not determine your city.');

                // Step 2: Fetch weather data using city
                const weatherRes = await fetch(
                    `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(city)}`
                );

                if (!weatherRes.ok) throw new Error('Failed to fetch weather data.');

                const weatherData = await weatherRes.json();
                setWeather(weatherData);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchWeather();
    }, [API_KEY]);

    if (error) return <p className="text-red-500">{error}</p>;
    if (!weather) return <p>Loading weather...</p>;

    const { location, current } = weather;

    return (
        <div className="aspect-square w-56 place-content-center p-4 rounded-md bg-primary text-white max-w-sm">
            <div className="flex items-center mb-2">
                <h2 className="text-lg lg:text-xl font-semibold pr-2">Weather in <span className="underline decoration-neutral decoration-wavy">{location.name}:</span></h2>
                <img
                    src={current.condition.icon}
                    alt={current.condition.text}
                    className="w-16 h-16"
                />
            </div>
            <p className="text-md">{location.region}, {location.country}</p>
            <p className="text-md mt-2">Temperature: {current.temp_f}°F</p>
            <p className="text-md capitalize">Condition: {current.condition.text}</p>
        </div>
    );
};
