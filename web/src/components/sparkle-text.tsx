"use client";
import { useState, useEffect } from "react";
import "./sparkle-text.css";
import { Logo } from "@/components/logo";
import { motion, AnimatePresence } from "framer-motion";

export function SparklesText() {
  const [letters, setLetters] = useState<
    {
      char: string;
      angle: number;
      delay: number;
      id: string;
    }[]
  >([]);

  useEffect(() => {
    const word = "sparkles";
    const newLetters = word.split("").map((char, index) => ({
      char,
      angle: (Math.random() - 0.5) * 20,
      delay: index * 0.1,
      id: `${char}-${index}`,
    }));
    setLetters(newLetters);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const letterVariants = {
    hidden: (letter: { angle: number }) => ({
      opacity: 0,
      y: 20,
      rotate: letter.angle * 2,
    }),
    visible: (letter: { angle: number; delay: number }) => ({
      opacity: 1,
      y: 0,
      rotate: letter.angle,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 12,
        delay: letter.delay,
      },
    }),
    hover: {
      scale: 1.2,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 10,
      },
    },
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
    hover: {
      scale: 1.1,
      rotate: 360,
      transition: {
        duration: 0.8,
        ease: "easeInOut",
      },
    },
  };

  const Sparkle = ({
    size = 4,
    color = "#FFD700",
    style,
  }: {
    size?: number;
    color?: string;
    style?: React.CSSProperties;
  }) => (
    <motion.span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        position: "absolute",
        ...style,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 1.2,
        repeat: Infinity,
        repeatDelay: Math.random() * 1.5,
      }}
    />
  );

  return (
    <motion.div
      layout
      className="flex items-center justify-center p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={logoVariants} whileHover="hover">
        <Logo width={60} height={60} className="size-10" />
      </motion.div>

      <motion.h1 className="text-4xl sm:text-6xl font-bold tracking-wide ml-4">
        <AnimatePresence>
          {letters.map((letter) => (
            <motion.span
              key={letter.id}
              custom={letter}
              variants={letterVariants}
              whileHover="hover"
              className="inline-block transition-transform duration-300 ease-in-out hover:scale-110 animate-gradient relative cursor-default"
              style={{
                animationDelay: `${letter.delay}s`,
              }}
            >
              <Sparkle style={{ top: -8, left: "50%" }} />
              <Sparkle style={{ bottom: -8, left: "50%" }} />
              <Sparkle style={{ left: -8, top: "50%" }} />
              <Sparkle style={{ right: -8, top: "50%" }} />
              {letter.char}
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.h1>
    </motion.div>
  );
}
