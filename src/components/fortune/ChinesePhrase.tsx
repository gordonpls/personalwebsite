export interface Chinese {
    phrase: string;
    pinyin: string;
    translation: string;
}

// Tap-to-speak via the browser's Web Speech API. No network call required.
// If the user's browser doesn't support TTS, the button is still rendered but
// silently no-ops (we don't pollute the UI with a permission-error message).
export const ChinesePhrase = ({ chinese }: { chinese: Chinese | null }) => {
    if (!chinese) return null;
    const speak = () => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(chinese.phrase);
        u.lang = "zh-CN";
        u.rate = 0.85;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    };
    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-base-content/50 font-semibold mb-3">Phrase of the day</p>
            <div className="flex items-center justify-center gap-3">
                <p
                    className="text-3xl md:text-4xl font-semibold text-base-content"
                    style={{ fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif' }}
                >
                    {chinese.phrase}
                </p>
                <button
                    type="button"
                    onClick={speak}
                    aria-label="Hear the pronunciation"
                    title="Hear the pronunciation"
                    className="btn btn-sm btn-circle btn-ghost"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            <p className="text-base text-base-content/60 italic mt-2 tracking-wide">{chinese.pinyin}</p>
            <p className="text-sm text-base-content/70 mt-2 max-w-md mx-auto">{chinese.translation}</p>
        </div>
    );
};
