'use client';

import type { ReactNode } from 'react';
import { useRef, useState, type JSX } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from 'framer-motion';

const easing: [number, number, number, number] = [0.22, 1, 0.36, 1];

const marqueeLogos: { name: string; icon: JSX.Element }[] = [
  {
    name: 'Codecraft_',
    icon: (
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6,4 1,9 6,14" />
        <polyline points="16,4 21,9 16,14" />
        <line x1="13" y1="2" x2="9" y2="16" />
      </svg>
    ),
  },
  {
    name: 'ennLabs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        {[3, 10, 17].flatMap((x) => [3, 10, 17].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
        )))}
      </svg>
    ),
  },
  {
    name: 'GlobalBank',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="9" />
        <circle cx="11" cy="11" r="4" />
      </svg>
    ),
  },
  {
    name: '45 Degrees\u00b0',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="16" x2="16" y2="2" />
        <polyline points="7,2 16,2 16,11" />
      </svg>
    ),
  },
  {
    name: 'AlphaWave',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="9" />
        <path d="M5 11Q8 7 11 11Q14 15 17 11" />
      </svg>
    ),
  },
  {
    name: 'Biosynthesis',
    icon: (
      <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="0" y1="3" x2="24" y2="3" />
        <line x1="6" y1="9" x2="24" y2="9" />
        <line x1="0" y1="15" x2="18" y2="15" />
      </svg>
    ),
  },
  {
    name: 'Boltshift',
    icon: (
      <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
        <polygon points="8,0 0,11 6,11 6,20 14,9 8,9" />
      </svg>
    ),
  },
  {
    name: 'Clandestine',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="7.5" y="0" width="3" height="18" />
        <rect x="0" y="7.5" width="18" height="3" />
      </svg>
    ),
  },
];

const caseStudies = [
  {
    id: 'heartx',
    title: 'HeartX',
    category: 'Brand Strategy & Product Design',
    year: '2026',
    image: 'https://images.pexels.com/photos/7691249/pexels-photo-7691249.jpeg?auto=compress&cs=tinysrgb&w=800',
    squares: [{ x: 5, y: 30, s: 16 }, { x: 10, y: 42, s: 10 }, { x: 3, y: 52, s: 7 }, { x: 80, y: 70, s: 14 }, { x: 85, y: 82, s: 9 }, { x: 78, y: 60, s: 6 }],
  },
  {
    id: 'swave',
    title: 'Swave\u00AE',
    category: 'Web Design & Identity',
    year: '2025',
    image: 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=800',
    squares: [{ x: 82, y: 55, s: 16 }, { x: 88, y: 68, s: 10 }, { x: 78, y: 72, s: 7 }, { x: 85, y: 42, s: 6 }, { x: 90, y: 80, s: 8 }],
  },
  {
    id: 'eduspark',
    title: 'EduSpark',
    category: 'Brand Strategy & Web Design',
    year: '2023',
    image: 'https://images.pexels.com/photos/5428003/pexels-photo-5428003.jpeg?auto=compress&cs=tinysrgb&w=800',
    squares: [{ x: 4, y: 24, s: 16 }, { x: 10, y: 36, s: 10 }, { x: 2, y: 44, s: 7 }, { x: 78, y: 78, s: 14 }, { x: 84, y: 88, s: 8 }],
  },
  {
    id: 'greenergy',
    title: 'Greenergy',
    category: 'Brand Strategy & Web Design',
    year: '2022',
    image: 'https://images.pexels.com/photos/2800832/pexels-photo-2800832.jpeg?auto=compress&cs=tinysrgb&w=800',
    squares: [{ x: 82, y: 26, s: 14 }, { x: 88, y: 38, s: 10 }, { x: 78, y: 44, s: 7 }, { x: 84, y: 54, s: 5 }, { x: 90, y: 60, s: 8 }],
  },
];

