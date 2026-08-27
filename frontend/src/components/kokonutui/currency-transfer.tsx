"use client";

/**
 * @author: @kokonut-labs
 * @description: Currency Transfer animation component
 * @version: 1.0.0
 * @date: 2025-11-02
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  ArrowUpDown,
  ArrowUpIcon,
  Check,
  InfoIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CheckmarkProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        delay: i * 0.2,
        type: "spring",
        duration: 1.5,
        bounce: 0.2,
        fill: { delay: i * 0.2 + 0.5, duration: 0.5 },
      },
    },
  }),
};

export function Checkmark({
  size = 100,
  strokeWidth = 2,
  color = "currentColor",
  className,
}: CheckmarkProps) {
  return (
    <motion.svg
      className={cn("w-25 h-25 stroke-emerald-500", className)}
      initial="hidden"
      animate="visible"
      width={size}
      height={size}
      viewBox="0 0 100 100"
    >
      <motion.circle
        cx="50"
        cy="50"
        r="40"
        stroke={color}
        strokeWidth={strokeWidth}
        custom={1}
        variants={draw as any}
        className="fill-emerald-500/10"
      />
      <motion.path
        d="M30 50L45 65L70 35"
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        custom={2}
        variants={draw as any}
      />
    </motion.svg>
  );
}

export default function CurrencyTransfer() {
  const [isCompleted, setIsCompleted] = useState(false);
  const transactionId = "pay_9cEFF9F41D";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCompleted(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TooltipProvider>
      <Card className="mx-auto flex h-[420px] w-full max-w-sm flex-col border border-zinc-200/80 bg-white p-6 shadow-xl backdrop-blur-sm transition-all duration-500 hover:border-emerald-500/20">
        <CardContent className="flex flex-1 flex-col justify-center space-y-4">
          <div className="flex h-[80px] items-center justify-center">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
              initial={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="relative flex h-[100px] w-[100px] items-center justify-center">
                <motion.div
                  animate={{
                    opacity: [0, 1, 0.8],
                  }}
                  className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl"
                  initial={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    times: [0, 0.5, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      animate={{
                        opacity: 1,
                        rotate: 0,
                      }}
                      className="flex h-[100px] w-[100px] items-center justify-center"
                      initial={{
                        opacity: 0,
                        rotate: -180,
                      }}
                      key="completed"
                      transition={{
                        duration: 0.6,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="relative z-10 rounded-full border border-emerald-500/30 bg-white p-5 shadow-sm">
                        <Check
                          className="h-10 w-10 text-emerald-500"
                          strokeWidth={3.5}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="flex h-[100px] w-[100px] items-center justify-center"
                      exit={{
                        opacity: 0,
                        rotate: 360,
                      }}
                      initial={{ opacity: 0 }}
                      key="progress"
                      transition={{
                        duration: 0.6,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="relative z-10">
                        <motion.div
                          animate={{
                            rotate: 360,
                            scale: [1, 1.02, 1],
                          }}
                          className="absolute inset-0 rounded-full border-2 border-transparent"
                          style={{
                            borderLeftColor: "rgb(16 185 129)",
                            borderTopColor: "rgb(16 185 129 / 0.2)",
                            filter: "blur(0.5px)",
                          }}
                          transition={{
                            rotate: {
                              duration: 3,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            },
                            scale: {
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            },
                          }}
                        />
                        <div className="relative z-10 rounded-full bg-white p-5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <ArrowUpDown className="h-10 w-10 text-emerald-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
          <div className="flex h-[280px] flex-col">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 w-full space-y-2 text-center"
              initial={{ opacity: 0, y: 10 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.h2
                    animate={{ opacity: 1, y: 0 }}
                    className="font-semibold text-lg text-zinc-900 uppercase tracking-tight"
                    exit={{ opacity: 0, y: -20 }}
                    initial={{ opacity: 0, y: 20 }}
                    key="completed-title"
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    Transfer Completed
                  </motion.h2>
                ) : (
                  <motion.h2
                    animate={{ opacity: 1, y: 0 }}
                    className="font-semibold text-lg text-zinc-900 uppercase tracking-tight"
                    exit={{ opacity: 0, y: -20 }}
                    initial={{ opacity: 0, y: 20 }}
                    key="progress-title"
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    Transfer in Progress
                  </motion.h2>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="font-medium text-emerald-600 text-xs"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="completed-id"
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    Transaction ID: {transactionId}
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="font-medium text-emerald-600 text-xs"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="progress-status"
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    Running smart retry...
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4 flex items-center gap-4">
                <motion.div
                  animate={{ opacity: 1 }}
                  className="relative flex-1"
                  initial={{ opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <motion.div
                    animate={{
                      gap: isCompleted ? "0px" : "12px",
                    }}
                    className="relative flex flex-col items-start"
                    initial={{ gap: "12px" }}
                    transition={{
                      duration: 0.6,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  >
                    <motion.div
                      animate={{
                        y: 0,
                        scale: 1,
                      }}
                      className={cn(
                        "w-full rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2.5 backdrop-blur-md transition-all duration-300",
                        isCompleted
                          ? "rounded-b-none border-b-0"
                          : "hover:border-emerald-500/30"
                      )}
                      transition={{
                        duration: 0.6,
                        ease: [0.32, 0.72, 0, 1],
                      }}
                    >
                      <div className="w-full space-y-1">
                        <motion.span
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1.5 font-medium text-xs text-zinc-500"
                          initial={{ opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <ArrowUpIcon className="h-3 w-3 text-slate-400" />
                          From
                        </motion.span>
                        <div className="flex flex-col gap-1.5">
                          <motion.div
                            animate={{ opacity: 1 }}
                            className="group flex items-center gap-2.5"
                            initial={{ opacity: 1 }}
                            transition={{
                              duration: 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <motion.span
                              animate={{ opacity: 1 }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/60 bg-white font-medium text-xs text-zinc-700 shadow-2xs"
                              initial={{ opacity: 1 }}
                              transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            >
                              ₹
                            </motion.span>
                            <div className="flex flex-col items-start text-left">
                              <span className="font-semibold text-xs text-zinc-900">
                                ₹49,800 failed
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                bank_server_down
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{
                        y: isCompleted ? 0 : 0,
                        scale: 1,
                      }}
                      className={cn(
                        "w-full rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2.5 backdrop-blur-md transition-all duration-300",
                        isCompleted
                          ? "rounded-t-none"
                          : "hover:border-emerald-500/30"
                      )}
                      transition={{
                        duration: 0.6,
                        ease: [0.32, 0.72, 0, 1],
                      }}
                    >
                      <div className="w-full space-y-1">
                        <motion.span
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1.5 font-medium text-xs text-zinc-500"
                          initial={{ opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <ArrowUpIcon className="h-3 w-3 rotate-180 text-slate-400" />
                          To
                        </motion.span>
                        <div className="flex flex-col gap-1.5">
                          <motion.div
                            animate={{ opacity: 1 }}
                            className="group flex items-center gap-2.5"
                            initial={{ opacity: 1 }}
                            transition={{
                              duration: 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <motion.span
                              animate={{ opacity: 1 }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-50 font-medium text-xs text-emerald-600 shadow-2xs"
                              initial={{ opacity: 1 }}
                              transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            >
                              ✓
                            </motion.span>
                            <div className="flex flex-col items-start text-left">
                              <span className="font-semibold text-xs text-zinc-900">
                                ₹49,800 recovered
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                Live — Razorpay test mode
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center justify-center gap-1 text-[11px] text-zinc-500"
                initial={{ opacity: 0, y: 5 }}
                transition={{
                  delay: 0.5,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span>Recovered on retry #2 — root cause: bank_server_down</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-zinc-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Automated smart retry triggered via Razorpay test mode API
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
