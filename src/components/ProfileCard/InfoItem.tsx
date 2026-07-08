import React from 'react';
import { trackEvent } from '../../lib/analytics';

// Map known URLs to their analytics event type
function eventTypeForUrl(url: string): string | null {
    if (url.startsWith('mailto:')) return 'email_clicked';
    if (url.includes('linkedin.com')) return 'linkedin_clicked';
    if (url.includes('github.com')) return 'github_clicked';
    return null;
}

const InfoItem = ({ icon, text, url }: { icon: React.ReactNode; text: string; url: string }) => (
    <div className="flex items-center space-x-2 text-black">
        {icon}
        {url ? (
            <a
                href={url}
                className="link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                    const evt = eventTypeForUrl(url);
                    if (evt) trackEvent(evt);
                }}
            >
                {text}
            </a>
        ) : (
            <span>{text}</span>
        )}
    </div>
);

export default InfoItem;