const floatingSquares = [
  { x: 6, y: 20, s: 12, delay: 0 },
  { x: 12, y: 32, s: 8, delay: 0.3 },
  { x: 8, y: 44, s: 6, delay: 0.6 },
  { x: 88, y: 18, s: 10, delay: 0.9 },
  { x: 92, y: 30, s: 14, delay: 1.2 },
  { x: 85, y: 42, s: 7, delay: 1.5 },
  { x: 90, y: 52, s: 5, delay: 1.8 },
  { x: 14, y: 56, s: 5, delay: 2.1 },
];

function MarqueeTrack(): ReactNode {
  const doubled = [...marqueeLogos, ...marqueeLogos];
  return (
    <div className="marquee-projects flex w-max">
      {doubled.map((logo, i) => (
        <div key={i} className="flex shrink-0 items-center gap-2.5 px-8">
          <span className="text-black">{logo.icon}</span>
          <span className="whitespace-nowrap text-sm font-medium tracking-wide text-black/80">{logo.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ProjectsSection(): ReactNode {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  return (
    <>
      <style>{`
        @keyframes marqueeProjects {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-projects {
          animation: marqueeProjects 28s linear infinite;
        }
        .marquee-projects:hover { animation-play-state: paused; }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <section ref={sectionRef} className="relative bg-white text-black" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Top Area */}
        <div className="relative px-6 pb-10 pt-32 sm:px-10 lg:px-16 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {floatingSquares.map((sq) => (
              <FloatingSquare key={`${sq.x}-${sq.y}`} sq={sq} scrollYProgress={scrollYProgress} />
            ))}
          </div>

          <div ref={headerRef} className="relative mx-auto max-w-7xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easing }}
            >
              <span className="mb-5 inline-block bg-black px-4 py-1.5 text-[13px] font-medium tracking-wide text-white">Projects</span>
              <h2 className="text-[clamp(1.8rem,3.2vw,2.8rem)] font-light leading-[1.25] tracking-tight">
                <span className="text-black">Insights from </span>
                <span className="text-black/40">Our</span><br />
                <span className="text-black/40">Case Studies</span>
              </h2>
            </motion.div>
          </div>
        </div>

        {/* Cards */}
        <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-10 lg:px-16">
          <div className="grid gap-4 md:grid-cols-2">
            {caseStudies.map((study, i) => (
              <CaseStudyCard key={study.id} study={study} index={i} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mx-auto max-w-7xl px-6 pb-6 sm:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div className="max-w-md">
              <div className="mb-4 flex h-7 w-7 items-center justify-center border border-black/20 text-xs text-black">+</div>
              <p className="text-[14px] leading-[1.7] text-black/60">
                We partner with ambitious brands that are ready to move beyond fragmented visuals and shallow quick fixes - turning their identity, website, and messaging into one focused engine for growth.
              </p>
              <button className="group mt-6 flex items-end">
                <span className="inline-flex items-center gap-[10px] border border-black/20 bg-black px-3 py-2 text-base font-medium text-white hover:bg-black/85">Let&apos;s work together</span>
                <span className="mb-6 h-6 w-6 bg-black transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:mb-9">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M18.75 6V15.75C18.75 15.949 18.671 16.14 18.53 16.28C18.39 16.421 18.199 16.5 18 16.5C17.801 16.5 17.61 16.421 17.47 16.28C17.329 16.14 17.25 15.949 17.25 15.75V7.81L6.53 18.53C6.39 18.671 6.199 18.75 6 18.75C5.801 18.75 5.61 18.671 5.47 18.53C5.329 18.39 5.25 18.199 5.25 18C5.25 17.801 5.329 17.61 5.47 17.47L16.19 6.75H8.25C8.051 6.75 7.86 6.671 7.72 6.53C7.579 6.39 7.5 6.199 7.5 6C7.5 5.801 7.579 5.61 7.72 5.47C7.86 5.329 8.051 5.25 8.25 5.25H18C18.199 5.25 18.39 5.329 18.53 5.47C18.671 5.61 18.75 5.801 18.75 6Z" />
                  </svg>
                </span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden md:ml-12 border-t border-black/10 md:border-t-0">
              <div className="overflow-hidden py-5"><MarqueeTrack /></div>
            </div>
          </div>
        </div>
        <div className="h-12" />
      </section>
    </>
  );
}

function FloatingSquare({
  sq,
  scrollYProgress,
}: {
  sq: { x: number; y: number; s: number; delay: number };
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'];
}): ReactNode {
  const year = new Date().getFullYear();
  const idx = floatingSquares.indexOf(sq);
  const parallax = useTransform(scrollYProgress, [0, 1], [0, -(80 + (idx === -1 ? 0 : idx) * 30)]);
  const smoothY = useSpring(parallax, { stiffness: 40, damping: 20 });
  return (
    <div
      className="absolute"
      style={{
        left: `${sq.x}%`,
        top: `${sq.y}%`,
        animation: `bob ${3 + (idx === -1 ? 0 : idx) * 0.4}s ease-in-out infinite`,
        animationDelay: `${sq.delay}s`,
      }}
    >
      <motion.div className="bg-black" style={{ width: sq.s, height: sq.s, y: smoothY }} />
    </div>
  );
}

function CaseStudyCard({ study, index }: { study: (typeof caseStudies)[0]; index: number }): ReactNode {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardInView = useInView(cardRef, { once: true, margin: '-60px' });
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={cardInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1, ease: easing }}
      className="group relative aspect-[4/3] overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); mouseX.set(0.5); mouseY.set(0.5); }}
      onMouseMove={(e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
      }}
    >
      <img src={study.image} alt={study.title} className="absolute inset-0 h-full w-full object-cover" />
      <PixelGrid isHovered={isHovered} />
      {study.squares.map((sq, i) => (
        <MagneticSquare key={i} sq={sq} mouseX={mouseX} mouseY={mouseY} />
      ))}
      <div className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center border border-white/30 text-xs text-white">+</div>
      <div className="absolute bottom-0 left-0 z-20 bg-white px-4 pb-3 pt-2.5" style={{ maxWidth: '70%' }}>
        <p className="text-[clamp(1.4rem,2.2vw,2rem)] font-normal leading-tight text-black">{study.title}</p>
        <div className="mt-1.5 flex flex-row gap-4">
          <span className="text-[12px] text-black/60">{study.category}</span>
          <span className="text-[12px] font-medium text-black">{study.year}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PixelGrid({ isHovered }: { isHovered: boolean }): ReactNode {
  const rows = 8;
  const cols = 12;
  return (
    <div className="absolute inset-0 z-10 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        return (
          <motion.div
            key={i}
            className="bg-black/80"
            initial={{ scale: 0, opacity: 0 }}
            animate={isHovered ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{
              duration: 0.25,
              delay: isHovered ? (r + c) * 0.018 : ((rows - r) + (cols - c)) * 0.012,
              ease: easing,
            }}
          />
        );
      })}
    </div>
  );
}

function MagneticSquare({ sq, mouseX, mouseY }: {
  sq: { x: number; y: number; s: number };
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
}): ReactNode {
  const distX = useTransform(mouseX, [0, 1], [-(sq.x / 100) * 40, (1 - sq.x / 100) * 40]);
  const distY = useTransform(mouseY, [0, 1], [-(sq.y / 100) * 40, (1 - sq.y / 100) * 40]);
  const springX = useSpring(distX, { stiffness: 80, damping: 18, mass: 0.6 });
  const springY = useSpring(distY, { stiffness: 80, damping: 18, mass: 0.6 });
  return (
    <motion.div
      className="absolute bg-black z-20"
      style={{ width: sq.s, height: sq.s, left: `${sq.x}%`, top: `${sq.y}%`, x: springX, y: springY }}
    />
  );
}
