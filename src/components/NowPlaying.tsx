import { useEffect, useState } from "react";

interface Track {
    isPlaying: boolean;
    configured?: boolean;
    title?: string;
    artist?: string;
    album?: string;
    albumArt?: string;
    url?: string;
    playedAt?: string;
}

const Equalizer = () => (
    <span className="inline-flex items-end gap-0.5 h-3 text-success" aria-hidden="true">
        <span className="eq-bar" style={{ animationDelay: "0ms" }} />
        <span className="eq-bar" style={{ animationDelay: "150ms" }} />
        <span className="eq-bar" style={{ animationDelay: "300ms" }} />
        <span className="eq-bar" style={{ animationDelay: "75ms" }} />
    </span>
);

// Polls the backend for the currently-playing (or last-played) Spotify track.
export const NowPlaying = () => {
    const [track, setTrack] = useState<Track | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = () => fetch("/api/now-playing")
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setTrack(d); })
            .catch(() => { if (!cancelled) setFailed(true); });
        load();
        const id = setInterval(load, 20_000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    const card = "bg-base-100 border border-base-300 rounded-2xl p-5";

    if (failed || (track && track.configured === false)) {
        return (
            <div className={card}>
                <p className="text-xs uppercase tracking-widest text-base-content/40 font-medium mb-1">Spotify</p>
                <p className="text-sm text-base-content/60">Not connected right now.</p>
            </div>
        );
    }
    if (!track) {
        return <div className={`${card} h-24 animate-pulse`} aria-hidden="true" />;
    }

    const live = track.isPlaying;
    const status = live ? "Now playing" : track.title ? "Last played" : "Not playing";

    return (
        <div className={card}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs uppercase tracking-widest text-base-content/40 font-medium">Spotify</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${live ? "text-success" : "text-base-content/50"}`}>
                    {live && <Equalizer />}{status}
                </span>
            </div>
            {track.title ? (
                <a href={track.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                    {track.albumArt
                        ? <img src={track.albumArt} alt="" className="w-16 h-16 rounded-lg object-cover shadow-sm shrink-0" />
                        : <div className="w-16 h-16 rounded-lg bg-base-200 shrink-0" />}
                    <div className="min-w-0">
                        <p className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">{track.title}</p>
                        <p className="text-sm text-base-content/60 truncate">{track.artist}</p>
                        {track.album && <p className="text-xs text-base-content/40 truncate">{track.album}</p>}
                    </div>
                </a>
            ) : (
                <p className="text-sm text-base-content/60">Nothing playing at the moment.</p>
            )}
        </div>
    );
};
