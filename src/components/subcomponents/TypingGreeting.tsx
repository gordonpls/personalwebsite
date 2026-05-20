import React, { useEffect, useState } from "react";
import greetings from "../../assets/greetings.json";

const letterDelay = 100; // Delay between letters when typing
const backspaceDelay = 75; // Delay between letters when backspacing
const pauseDelay = 1500; // Pause after typing before backspacing

// Generates a randomized order of languages, always starting with "English".
const generateOrder = () => {
  const remaining = Object.keys(greetings).filter((lang) => lang !== "English");
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return ["English", ...remaining];
};

const TypingGreeting = () => {
  const [order, setOrder] = useState(generateOrder());
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const typedGreeting = greetings[order[index]]; // Current greeting phrase

  useEffect(() => {
    let cancelled = false;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const typeAndDelete = async () => {
      setDisplayedText(""); // 🛠️ Explicitly clear text BEFORE typing

      // Typing Effect
      for (let i = 0; i < typedGreeting.length; i++) {
        if (cancelled) return;
        setDisplayedText((prev) => prev + typedGreeting[i]);
        await delay(letterDelay);
      }

      // Pause before backspacing
      await delay(pauseDelay);

      // Backspacing Effect
      setIsDeleting(true);
      for (let i = typedGreeting.length; i > 0; i--) {
        if (cancelled) return;
        setDisplayedText((prev) => prev.slice(0, -1));
        await delay(backspaceDelay);
      }

      if (cancelled) return;
      setDisplayedText(""); // 🛠️ Ensure full reset after backspacing
      setIsDeleting(false);

      // Move to the next greeting
      setIndex((prevIndex) => {
        if (prevIndex >= order.length - 1) {
          setOrder(generateOrder());
          return 0;
        }
        return prevIndex + 1;
      });
    };

    typeAndDelete();
    return () => {
      cancelled = true;
    };
  }, [index, order, typedGreeting]);

  return (
    <div className="typing-greeting text-center flex flex-col text-secondary w-full">
      <span className="text-base text-xl lg:text-3xl font-bold w-full">
        {displayedText}
        <span className="cursor"> </span>
      </span>
      <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold my-2 pb-2 text-white animate-pulse drop-shadow-xl">
        Gordon Zhong
      </h1>
    </div>
  );
};

export default TypingGreeting;
