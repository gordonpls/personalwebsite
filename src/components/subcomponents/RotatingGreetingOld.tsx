import React, { useState, useEffect, useMemo } from "react";
import greetings from "../../static/greetings.json";

// Helper function to measure text width using a canvas.
const getTextWidth = (text, font) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  return context.measureText(text).width;
};

const RotatingGreeting = ({ name = "Gordon Zhong", interval = 1500 }) => {
  const [order, setOrder] = useState([]);
  const [index, setIndex] = useState(0);
  const delayBounce = 800;

  // Calculate the required minWidth using canvas measurement.
  const computedMinWidth = useMemo(() => {
    // This font should match your styling (e.g. text-5xl and font-bold)
    const font = "700 48px sans-serif";
    let maxWidth = 0;
    Object.values(greetings).forEach((text) => {
      const width = getTextWidth(text, font);
      if (width > maxWidth) maxWidth = width;
    });
    return maxWidth;
  }, []);

  // Generates a new cycle order with English first and the rest in a random order.
  const generateOrder = () => {
    const languages = Object.keys(greetings).filter((lang) => lang !== "English");
    for (let i = languages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [languages[i], languages[j]] = [languages[j], languages[i]];
    }
    return ["English", ...languages];
  };

  // Initialize the order when the component mounts.
  useEffect(() => {
    setOrder(generateOrder());
    setIndex(0);
  }, []);

  // Set up the interval to update the index.
  useEffect(() => {
    if (order.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prevIndex) => {
        if (prevIndex >= order.length - 1) {
          setOrder(generateOrder());
          return 0;
        }
        return prevIndex + 1;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [order, interval]);

  if (order.length === 0) return null;

  const currentLanguage = order[index];
  const greetingText = greetings[currentLanguage];

  return (
    <div className="w-full flex justify-center">
      <h1 className="font-bold flex flex-col items-center pt-2 text-center 
                     text-5xl md:text-4xl sm:text-3xl">
        <span
          key={index}
          className="inline-block animate-bounce rotating-greeting"
          style={{
            // Use the computedMinWidth on larger screens.
            minWidth: `${computedMinWidth}px`,
            textAlign: "center",
            animationDuration: `${interval + delayBounce}ms`,
            animationIterationCount: 1,
          }}
        >
          {greetingText}
        </span>
        <span className="mt-4">{name}</span>
      </h1>
    </div>
  );
};

export default RotatingGreeting;
