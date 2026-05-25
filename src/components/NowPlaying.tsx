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
            className="group flex items-center gap-2.5 w-fit max-w-full px-3 py-1.5 rounded-full bg-base-200/70 border border-base-300 text-sm hover:bg-base-200 transition-colors"
            title={`${track.isPlaying ? "Now playing" : "Last played"} on Spotify`}
        >
            {track.albumArt && <img src={track.albumArt} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
            {track.isPlaying ? <Equalizer /> : <span className="text-base-content/40 shrink-0 text-xs">♪</span>}
            <span className="truncate min-w-0">
                <span className="font-medium text-base-content">{track.title}</span>
                <span className="text-base-content/50"> · {track.artist}</span>
            </span>
            <span className="text-[11px] text-base-content/40 shrink-0 ml-1 group-hover:text-success transition-colors">
                {track.isPlaying ? "Now playing" : "Last played"}
            </span>
        </a>
    );
};
