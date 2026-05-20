// InfoItem.jsx
import React from 'react';

const InfoItem = ({ icon, text, url }) => (
    <div className="flex items-center space-x-2 text-black">
        {icon}
        {url ? (
            <a href={url} className="link" target="_blank" rel="noopener noreferrer">
                {text}
            </a>
        ) : (
            <span>{text}</span>
        )}
    </div>
);

export default InfoItem;
