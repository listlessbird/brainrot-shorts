"use client";
import { useState, useRef, MouseEvent } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Github, Heart } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FaXTwitter } from "react-icons/fa6";

export function Attr() {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    controls.start({
      scale: [1, 1.2, 1],
      transition: { duration: 0.5 },
    });
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // @ts-ignore
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleTooltipMouseLeave = () => {
    handleClose();
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen}>
        <motion.div
          className="p-4 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="max-w-md mx-auto flex items-center justify-center lg:space-x-3 text-foreground"
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
          >
            <span className="text-sm font-medium hidden lg:inline">
              built with
            </span>
            <motion.div
              animate={{
                rotateY: [0, 360],
                transition: { duration: 2, repeat: Infinity, ease: "linear" },
              }}
            >
              <Heart className="size-5 text-red-500" fill="currentColor" />
            </motion.div>
            <motion.span
              className="text-sm font-medium hidden lg:inline"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              by{" "}
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium underline-offset-4 hover:underline"
                  onClick={handleClick}
                  onFocus={handleOpen}
                  onBlur={handleClose}
                >
                  listlessbird
                </Button>
              </TooltipTrigger>
            </motion.span>
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {isOpen && (
            <TooltipContent
              side="top"
              sideOffset={5}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
              className="select-none cursor-default"
            >
              <motion.div
                className="flex flex-col items-center space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <div className="flex items-center space-x-2">
                  <Github className="size-4" />
                  <a
                    href="https://github.com/listlessbird"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    onClick={handleLinkClick}
                    onFocus={handleOpen}
                    onBlur={handleClose}
                  >
                    github.com/listlessbird
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <FaXTwitter className="size-4" />
                  <a
                    href="https://twitter.com/listlessbird"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    onClick={handleLinkClick}
                    onFocus={handleOpen}
                    onBlur={handleClose}
                  >
                    @listlessbird
                  </a>
                </div>
              </motion.div>
            </TooltipContent>
          )}
        </AnimatePresence>
      </Tooltip>
    </TooltipProvider>
  );
}
