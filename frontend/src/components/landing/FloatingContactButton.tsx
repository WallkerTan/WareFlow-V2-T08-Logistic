import React, { useState, useEffect } from "react";
import { PhoneCall, ArrowUp } from "lucide-react";

export const FloatingContactButton: React.FC = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="floating-actions-container">
            {showBackToTop && (
                <button 
                    onClick={scrollToTop} 
                    className="floating-btn back-to-top-btn"
                    title="Lên đầu trang"
                    aria-label="Lên đầu trang"
                >
                    <ArrowUp size={20} />
                </button>
            )}

            <a 
                href="#contact" 
                className="floating-btn contact-quick-btn"
                title="Liên hệ tư vấn"
            >
                <span className="pulse-ring" />
                <PhoneCall size={20} />
                <span className="floating-btn-text">Liên hệ tư vấn</span>
            </a>
        </div>
    );
};

export default FloatingContactButton;
