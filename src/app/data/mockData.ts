export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductDocument {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  family: "ZenithBook Light" | "ZenithBook Pro";
  image: string;
  gallery: string[];
  price: number;
  emiFrom: string;
  chip: string;
  memory: string;
  storage: string;
  display: string;
  screenSize: string;
  batteryLife: string;
  batteryHours: string;
  weight: string;
  ports: string;
  finish: string;
  performanceTier: string;
  noiseLevel: string;
  bestFor: string;
  fitSummary: string;
  whyRecommended: string;
  matchScore: number;
  keyHighlights: string[];
  matchedBenefits: string[];
  tradeOffs: string[];
  pros: string[];
  cons: string[];
  implications: string[];
  accessories: string[];
  finance: string[];
  documents: ProductDocument[];
  salespersonTips: string[];
  specs: ProductSpec[];
}

export interface QuestionOption {
  label: string;
  description: string;
  icon: string;
}

export interface Question {
  id: string;
  type: "single-choice" | "multi-choice";
  question: string;
  options: QuestionOption[];
  prefillFromTags?: string[];
  autoAdvance?: boolean;
}

const createLaptopIllustration = ({
  label,
  start,
  end,
  accent,
}: {
  label: string;
  start: string;
  end: string;
  accent: string;
}) => {
  const svg = `
    <svg width="1600" height="1100" viewBox="0 0 1600 1100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1600" height="1100" rx="56" fill="#F5F8FD"/>
      <ellipse cx="1270" cy="190" rx="240" ry="240" fill="${accent}" fill-opacity="0.12"/>
      <ellipse cx="260" cy="920" rx="320" ry="220" fill="#B9D6F8" fill-opacity="0.28"/>
      <rect x="310" y="184" width="980" height="608" rx="40" fill="#19212B"/>
      <rect x="344" y="218" width="912" height="538" rx="24" fill="url(#screenGradient)"/>
      <rect x="785" y="186" width="30" height="9" rx="4.5" fill="#3A4653"/>
      <rect x="226" y="792" width="1148" height="98" rx="49" fill="#C6CED8"/>
      <rect x="520" y="818" width="560" height="38" rx="19" fill="#AEB8C5"/>
      <path d="M200 812C200 790.909 217.091 773.818 238.182 773.818H1361.82C1382.91 773.818 1400 790.909 1400 812V812C1400 835.428 1380.99 854.438 1357.56 854.438H242.438C219.01 854.438 200 835.428 200 812V812Z" fill="#D6DDE6"/>
      <rect x="430" y="284" width="740" height="286" rx="28" fill="rgba(255,255,255,0.12)"/>
      <path d="Core 950 590H1150" stroke="rgba(255,255,255,0.32)" stroke-width="2"/>
      <text x="450" y="648" fill="white" font-size="74" font-family="Inter, Arial, sans-serif" font-weight="700">${label}</text>
      <text x="452" y="708" fill="rgba(255,255,255,0.82)" font-size="28" font-family="Inter, Arial, sans-serif">Bsharp mock visual • premium PC lineup</text>
      <circle cx="1130" cy="360" r="96" fill="rgba(255,255,255,0.2)"/>
      <circle cx="1130" cy="360" r="72" fill="rgba(255,255,255,0.08)"/>
      <path d="M1112 360L1130 328L1148 360L1130 392L1112 360Z" fill="rgba(255,255,255,0.74)"/>
      <defs>
        <linearGradient id="screenGradient" x1="344" y1="218" x2="1256" y2="756" gradientUnits="userSpaceOnUse">
          <stop stop-color="${start}"/>
          <stop offset="1" stop-color="${end}"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const air13Image = createLaptopIllustration({
  label: "ZenithBook Light 13",
  start: "#1C2C4D",
  end: "#7BA7DF",
  accent: "#A4C5F5",
});

const air15Image = createLaptopIllustration({
  label: "ZenithBook Light 15",
  start: "#2A365E",
  end: "#CBB9F8",
  accent: "#B5DDFD",
});

const pro14Image = createLaptopIllustration({
  label: "ZenithBook Pro 14",
  start: "#121B29",
  end: "#5784C1",
  accent: "#9DD0FF",
});

const pro14MaxImage = createLaptopIllustration({
  label: "ZenithBook Pro 14 Pro",
  start: "#101820",
  end: "#729EFF",
  accent: "#B6C7FF",
});

const pro16Image = createLaptopIllustration({
  label: "ZenithBook Pro 16",
  start: "#14171F",
  end: "#7A87A8",
  accent: "#9CAED6",
});

export const mockProducts: Product[] = [
  {
    id: "zbl-13-c7",
    brand: "Zenith",
    model: 'ZenithBook Light 13" Core 7',
    family: "ZenithBook Light",
    image: air13Image,
    gallery: [air13Image, air13Image, air13Image],
    price: 129900,
    emiFrom: "₹10,825/mo",
    chip: "Zenith Core 7",
    memory: "16GB unified memory",
    storage: "512GB SSD",
    display: '13.6" Liquid Retina',
    screenSize: '13.6"',
    batteryLife: "Up to 18 hours of battery life",
    batteryHours: "18 hrs",
    weight: "1.24 kg",
    ports: "MagSafe, 2x Thunderbolt, 3.5 mm",
    finish: "Midnight",
    performanceTier: "Fanless everyday performance",
    noiseLevel: "Silent",
    bestFor: "Best for all-day portability",
    fitSummary: "A lightweight PC that covers study, browsing, documentation, and light creative work without feeling underpowered.",
    whyRecommended:
      "This is the cleanest match if you want a premium PC that is easy to carry, boots instantly, stays silent, and still feels fast for daily work.",
    matchScore: 96,
    keyHighlights: ["18-hr battery", "1.24 kg", "Silent design"],
    matchedBenefits: [
      "Easy to carry between meetings, classes, and client visits",
      "Long battery life reduces charger anxiety",
      "Excellent everyday speed with a quiet fanless design",
    ],
    tradeOffs: [
      "Less thermal headroom than Pro models for sustained heavy exports",
      "Only two Thunderbolt ports on the laptop body",
    ],
    pros: [
      "Lowest carry weight in the lineup",
      "Very strong battery life for a thin machine",
      "Premium build with no fan noise",
    ],
    cons: [
      "Not ideal for long 4K render sessions",
      "Port selection is more limited than ZenithBook Pro",
    ],
    implications: [
      "Choose this when portability and battery matter more than raw pro-app throughput.",
      "Great if your work lives in docs, browsers, Figma, presentations, and occasional coding.",
    ],
    accessories: ["35W Dual USB-C Adapter", "USB-C to HDMI Adapter", "Magic Mouse"],
    finance: ["No-cost EMI up to 9 months", "Exchange bonus available in-store"],
    documents: [
      { label: "Product brochure", value: "Digital brochure available" },
      { label: "Warranty", value: "1-year limited warranty + ZenithCare+ option" },
    ],
    salespersonTips: [
      "Apps launch extremely fast and demonstrate snappy performance for daily work.",
      "The lightweight design makes it incredibly easy to carry between classes or coffee shops.",
    ],
    specs: [
      { label: "Chip", value: "Zenith Core 7" },
      { label: "Memory", value: "16GB unified memory" },
      { label: "Storage", value: "512GB SSD" },
      { label: "Display", value: '13.6" Liquid Retina' },
      { label: "Battery", value: "Up to 18 hours" },
      { label: "Weight", value: "1.24 kg" },
      { label: "Ports", value: "MagSafe, 2x Thunderbolt, 3.5 mm" },
      { label: "Finish", value: "Midnight" },
    ],
  },
  {
    id: "zbl-15-c7",
    brand: "Zenith",
    model: 'ZenithBook Light 15" Core 7',
    family: "ZenithBook Light",
    image: air15Image,
    gallery: [air15Image, air15Image, air15Image],
    price: 149900,
    emiFrom: "₹12,492/mo",
    chip: "Zenith Core 7",
    memory: "16GB unified memory",
    storage: "512GB SSD",
    display: '15.3" Liquid Retina',
    screenSize: '15.3"',
    batteryLife: "Up to 18 hours of battery life",
    batteryHours: "18 hrs",
    weight: "1.51 kg",
    ports: "MagSafe, 2x Thunderbolt, 3.5 mm",
    finish: "Starlight",
    performanceTier: "Large-screen fanless performance",
    noiseLevel: "Silent",
    bestFor: "Best for a bigger screen without going Pro",
    fitSummary: "A roomy display, thin build, and fanless quietness make this ideal if you multitask a lot but still want an easy daily carry.",
    whyRecommended:
      "This is the sweet spot when you want more screen real estate for spreadsheets, side-by-side work, and light editing without stepping into the heavier Pro machines.",
    matchScore: 93,
    keyHighlights: ['15.3" display', "Thin and light", "Great for multitasking"],
    matchedBenefits: [
      "More comfortable split-screen work than the 13-inch Air",
      "Still lightweight enough for commuting",
      "Silent design keeps the premium experience intact",
    ],
    tradeOffs: [
      "Costs more than the 13-inch Air for the extra display space",
      "Still lacks the extra ports and sustained cooling of the Pro range",
    ],
    pros: [
      "Large display without a major weight penalty",
      "Excellent keyboard and battery life",
      "Looks premium on a retail counter",
    ],
    cons: [
      "Fewer ports than ZenithBook Pro",
      "Not the best fit for intense long-duration rendering",
    ],
    implications: [
      "Choose this if a bigger screen improves comfort more than added Pro power would.",
      "Strong option for business users, analysts, and students who live in multiple windows.",
    ],
    accessories: ["USB-C Digital AV Adapter", "Magic Keyboard", "AirPods Pro"],
    finance: ["No-cost EMI up to 12 months", "Upgrade plan eligibility available"],
    documents: [
      { label: "Display guide", value: "Retail display and panel overview" },
      { label: "Warranty", value: "1-year limited warranty + ZenithCare+ option" },
    ],
    salespersonTips: [
      "The large 15.3-inch screen gives you plenty of room to arrange multiple apps side by side.",
      "At just 1.51 kg, it is much easier to carry around compared to traditional 15-inch laptops.",
    ],
    specs: [
      { label: "Chip", value: "Zenith Core 7" },
      { label: "Memory", value: "16GB unified memory" },
      { label: "Storage", value: "512GB SSD" },
      { label: "Display", value: '15.3" Liquid Retina' },
      { label: "Battery", value: "Up to 18 hours" },
      { label: "Weight", value: "1.51 kg" },
      { label: "Ports", value: "MagSafe, 2x Thunderbolt, 3.5 mm" },
      { label: "Finish", value: "Starlight" },
    ],
  },
  {
    id: "zbp-14-c9",
    brand: "Zenith",
    model: 'ZenithBook Pro 14" Core 9',
    family: "ZenithBook Pro",
    image: pro14Image,
    gallery: [pro14Image, pro14Image, pro14Image],
    price: 169900,
    emiFrom: "₹14,158/mo",
    chip: "Zenith Core 9",
    memory: "16GB unified memory",
    storage: "512GB SSD",
    display: '14.2" Liquid Retina XDR',
    screenSize: '14.2"',
    batteryLife: "Up to 22 hours of battery life",
    batteryHours: "22 hrs",
    weight: "1.55 kg",
    ports: "MagSafe, 3x Thunderbolt, HDMI, SDXC, 3.5 mm",
    finish: "Space Black",
    performanceTier: "Balanced pro performance",
    noiseLevel: "Quiet under normal loads",
    bestFor: "Best all-rounder for serious work",
    fitSummary: "This is the most balanced PC if you want extra ports, better thermals, and a much richer display without jumping straight to an expensive maxed-out Pro.",
    whyRecommended:
      "It gives you the safest long-term headroom for coding, design, multi-monitor work, and demanding multitasking while still staying compact enough to carry daily.",
    matchScore: 90,
    keyHighlights: ["XDR display", "More ports", "22-hr battery"],
    matchedBenefits: [
      "Better external display and accessories support",
      "Stronger sustained performance than the Air range",
      "Excellent display for design, editing, and demos",
    ],
    tradeOffs: [
      "Heavier and pricier than the Air family",
      "Overkill if your work is mostly browser and documents",
    ],
    pros: [
      "Best balance of portability and pro capability",
      "Extra ports reduce dongle dependence",
      "Display quality feels premium instantly",
    ],
    cons: [
      "Noticeably more expensive than Air models",
      "Not the cheapest path into macOS",
    ],
    implications: [
      "Pick this when you need flexibility for creative tools, coding, or multiple displays.",
      "It is the safest recommendation when the user may grow into heavier workflows later.",
    ],
    accessories: ["USB-C to Ethernet Adapter", "Studio Display cable kit", "Magic Trackpad"],
    finance: ["Business financing available", "No-cost EMI up to 12 months"],
    documents: [
      { label: "Spec sheet", value: "Detailed spec sheet available" },
      { label: "Warranty", value: "1-year limited warranty + ZenithCare+ option" },
    ],
    salespersonTips: [
      "The XDR display makes photos, videos, and presentations look incredibly vivid and sharp.",
      "Built-in HDMI and SD card slots mean you don't need to carry extra dongles to connect devices.",
    ],
    specs: [
      { label: "Chip", value: "Zenith Core 9" },
      { label: "Memory", value: "16GB unified memory" },
      { label: "Storage", value: "512GB SSD" },
      { label: "Display", value: '14.2" Liquid Retina XDR' },
      { label: "Battery", value: "Up to 22 hours" },
      { label: "Weight", value: "1.55 kg" },
      { label: "Ports", value: "3x Thunderbolt, HDMI, SDXC, MagSafe" },
      { label: "Finish", value: "Space Black" },
    ],
  },
  {
    id: "zbp-14-c9pro",
    brand: "Zenith",
    model: 'ZenithBook Pro 14" Core 9 Pro',
    family: "ZenithBook Pro",
    image: pro14MaxImage,
    gallery: [pro14MaxImage, pro14MaxImage, pro14MaxImage],
    price: 219900,
    emiFrom: "₹18,325/mo",
    chip: "Zenith Core 9 Pro",
    memory: "24GB unified memory",
    storage: "1TB SSD",
    display: '14.2" Liquid Retina XDR',
    screenSize: '14.2"',
    batteryLife: "Up to 22 hours of battery life",
    batteryHours: "22 hrs",
    weight: "1.60 kg",
    ports: "MagSafe, 3x Thunderbolt, HDMI, SDXC, 3.5 mm",
    finish: "Space Black",
    performanceTier: "Pro workflows with stronger sustained headroom",
    noiseLevel: "Quiet unless pushed hard",
    bestFor: "Best for high-end pro workflows",
    fitSummary: "This is for customers who know they need stronger GPU/CPU headroom for editing, large codebases, music, or motion graphics work.",
    whyRecommended:
      "If you want this PC to stay comfortable with heavier creative workflows for years, the extra RAM and Pro-class headroom make a visible difference.",
    matchScore: 87,
    keyHighlights: ["24GB RAM", "1TB SSD", "Pro workflow headroom"],
    matchedBenefits: [
      "Handles larger pro-app sessions more comfortably",
      "More memory for future-proof multitasking",
      "Keeps the compact 14-inch footprint",
    ],
    tradeOffs: [
      "A big price jump over the standard 14-inch Pro",
      "May be excessive for everyday office work",
    ],
    pros: [
      "Meaningful upgrade for demanding creators and developers",
      "Excellent performance in a still-portable body",
      "Large internal storage out of the box",
    ],
    cons: [
      "Premium cost quickly becomes the deciding factor",
      "Returns less value if the user does not stress the machine",
    ],
    implications: [
      "Recommend this only if heavy workflows are a real part of the weekly routine.",
      "Best suited to customers who want to avoid performance compromises entirely.",
    ],
    accessories: ["Thunderbolt 4 dock", "Magic Mouse", "External SSD"],
    finance: ["Business financing available", "Exchange offer available"],
    documents: [
      { label: "Performance guide", value: "Pro workflow positioning guide" },
      { label: "Warranty", value: "1-year limited warranty + ZenithCare+ option" },
    ],
    salespersonTips: [
      "The extra 24GB of unified memory keeps heavy projects running smoothly without slowing down.",
      "A massive 1TB SSD means you can store huge files and apps directly on your PC without external drives.",
    ],
    specs: [
      { label: "Chip", value: "Zenith Core 9 Pro" },
      { label: "Memory", value: "24GB unified memory" },
      { label: "Storage", value: "1TB SSD" },
      { label: "Display", value: '14.2" Liquid Retina XDR' },
      { label: "Battery", value: "Up to 22 hours" },
      { label: "Weight", value: "1.60 kg" },
      { label: "Ports", value: "3x Thunderbolt, HDMI, SDXC, MagSafe" },
      { label: "Finish", value: "Space Black" },
    ],
  },
  {
    id: "zbp-16-c9pro",
    brand: "Zenith",
    model: 'ZenithBook Pro 16" Core 9 Pro',
    family: "ZenithBook Pro",
    image: pro16Image,
    gallery: [pro16Image, pro16Image, pro16Image],
    price: 279900,
    emiFrom: "₹23,325/mo",
    chip: "Zenith Core 9 Pro",
    memory: "24GB unified memory",
    storage: "1TB SSD",
    display: '16.2" Liquid Retina XDR',
    screenSize: '16.2"',
    batteryLife: "Up to 24 hours of battery life",
    batteryHours: "24 hrs",
    weight: "2.14 kg",
    ports: "MagSafe, 3x Thunderbolt, HDMI, SDXC, 3.5 mm",
    finish: "Silver",
    performanceTier: "Maximum screen space and sustained pro power",
    noiseLevel: "Quiet for its class",
    bestFor: "Best for desk-first pro users",
    fitSummary: "The 16-inch Pro is ideal if display space and sustained performance matter more than portability.",
    whyRecommended:
      "This is the powerhouse option for customers who spend most of the day in editing timelines, large spreadsheets, or multiple pro windows and do not want to plug into an external monitor all the time.",
    matchScore: 82,
    keyHighlights: ['16.2" XDR', "24-hr battery", "Pro-class thermal headroom"],
    matchedBenefits: [
      "Largest built-in display in the range",
      "Great for heavy desk-based multitasking",
      "Excellent battery even with pro hardware",
    ],
    tradeOffs: [
      "Heaviest option in the lineup",
      "Clearly aimed at customers comfortable with a higher budget",
    ],
    pros: [
      "Huge immersive screen",
      "Excellent sustained performance for pro work",
      "Very complete port selection",
    ],
    cons: [
      "Not the easiest PC to carry daily",
      "Best value only if the screen size is truly important",
    ],
    implications: [
      "Recommend this when the customer prioritizes workspace and performance over mobility.",
      "A strong in-store upsell if they already know they dislike compact laptops.",
    ],
    accessories: ["Thunderbolt dock", "Magic Keyboard with Touch ID", "External SSD"],
    finance: ["Business financing available", "Premium exchange offer available"],
    documents: [
      { label: "Display guide", value: "16-inch comparison sheet" },
      { label: "Warranty", value: "1-year limited warranty + ZenithCare+ option" },
    ],
    salespersonTips: [
      "The massive 16.2-inch XDR screen is perfect for arranging multiple windows and editing timelines side by side.",
      "The Pro-tier battery life lasts up to 24 hours, giving you the power of a desktop wherever you go.",
    ],
    specs: [
      { label: "Chip", value: "Zenith Core 9 Pro" },
      { label: "Memory", value: "24GB unified memory" },
      { label: "Storage", value: "1TB SSD" },
      { label: "Display", value: '16.2" Liquid Retina XDR' },
      { label: "Battery", value: "Up to 24 hours" },
      { label: "Weight", value: "2.14 kg" },
      { label: "Ports", value: "3x Thunderbolt, HDMI, SDXC, MagSafe" },
      { label: "Finish", value: "Silver" },
    ],
  },
];

export const mockQuestions: Question[] = [
  {
    id: "q1",
    type: "single-choice",
    question: "What will this PC mainly be used for?",
    autoAdvance: true,
    options: [
      {
        label: "Everyday browsing, docs, and study",
        description: "Light, fast, and dependable for daily use",
        icon: "BookOpen",
      },
      {
        label: "Work, meetings, and presentations",
        description: "A polished machine for professional routines",
        icon: "BriefcaseBusiness",
      },
      {
        label: "Coding and app development",
        description: "Terminals, simulators, and multitasking",
        icon: "Code2",
      },
      {
        label: "Photo or video editing",
        description: "Creative apps with a richer display",
        icon: "Clapperboard",
      },
      {
        label: "Heavy creative or technical workloads",
        description: "The strongest long-session performance",
        icon: "Sparkles",
      },
      {
        label: "Other",
        description: "Tell us your workflow in your own words",
        icon: "CircleHelp",
      },
    ],
    prefillFromTags: ["usage"],
  },
  {
    id: "q2",
    type: "single-choice",
    question: "How important is portability?",
    autoAdvance: true,
    options: [
      {
        label: "I carry it all day",
        description: "Weight and battery matter the most",
        icon: "Backpack",
      },
      {
        label: "It moves between rooms or meetings",
        description: "Balanced portability and screen comfort",
        icon: "MoveRight",
      },
      {
        label: "It mostly stays at a desk",
        description: "Performance and display can take priority",
        icon: "Monitor",
      },
      {
        label: "Other",
        description: "Add your own use pattern",
        icon: "CircleHelp",
      },
    ],
    prefillFromTags: ["portability"],
  },
  {
    id: "q3",
    type: "single-choice",
    question: "Which screen size feels right?",
    autoAdvance: true,
    options: [
      {
        label: "13-inch and compact",
        description: "The lightest, easiest daily carry",
        icon: "Laptop2",
      },
      {
        label: "15-inch with more space",
        description: "A larger Air without going Pro",
        icon: "PanelLeftOpen",
      },
      {
        label: "14-inch Pro balance",
        description: "Compact, but clearly more capable",
        icon: "Scaling",
      },
      {
        label: "16-inch maximum workspace",
        description: "Best if screen size matters most",
        icon: "MonitorUp",
      },
      {
        label: "Not sure yet",
        description: "Show me the best fit instead",
        icon: "CircleHelp",
      },
    ],
    prefillFromTags: ["screen-size"],
  },
  {
    id: "q4",
    type: "single-choice",
    question: "Which decision factor matters most right now?",
    autoAdvance: true,
    options: [
      {
        label: "Long battery life",
        description: "I want fewer charger moments",
        icon: "BatteryCharging",
      },
      {
        label: "Silent fanless feel",
        description: "Quiet meetings, classrooms, and travel",
        icon: "VolumeX",
      },
      {
        label: "More power for pro apps",
        description: "I want extra headroom for demanding work",
        icon: "Gauge",
      },
      {
        label: "More ports and flexibility",
        description: "I prefer fewer dongles and easier connectivity",
        icon: "Cable",
      },
      {
        label: "Best display quality",
        description: "I care about color, contrast, and visual comfort",
        icon: "ScreenShare",
      },
    ],
    prefillFromTags: ["priority"],
  },
  {
    id: "q5",
    type: "multi-choice",
    question: "What should we optimize for in the final recommendations?",
    options: [
      {
        label: "All-day battery",
        description: "Long unplugged usage matters",
        icon: "BatteryFull",
      },
      {
        label: "Lightweight carry",
        description: "I want the least travel strain",
        icon: "Feather",
      },
      {
        label: "External display support",
        description: "Desk setup compatibility matters",
        icon: "MonitorSpeaker",
      },
      {
        label: "Future-proof memory",
        description: "I want more RAM headroom",
        icon: "MemoryStick",
      },
      {
        label: "Better speakers and display",
        description: "Media, calls, and editing matter",
        icon: "Music4",
      },
      {
        label: "HDMI or SD card slot",
        description: "Built-in connectivity is important",
        icon: "PlugZap",
      },
      {
        label: "Other",
        description: "Add another priority",
        icon: "CircleHelp",
      },
    ],
    prefillFromTags: ["features"],
  },
];

export const mockVoiceTranscriptions = {
  hindi:
    "मुझे एक PCBook चाहिए जो रोज carry करने में हल्का हो। मैं coding भी करता हूँ और battery life strong चाहिए। 14 inch और 13 inch के बीच confused हूँ।",
  english:
    "I need a PCBook that is easy to carry every day. I do coding, a bit of design work, and I care a lot about battery life. I am deciding between a 13-inch and a 14-inch machine.",
  mixed:
    "Mujhe daily carry ke liye ek PCBook chahiye. Coding karta hoon, battery strong honi chahiye, and I think 14-inch Pro ya lightweight Air dono dekhna hai.",
};

export const mockExtractedTags = [
  { id: "tag-1", text: "Coding and development", category: "usage" },
  { id: "tag-2", text: "Carry it all day", category: "portability" },
  { id: "tag-3", text: "14-inch Pro balance", category: "screen-size" },
  { id: "tag-4", text: "Long battery life", category: "priority" },
  { id: "tag-5", text: "Future-proof memory", category: "features" },
];

export const mockCommentary = {
  login:
    "Launch a polished recommendation journey for in-store tablet use. No backend is needed here, so the experience stays fully demo-ready.",
  consent:
    "Collect just enough information to personalize the journey and support the in-store handoff later.",
  voiceIdle:
    "Customers can speak or type naturally. We extract the important buying signals and turn them into editable preference tags before any structured questions appear.",
  voiceRecording:
    "Listening for workflow, portability needs, screen preference, and buying signals such as battery, performance, or ports.",
  voiceProcessing:
    "Turning natural language into clean recommendation signals and preparing the structured follow-up questions.",
  voiceResults:
    "Great, we have a usable profile. Confirm or refine these tags before we narrow the catalog down further.",
  questions: {
    q1: "Usage tells us whether to lean toward the silent Air family or the more capable Pro range.",
    q2: "Portability quickly separates the best everyday carry options from the desk-first Pro choices.",
    q3: "Screen size often decides whether a customer prefers comfort, power, or travel-friendliness.",
    q4: "This helps us pick the right compromise between battery, power, ports, and display quality.",
    q5: "These final priorities shape the order of recommendations and the trade-offs we call out.",
  },
  processing:
    "We are combining your open-input signals with the structured answers to rank the strongest PC fits.",
  recommendations:
    "These PC recommendations balance portability, battery, screen size, and workflow fit. Use the commentary rail to understand why each option stood out.",
  comparison:
    "Comparing two PCs side by side makes the trade-offs concrete: carry weight versus screen size, silent design versus thermal headroom, and value versus future-proofing.",
  productDetail:
    "The full spec view, gallery, and fit summary are here to help the customer feel confident in their choice. Use the talking points below to frame the value clearly.",
  handoff:
    "The handoff stays lightweight: selected product, customer details, and the key requirements gathered in the journey.",
  share:
    "Share keeps the message simple and polished: what was recommended, why it fits, and how the customer can continue the conversation.",
};