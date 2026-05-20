import React from 'react'

export const Footer = () => {
    return (
        <footer className="footer sm:footer-horizontal footer-center bg-base-300 text-base-content p-2 mt-4">
            <aside>
                <p>Copyright © Gordon Zhong {new Date().getFullYear()} - All Rights Reserved.</p>
            </aside>
        </footer>
    )
}