'use client';
import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.06 },
  }),
};

export function Reveal({ children, index = 0, as = 'div' }: { children: ReactNode; index?: number; as?: 'div' | 'section' | 'li' }) {
  const Comp: any = motion[as];
  return (
    <Comp
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      custom={index}
    >
      {children}
    </Comp>
  );
}
