import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

interface ExpandableCommentaryCardProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function ExpandableCommentaryCard({
  title,
  children,
  className,
  titleClassName,
}: ExpandableCommentaryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const detailVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        "cursor-pointer overflow-hidden rounded-3xl border p-5 transition-shadow duration-300 hover:shadow-md",
        className
      )}
    >
      <h4 className={cn("text-sm font-semibold uppercase tracking-[0.18em]", titleClassName)}>
        {title}
      </h4>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            key="details"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={detailVariants}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}