import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DescriptionDialogProps = {
    title: string;
    description: string;
    maxLines?: number;
};

export function DescriptionDialog({ title, description, maxLines = 3 }: DescriptionDialogProps) {
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState(description);
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches);
    const isTruncated = preview !== description;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const visibleMaxLines = isMobile ? Math.min(maxLines, 2) : maxLines;

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 560px)");
        const updateMobileState = () => setIsMobile(mediaQuery.matches);
        mediaQuery.addEventListener("change", updateMobileState);
        return () => mediaQuery.removeEventListener("change", updateMobileState);
    }, []);

    useEffect(() => {
        let frame = 0;
        const measure = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const styles = getComputedStyle(trigger);
            const measureNode = document.createElement("span");
            measureNode.style.cssText = `position:fixed;left:-10000px;top:0;width:${trigger.clientWidth}px;visibility:hidden;font:${styles.font};font-size:${styles.fontSize};font-weight:${styles.fontWeight};line-height:${styles.lineHeight};letter-spacing:${styles.letterSpacing};white-space:pre-wrap;overflow-wrap:anywhere;`;
            document.body.appendChild(measureNode);
            const lineHeight = Number.parseFloat(styles.lineHeight);
            const fits = (text: string) => {
                measureNode.textContent = text;
                return measureNode.getBoundingClientRect().height <= lineHeight * visibleMaxLines + 1;
            };
            if (fits(description)) {
                setPreview((current) => current === description ? current : description);
                measureNode.remove();
                return;
            }
            let low = 0;
            let high = description.length;
            let bestPrefix = "";
            while (low <= high) {
                const middle = Math.floor((low + high) / 2);
                const prefix = description.slice(0, middle).trimEnd();
                const candidate = `${prefix}... Read more`;
                if (fits(candidate)) {
                    bestPrefix = prefix;
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
            }
            setPreview((current) => current === bestPrefix ? current : bestPrefix);
            measureNode.remove();
        };
        frame = window.requestAnimationFrame(measure);
        return () => window.cancelAnimationFrame(frame);
    }, [description, title, visibleMaxLines]);

    useEffect(() => {
        if (!open) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);

    return (
        <>
            <button aria-label={`Read the full description for ${title}`} className="gift-description-trigger" onClick={() => setOpen(true)} ref={triggerRef} title="Read full description" type="button">
                <span className="gift-description-preview">{preview}</span>{isTruncated ? <span aria-hidden="true" className="gift-description-more">... Read more</span> : null}
            </button>
            {open ? (
                <div className="description-backdrop" onClick={() => setOpen(false)} role="presentation">
                    <section aria-labelledby="gift-description-title" aria-modal="true" className="description-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
                        <div className="description-dialog-heading">
                            <div>
                                <span className="eyebrow">Description</span>
                                <h2 id="gift-description-title">{title}</h2>
                            </div>
                            <button aria-label="Close description" className="icon-button" onClick={() => setOpen(false)} title="Close description" type="button"><X size={17} /></button>
                        </div>
                        <div className="description-dialog-body">{description}</div>
                    </section>
                </div>
            ) : null}
        </>
    );
}
