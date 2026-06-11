import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  openIndex: number | null;
  altPrefix: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Full-screen image viewer. Closes on the X button, a click outside the
 * image, or the Escape key. Shows prev/next arrows when the gallery has
 * more than one image (also navigable with arrow keys).
 */
export function ImageLightbox({ images, openIndex, altPrefix, onClose, onNavigate }: ImageLightboxProps) {
  const isOpen = openIndex !== null && openIndex >= 0 && openIndex < images.length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        onNavigate(((openIndex as number) + 1) % images.length);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        onNavigate(((openIndex as number) - 1 + images.length) % images.length);
      }
    };

    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, openIndex, images.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={`${altPrefix} image viewer`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-[81] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 md:right-6 md:top-6"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate(((openIndex as number) - 1 + images.length) % images.length);
                }}
                className="absolute left-3 top-1/2 z-[81] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 md:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate(((openIndex as number) + 1) % images.length);
                }}
                className="absolute right-3 top-1/2 z-[81] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 md:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full flex-col items-center gap-3"
          >
            <div className="overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_40px_120px_rgba(2,6,23,0.5)] md:p-8">
              <img
                key={openIndex}
                src={images[openIndex as number]}
                alt={`${altPrefix} large view ${(openIndex as number) + 1}`}
                className="max-h-[72vh] max-w-[86vw] object-contain md:max-w-[70vw]"
              />
            </div>
            {images.length > 1 && (
              <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                {(openIndex as number) + 1} / {images.length}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
