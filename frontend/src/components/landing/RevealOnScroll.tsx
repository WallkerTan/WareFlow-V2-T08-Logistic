import React, { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    threshold?: number;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
    children,
    className = "",
    delay = 0,
    threshold = 0.12,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (ref.current) observer.unobserve(ref.current);
                }
            },
            {
                threshold,
                rootMargin: "0px 0px -40px 0px",
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [threshold]);

    return (
        <div
            ref={ref}
            className={`reveal-box ${isVisible ? "is-visible" : ""} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default RevealOnScroll;

