import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import { Card } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";

// Define the types for the component props for type-safety and reusability
interface User {
  src: string;
  fallback: string;
}

interface Action {
  Icon: React.ElementType;
  bgColor: string;
}

export interface WorkflowBuilderCardProps {
  imageUrl?: string;
  status?: "Active" | "Inactive";
  lastUpdated?: string;
  title: string;
  description: string;
  tags?: string[];
  users?: User[];
  actions?: Action[];
  className?: string;
  icon?: React.ReactNode;
  footerAction?: React.ReactNode;
  bgClass?: string;
  textColorClass?: string;
  subtextColorClass?: string;
  iconContainerClass?: string;
  onClick?: () => void;
}

export const WorkflowBuilderCard = ({
  imageUrl,
  status,
  lastUpdated,
  title,
  description,
  tags,
  users,
  actions,
  className,
  icon,
  footerAction,
  bgClass,
  textColorClass = "text-card-foreground",
  subtextColorClass = "text-muted-foreground",
  iconContainerClass,
  onClick,
}: WorkflowBuilderCardProps) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // Animation variants for the details section
  const detailVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      marginTop: "0.5rem",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn("w-full cursor-pointer group", className)}
      onClick={onClick}
    >
      <div className={cn("overflow-hidden rounded-[28px] shadow-md transition-shadow duration-300 hover:shadow-xl relative text-left w-full", bgClass)}>
        {/* Background Overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_55%)]" />
        
        {/* Card Image if exists */}
        {imageUrl && (
          <div className="relative h-36 w-full">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        )}

        <div className="p-7 relative">
          {/* Always-visible header content */}
          <div className="flex flex-col space-y-5">
            {icon && (
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", iconContainerClass)}>
                {icon}
              </div>
            )}
            
            <div className="flex flex-col">
              {lastUpdated && status && (
                <div className={cn("flex items-center gap-2 text-xs", subtextColorClass)}>
                  <span>{lastUpdated}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        status === "Active" ? "bg-green-500" : "bg-red-500"
                      )}
                      aria-label={status}
                    />
                    <span>{status}</span>
                  </div>
                </div>
              )}
              
              <h2 className={cn("text-2xl font-semibold", textColorClass)}>
                {title}
              </h2>
            </div>
          </div>

          {/* Animated description and tags section */}
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
                <p className={cn("text-sm leading-6", subtextColorClass)}>{description}</p>
                {tags && tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {footerAction && (
             <div className="mt-5 flex items-center gap-2 text-sm font-medium transition-all duration-200 group-hover:gap-3">
               {footerAction}
             </div>
          )}
        </div>

        {/* Card Footer if users/actions exist */}
        {(users?.length || actions?.length) ? (
          <div className="flex items-center justify-between border-t border-border p-4 relative z-10">
            <div className="flex -space-x-2">
              {users?.map((user, index) => (
                <Avatar
                  key={index}
                  className="h-7 w-7 border-2 border-card"
                  aria-label={user.fallback}
                >
                  <AvatarImage src={user.src} />
                  <AvatarFallback>{user.fallback}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex items-center -space-x-2">
              {actions?.map(({ Icon, bgColor }, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-white",
                    bgColor
                  )}
                >
                  <Icon size={14} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
