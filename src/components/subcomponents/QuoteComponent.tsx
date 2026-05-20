import React, { useState } from "react";

export const QuoteComponent = () => {
  const quotes = [
    "A different path is fine, as long as it leads to a brighter future.",
    "There is no victory without effort.",
    "Good people are blessed with good friends.",
    "No effort is ever wasted.",
    "It’s all a matter of whether you act or not.",
    "Words of truth last forever.",
    "Without a dream, you can't move forward.",
    "Be relentless and unapologetic for being yourself.",
    "You can't rush greatness.",
    "Your kindness will give others strength.",
    "Seek incomparable friendship.",
    "Turn hardship into purpose.",
    "Change always starts with yourself."
  ];

  const shuffleQuotes = () => {
    const shuffled = [...quotes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [shuffledQuotes, setShuffledQuotes] = useState(shuffleQuotes());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  const currentQuote = isFinished
    ? "Even wisdom needs time to grow..."
    : shuffledQuotes[currentIndex];

  const handleClick = () => {
    if (isFinished) {
      setShuffledQuotes(shuffleQuotes());
      setCurrentIndex(0);
      setIsLoading(false);
      setIsFinished(false);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= shuffledQuotes.length) {
        setIsFinished(true);
      } else {
        setCurrentIndex(nextIndex);
      }
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );

      setIsLoading(false);
    }, 1300);
  };

  let bubbleClass = "chat-bubble-primary";
  let buttonClass = "btn-accent";
  if (isFinished) {
    bubbleClass = "chat-bubble-error";
    buttonClass = "btn-error";
  }

  return (
    <div className="flex flex-col p-4 items-center w-full">
      <h2 className="text-xl lg:text-2xl font-bold underline decoration-accent">
        Messages From Me
      </h2>

      <div className="flex items-center justify-center w-full" style={{ minHeight: "6rem" }}>
        <div className="chat chat-end w-full max-w-md">
          <div className="chat-image avatar avatar-online avatar-placeholder">
            <div className="bg-neutral text-neutral-content w-10 rounded-full">
              <span className="text-lg">GZ</span>
            </div>
          </div>
          <div className="chat-header">
            Gordon
            <time className="text-xs opacity-50"> {currentTime}</time>
          </div>
          <div className={`chat-bubble ${bubbleClass} w-full flex justify-center`}>
            {isLoading ? (
              <span className="loading loading-spinner text-white w-6 h-6"></span>
            ) : (
              currentQuote
            )}
          </div>
          <div className="chat-footer opacity-50">Delivered</div>
        </div>
      </div>

      <div className="self-center mt-4">
        <button
          className={`btn ${buttonClass} flex items-center gap-2 justify-center`}
          onClick={handleClick}
          disabled={isLoading}
          style={{ minWidth: "8rem" }}
        >
          {isFinished ? (
            <svg className="w-6 h-6 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="black" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v5a1 1 0 1 0 2 0V8Zm-1 7a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 30 30">
              <path d="M 15 3 C 12.031398 3 9.3028202 4.0834384 7.2070312 5.875 A 1.0001 1.0001 0 1 0 8.5058594 7.3945312 C 10.25407 5.9000929 12.516602 5 15 5 C 20.19656 5 24.450989 8.9379267 24.951172 14 L 22 14 L 26 20 L 30 14 L 26.949219 14 C 26.437925 7.8516588 21.277839 3 15 3 z M 4 10 L 0 16 L 3.0507812 16 C 3.562075 22.148341 8.7221607 27 15 27 C 17.968602 27 20.69718 25.916562 22.792969 24.125 A 1.0001 1.0001 0 1 0 21.494141 22.605469 C 19.74593 24.099907 17.483398 25 15 25 C 9.80344 25 5.5490109 21.062074 5.0488281 16 L 8 16 L 4 10 z" />
            </svg>
          )}
          {isFinished ? "Start Over" : "Keep It Coming"}
        </button>
      </div>
    </div>
  );
};
