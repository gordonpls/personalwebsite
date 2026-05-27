import { useEffect, useState } from "react";

interface Track {
    isPlaying: boolean;
    configured?: boolean;
    title?: string;
    artist?: string;
    albumArt?: string;
    url?: string;
}

const Equalizer = () => (
    <span className="inline-flex items-end gap-[2px] h-3.5 text-success shrink-0" aria-hidden="true">
        <span className="eq-bar" style={{ animationDelay: "0ms" }} />
        <span className="eq-bar" style={{ animationDelay: "150ms" }} />
        <span className="eq-bar" style={{ animationDelay: "300ms" }} />
    </span>
);

// Thin, one-line "now playing" bar (current or last-played Spotify track).
// Renders nothing until Spotify is configured and a track is available.
export const NowPlaying = () => {
    const [track, setTrack] = useState<Track | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => fetch("/api/now-playing")
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setTrack(d); })
            .catch(() => { /* stay hidden */ });
        load();
        const id = setInterval(load, 20_000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    if (!track || track.configured === false || !track.title) return null;

    return (
        <a
            href={track.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group hidden lg:flex items-center gap-2 max-w-md px-2.5 py-1 rounded-full bg-base-200/70 border border-base-300 hover:bg-base-200 transition-colors"
            title={`${track.isPlaying ? "Now playing" : "Last played"} on Spotify · ${track.title} — ${track.artist}`}
        >
            {track.albumArt && <img src={track.albumArt} alt="" className="w-4 h-4 rounded object-cover shrink-0" />}
            {track.isPlaying ? <Equalizer /> : <span className="text-base-content/40 shrink-0 text-[10px]">♪</span>}
            <span className="truncate min-w-0 text-xs">
                <span className="font-medium text-base-content">{track.title}</span>
                <span className="text-base-content/50"> · {track.artist}</span>
            </span>
        </a>
    );
};
