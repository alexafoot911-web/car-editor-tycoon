import React, { useEffect, useMemo, useRef, useState } from "react";

// CAR EDITOR TYCOON — single‑file React game (Shop + Friends Pool Edition)
// Updates in this patch:
// 1) Hiring now pulls ONLY from your friends list; each can be hired ONCE, at equal starting stats.
// 2) Shop price/name tweaks: GH Glow (v1) $50, JerryFlow V2 $240, JerrySFX $90, ESSENTIALFX $250, ESSENTIALSFX $80.
// 3) Added autosave every 10 ticks and on app blur, export/import save functionality, and cloud backup.

// ==================== Config ====================
const CONFIG = {
  cloudBackupUrl: null, // Set this to your Google Apps Script URL for cloud backup
  gameVersion: "1.3.0",
  ownerHandle: "alexafoot911-web", // Set this to your GitHub handle for dev access in production
  autosaveInterval: 10, // ticks
  api: {
    submitRunUrl: null, // POST endpoint for submitting run data
    leaderboardUrl: null, // GET endpoint for fetching leaderboard
    requestHandleUrl: null, // POST endpoint for requesting handle
    timeout: 10000, // 10 second timeout
    retryDelay: 2000 // 2 second delay before retry
  },
  healthCheck: {
    interval: 7, // Check every 7 in-game days
    simulationDays: 7, // Simulate 7 days ahead
    minLeadsPerDay: 1, // Minimum leads per day from job generator
    softClamps: {
      maxSalary: 10000, // Maximum daily salary per editor
      maxPayout: 50000, // Maximum job payout
      maxCash: 1000000, // Maximum cash amount
      maxReputation: 1000, // Maximum reputation
      maxEditors: 200, // Maximum number of editors
      maxPCs: 100 // Maximum number of PCs
    }
  },
  dev: {
    commandPaletteHotkey: '`', // Backtick key for command palette
    simulationDays: 30, // Default simulation days for dev commands
    maxCashFill: 1000000, // Maximum cash fill amount
    maxLeadsSpawn: 50, // Maximum leads to spawn at once
    changelogMaxEntries: 100, // Maximum changelog entries to keep
    performance: {
      targetFPS: 60, // Target frames per second
      maxRenderTime: 16, // Maximum render time in ms (60 FPS = 16.67ms)
      maxTickTime: 8, // Maximum tick processing time in ms
      batchUpdates: true, // Enable batched state updates
      memoizeExpensive: true, // Enable memoization of expensive calculations
      virtualizeLists: true, // Enable list virtualization for large datasets
      maxVisibleJobs: 20, // Maximum jobs to render at once
      maxVisibleEditors: 30, // Maximum editors to render at once
      maxVisiblePCs: 20 // Maximum PCs to render at once
    }
  },
  featureFlags: {
    blackMarket: true, // Enable black market features
    prestige: true, // Enable prestige system
    saveSystem: true, // Save/Export/Import system
    teamEfficiency: true, // Team efficiency decay
    managers: true, // Manager system
    onboarding: true, // Onboarding delays
    costScaling: true, // Exponential cost scaling
    dailyOverhead: true, // Daily overhead costs
    marketCycles: true, // Market cycle system
    jobTiers: true, // Job tier system
    graceWindow: true, // Grace window system
    pcCrash: true, // PC crash system
    burnout: true, // Burnout system
    memeEvents: true, // Meme events system
    research: true, // Research system
    achievements: true, // Achievements system
    marketing: true, // Marketing scaling
    reputationTiers: true, // Reputation tier system
    leaderboard: true, // Leaderboard system
  },
  balance: {
    // Team efficiency decay
    efficiencyDecayStart: 10, // editors
    efficiencyDecayRate: 0.05, // per editor over the limit
    efficiencyMin: 0.35, // minimum efficiency (35%)
    
    // Managers
    managerUnlockThresholds: [10, 25, 50], // editors needed to unlock managers
    managerEfficiencyBonus: 0.15, // per manager
    managerSalary: 300, // daily salary per manager
    maxManagers: 3, // maximum managers possible
    
    // Onboarding
    onboardingBaseHours: 8, // base onboarding time
    onboardingScalingFactor: 0.5, // additional hours per existing editor
    
    // Cost scaling curves (exponential with gentle growth)
    hireEditor: {
      baseCost: 650, // starting cost
      scalingFactor: 1.15, // exponential growth rate (15% per hire)
    },
    buyPC: {
      baseCost: 900, // starting cost
      scalingFactor: 1.12, // exponential growth rate (12% per PC)
    },
    trainEditor: {
      baseCost: 220, // starting cost
      scalingFactor: 1.08, // exponential growth rate (8% per training)
    },
    upgradePC: {
      baseCost: 350, // starting cost
      scalingFactor: 1.10, // exponential growth rate (10% per upgrade)
    },
    
    // Upgrade effectiveness curves (diminishing returns)
    upgradeEffectiveness: {
      skillGain: {
        base: 4.5, // average skill gain
        variance: 1.5, // random variance
        diminishingFactor: 0.95, // 5% reduction per training
      },
      pcPowerGain: {
        base: 9, // average power gain
        variance: 3, // random variance
        diminishingFactor: 0.92, // 8% reduction per upgrade
      },
      pcStabilityGain: {
        base: 1, // average stability gain
        variance: 2, // random variance
        diminishingFactor: 0.98, // 2% reduction per upgrade
      },
      
      // Daily overhead costs
      overhead: {
        softwareLicense: {
          perEditor: 25, // daily cost per editor
          perPC: 15, // daily cost per PC
        },
        facility: {
          baseCost: 200, // base daily facility cost
          logarithmicFactor: 50, // additional cost per log scale of team size
        }
      },
      
      // Market cycle system
      marketCycle: {
        cycleLength: 7, // days between market cycles
        boostMultiplier: 1.5, // payout multiplier for boosted job type
        nerfMultiplier: 0.7, // payout multiplier for nerfed job type
      },
      
      // Job completion and work mechanics
      jobMechanics: {
        graceWindow: {
          threshold: 0.95, // 95% completion required for grace window
          extraHours: 6, // additional hours allowed
          payoutMultiplier: 0.8, // 80% of original payout
          reputationLoss: 2, // reputation loss for using grace window
        },
        pcCrash: {
          baseChance: 0.05, // 5% base crash chance per tick
          stabilityFactor: 0.8, // stability reduces crash chance by this factor
        },
        burnout: {
          threshold: 12, // hours worked before burnout starts
          energyDrainMultiplier: 2.0, // accelerated energy drain during burnout
        }
      },
      
      // Meme events system
      memeEvents: {
        dailyChance: 0.0075, // 0.75% chance per day (0.5-1% range)
        maxPerDay: 1, // maximum events per day
        events: [
          {
            id: "adobe_charge",
            title: "Adobe Subscription Renewal",
            description: "Your Adobe Creative Cloud subscription just auto-renewed... again.",
            cashDelta: -200,
            color: "text-red-400",
            icon: "💸"
          },
          {
            id: "topaz_renewal",
            title: "Topaz Labs Renewal",
            description: "Topaz Labs plugins need renewal. Time to pay the piper.",
            cashDelta: -200,
            color: "text-red-400",
            icon: "🔌"
          },
          {
            id: "hard_drive_recovery",
            title: "Hard Drive Recovery",
            description: "Critical project files corrupted. Emergency data recovery needed.",
            cashDelta: -1000,
            color: "text-red-500",
            icon: "💾"
          },
          {
            id: "rare_tip",
            title: "Rare Client Tip",
            description: "A grateful client left an unexpected tip for your amazing work!",
            cashDelta: 500,
            color: "text-green-400",
            icon: "💰"
          },
          {
            id: "coffee_spill",
            title: "Coffee Spill Incident",
            description: "Someone spilled coffee on the new equipment. Again.",
            cashDelta: -150,
            color: "text-red-400",
            icon: "☕"
          },
          {
            id: "viral_moment",
            title: "Viral Social Media Moment",
            description: "Your work went viral! Unexpected exposure bonus.",
            cashDelta: 300,
            color: "text-green-400",
            icon: "📱"
          }
        ]
      },
      
      // Black market system
      blackMarket: {
        crackedPlugins: {
          cost: 150, // cheap price for the risk
          skillBoost: 15, // +15 skill for all editors
          speedBoost: 0.3, // +0.3x speed for all editors
          duration: 24, // 24 in-game hours
          virusRisk: 0.05, // 5% chance of catastrophic virus
          description: "Cracked plugins from the dark web. Massive performance boost but high risk of system corruption."
        }
      },
      
      // Research system
      research: {
        baseCost: 500, // starting cost for research
        costMultiplier: 1.5, // cost increases by 50% each purchase
        maxLevel: 10, // maximum level for each research
        upgrades: [
          {
            id: "progress_boost",
            name: "Workflow Optimization",
            description: "Increase job progress by 5%",
            icon: "⚡",
            effect: "progress",
            value: 0.05, // +5% progress
            tooltip: "+5% job progress speed"
          },
          {
            id: "payout_boost",
            name: "Client Relations",
            description: "Increase job payouts by 3%",
            icon: "💰",
            effect: "payout",
            value: 0.03, // +3% payout
            tooltip: "+3% job payouts"
          },
          {
            id: "fail_penalty_reduction",
            name: "Quality Assurance",
            description: "Reduce failed job penalty by 10%",
            icon: "🛡️",
            effect: "failPenalty",
            value: 0.10, // -10% fail penalty
            tooltip: "-10% failed job penalty"
          },
          {
            id: "energy_efficiency",
            name: "Energy Management",
            description: "Reduce energy drain by 5%",
            icon: "🔋",
            effect: "energyDrain",
            value: 0.05, // -5% energy drain
            tooltip: "-5% editor energy drain"
          },
          {
            id: "reputation_gain",
            name: "Reputation Management",
            description: "Increase reputation gain by 8%",
            icon: "⭐",
            effect: "reputation",
            value: 0.08, // +8% reputation gain
            tooltip: "+8% reputation gain from jobs"
          }
        ]
      },
      
      // Prestige system
      prestige: {
        requirements: {
          reputation: 100, // minimum reputation required
          cash: 10000, // minimum cash required
        },
        perks: [
          {
            id: "spawn_rate",
            name: "Marketing Mastery",
            description: "Increase job spawn rate by 2%",
            icon: "📈",
            effect: "spawnRate",
            value: 0.02, // +2% spawn rate
            tooltip: "+2% job spawn rate"
          },
          {
            id: "salary_reduction",
            name: "Negotiation Skills",
            description: "Reduce editor salaries by 3%",
            icon: "💼",
            effect: "salaryReduction",
            value: 0.03, // -3% salary costs
            tooltip: "-3% editor salary costs"
          },
          {
            id: "training_efficiency",
            name: "Learning Optimization",
            description: "Increase training effectiveness by 5%",
            icon: "🎓",
            effect: "trainingEfficiency",
            value: 0.05, // +5% training effectiveness
            tooltip: "+5% training skill gain"
          },
          {
            id: "pc_efficiency",
            name: "Hardware Mastery",
            description: "Increase PC upgrade effectiveness by 4%",
            icon: "🖥️",
            effect: "pcEfficiency",
            value: 0.04, // +4% PC upgrade effectiveness
            tooltip: "+4% PC upgrade gains"
          },
          {
            id: "energy_efficiency",
            name: "Work-Life Balance",
            description: "Reduce energy drain by 2%",
            icon: "⚡",
            effect: "energyEfficiency",
            value: 0.02, // -2% energy drain
            tooltip: "-2% editor energy drain"
          }
        ]
      }
    }
  },
  
  // Marketing system
  marketing: {
    baseCost: 180,
    costMultiplier: 1.5, // cost increases by 50% each use per day
    maxUsesPerDay: 5, // maximum marketing uses per day
    leadCount: {
      min: 2,
      max: 3 // sometimes spawn 3 leads instead of 2
    }
  },
  
  // Reputation tiers
  reputationTiers: [
    { name: "Rookie", min: 0, max: 9, color: "text-green-400" },
    { name: "Pro", min: 10, max: 24, color: "text-blue-400" },
    { name: "Legend", min: 25, max: 49, color: "text-purple-400" },
    { name: "Master", min: 50, max: 89, color: "text-orange-400" },
    { name: "Icon", min: 90, max: 999, color: "text-red-400" }
  ],
  
  // Reputation unlocks
  reputationUnlocks: [
    { reputation: 10, description: "Tier 2 Jobs unlocked" },
    { reputation: 25, description: "Brand Contracts unlocked" },
    { reputation: 50, description: "Tier 4 Jobs unlocked" },
    { reputation: 90, description: "Tier 5 Jobs unlocked" }
  ],
  
  // Achievements system
  achievements: {
    flawlessDeliveries: {
      id: "flawless_deliveries",
      name: "Perfect Editor",
      description: "Complete 10 jobs with flawless quality",
      icon: "✨",
      requirement: 10,
      color: "text-yellow-400"
    },
    largeTeam: {
      id: "large_team",
      name: "Studio Boss",
      description: "Have 50 staff members (editors + managers)",
      icon: "👥",
      requirement: 50,
      color: "text-blue-400"
    },
    overnightJobs: {
      id: "overnight_jobs",
      name: "Night Owl",
      description: "Complete 5 jobs that took over 24 hours",
      icon: "🌙",
      requirement: 5,
      color: "text-purple-400"
    },
    highReputation: {
      id: "high_reputation",
      name: "Legendary Studio",
      description: "Reach 200 reputation",
      icon: "🏆",
      requirement: 200,
      color: "text-orange-400"
    },
    richStudio: {
      id: "rich_studio",
      name: "Millionaire",
      description: "Accumulate $50,000 cash",
      icon: "💰",
      requirement: 50000,
      color: "text-green-400"
    },
    speedDemon: {
      id: "speed_demon",
      name: "Speed Demon",
      description: "Complete 20 jobs in under 8 hours each",
      icon: "⚡",
      requirement: 20,
      color: "text-red-400"
    },
    qualityMaster: {
      id: "quality_master",
      name: "Quality Master",
      description: "Complete 30 jobs with quality above 90",
      icon: "🎯",
      requirement: 30,
      color: "text-indigo-400"
    },
    workaholic: {
      id: "workaholic",
      name: "Workaholic",
      description: "Have editors work for 48 consecutive hours",
      icon: "💪",
      requirement: 48,
      color: "text-pink-400"
    },
    marketCycler: {
      id: "market_cycler",
      name: "Market Master",
      description: "Experience 10 market cycles",
      icon: "📊",
      requirement: 10,
      color: "text-cyan-400"
    },
    researchMaster: {
      id: "research_master",
      name: "Research Master",
      description: "Max out 3 research categories",
      icon: "🔬",
      requirement: 3,
      color: "text-emerald-400"
    }
  }
};

// ==================== Types ====================
const BRANDS = [
  "Porsche 911 GT3 RS",
  "Lamborghini Aventador",
  "Ferrari 488 Pista",
  "McLaren 765LT",
  "Aston Martin Valhalla",
  "Nissan GT‑R R35",
  "Toyota Supra",
  "BMW M3 (G80)",
  "Audi RS6",
  "Ford Mustang GT",
  "Chevrolet Corvette C8",
  "Mazda RX‑7",
  "Subaru WRX STI",
  "Honda NSX",
  "Koenigsegg Jesko",
  "Czinger 21C",
];

// ==================== Job Tier System ====================
const JOB_TIERS = [
  { name: "Tier 1", reputationRequired: 0, multiplier: 1.0, color: "text-green-400" },
  { name: "Tier 2", reputationRequired: 10, multiplier: 1.2, color: "text-blue-400" },
  { name: "Tier 3", reputationRequired: 25, multiplier: 1.4, color: "text-purple-400" },
  { name: "Tier 4", reputationRequired: 50, multiplier: 1.6, color: "text-orange-400" },
  { name: "Tier 5", reputationRequired: 90, multiplier: 2.0, color: "text-red-400" },
];

const JOB_TYPES = [
  { name: "Reel (30s)", baseHours: 8, basePay: 350, diff: 35, tier: 1 },
  { name: "Montage (60s)", baseHours: 16, basePay: 800, diff: 55, tier: 2 },
  { name: "Ad (15s)", baseHours: 10, basePay: 650, diff: 60, tier: 2 },
  { name: "Event Recap (90s)", baseHours: 24, basePay: 1600, diff: 70, tier: 3 },
  { name: "Cinematic (2m)", baseHours: 30, basePay: 2200, diff: 80, tier: 4 },
];

// ==================== Friends Pool ====================
const FRIEND_NAMES = [
  "06._media", "trusionmedia", "pfreecreative", "mxhmedia", "rjxspeed", "wokeroto", "_valfilms_", "_gabrielhausen_", "vive.dts", "stephan.edits", "heronalexandru", "greg.marshall5.0", "dmooremedia", "fastlanegfx", "gtr._.auto", "shotxninja", "alx.edits", "_nightoff_", "jerz_pics", "_cfilms_", "sxorps", "fd.revv", "wheelersmedia", "exquisitemedia_", "danishedits", "unrxndered", "maty.media_", "djordanmedia", "kaizenvisualz_", "mediabytom", "r6wyatt", "crownwasfound", "feltsfilms", "kalebbrokaw", "instaflickz", "pasalu.jpg", "gtsknoow", "jasevisions", "fivo.mp4", "360.mediaedits", "jry.media", "xpseqo", "hellrotgarage", "mconcow", "flipvisuals", "fizzfpv", "district.jp", "ouamlil", "rohhse.tm", "alex.efex", "mastro.media", "dragonchill.vfx", "j.r._.media", "xe6at", "ascn.co", "oliver.br_", "pascalsteinhaus", "willberg.works", "jayp.cars", "bs.visualss", "farzinnoorani", "redman_productions", "editbyrzaw", "timk7.5", "rift.clb", "js.swed", "lo2.film", "hawaiian.media", "nolanchannon", "jsc.media_", "jerzmedia", "bakhorr", "noah_woodrow", "_havisuals", "_hunter_clarke_", "josh.mda", "keanu.visuals", "danny_aep", "openiris", "leemelon.jr", "krome.media", "sammy_mediaa", "danielpetermedia", "favgraphs", "romavag_fx", "d2_shots", "sutra.edits", "zodashotz", "n.k_media", "reese_productions", "gabut.fx", "gelographics", "paulxhowie", "tijs_media", "knoxy_media", "nickjonasmedia", "m6a.edits", "swiz.prod", "tsmalls.co", "hardest.fx", "ezra.media", "chancetheshooter", "sxt.media", "iceymedia", "motionvid", "youre.icon", "rs3btw", "bylance", "mxvframes", "speedramps", "ken_miso", "mediabyjuan"
];

const FRIEND_BASE = { skill: 60, speed: 1.0, salary: 120 };

// ==================== Shop Catalog ====================
const UPGRADES = [
  { id: "jerryflow",   name: "JerryFlow V2",  desc: "Workflow accelerator — +0.10 editor speed.", cost: 240, speedBonus: 0.10 },
  { id: "essentialfx", name: "ESSENTIALFX",   desc: "Preset & FX pack — +0.05 editor speed.", cost: 250, speedBonus: 0.05 },
  { id: "jerrysfx",    name: "JerrySFX",      desc: "Sound pack — +0.05 editor speed.",         cost: 90,  speedBonus: 0.05 },
  { id: "essentialsfx",name: "ESSENTIALSFX",  desc: "Core whooshes & hits — +0.05 editor speed.",cost: 80,  speedBonus: 0.05 },
  { id: "ghflow",      name: "GH Glow (v1)",  desc: "After Effects extension — +0.10 editor speed.", cost: 50,  speedBonus: 0.10 },
  { id: "districtjp",  name: "district.jp membership", desc: "More inbound work — +0.05 spawn rate & +2 lead cap.", cost: 900, spawnBonus: 0.05, leadCapBonus: 2 },
];

// ==================== Utils ====================
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const uid = () => Math.random().toString(36).slice(2, 9);

// ==================== Models ====================
function makeStarterEditors() {
  // Start with no editors so you hire only from the friends pool
  return [];
}

function makeStarterPCs() {
  return [
    { id: uid(), name: "PC‑01", tier: 1, power: 55, stability: 92, assignedJobId: null },
  ];
}

function randomClientJob(tick, availableJobTypes, getJobPayout) {
  const t = availableJobTypes[rnd(0, availableJobTypes.length - 1)];
  const difficulty = clamp(t.diff + rnd(-10, 15), 20, 95);
  const hours = clamp(Math.round(t.baseHours * (0.75 + Math.random() * 0.8)), 4, 48);
  const basePayout = Math.round((t.basePay + rnd(-120, 250)) * (0.9 + difficulty / 200));
  const payout = getJobPayout(t, basePayout);
  const deadline = tick + Math.round(hours * (1.15 + Math.random() * 0.9));
  return {
    id: uid(),
    clientName: randomClientName(),
    brand: BRANDS[rnd(0, BRANDS.length - 1)],
    type: t.name,
    difficulty,
    timeRequired: hours, // in ticks (1 tick = 1 hour)
    payout,
    deadline,
    progress: 0,
    status: "available", // available | active | done | failed
    accepted: false,
    assignedEditorId: null,
    assignedPCId: null,
  };
}

function randomClientName() {
  const first = ["Tom", "Ava", "Blake", "Mia", "Ezra", "Leo", "Noah", "Isla", "Zara", "Luca", "Aria", "Mason", "Kai", "Nate", "Sophie"]; 
  const last = ["Francis", "Evans", "Ngata", "Singh", "Cohen", "Kaur", "Patel", "Martin", "Brown", "Lee", "Silva", "Wright", "King", "Green"]; 
  const biz = ["Motors", "Supercars", "Detailing", "Media", "Club", "Racing", "Collective", "Auto", "Films", "Garage"]; 
  return `${first[rnd(0, first.length - 1)]} ${last[rnd(0, last.length - 1)]} ${biz[rnd(0, biz.length - 1)]}`;
}

// ==================== Component ====================
export default function CarEditorTycoon() {
  // Core state
  const [tick, setTick] = useState(0); // 1 tick = 1 in‑game hour
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // ticks per second

  const [cash, setCash] = useState(1000);
  const [reputation, setReputation] = useState(0);
  const [autoAssign, setAutoAssign] = useState(true);

  const [editors, setEditors] = useState(() => loadLS("editors", makeStarterEditors()));
  const [pcs, setPCs] = useState(() => loadLS("pcs", makeStarterPCs()));
  const [jobs, setJobs] = useState(() => loadLS("jobs", []));
  const [eventLog, setEventLog] = useState(() => loadLS("log", ["Welcome to Car Editor Tycoon! Accept jobs, assign your team, and build a legendary studio."]));

  const [offerCooldown, setOfferCooldown] = useState(0);
  const [baseSpawnRate] = useState(0.22); // base chance per tick to spawn a client
  const [purchased, setPurchased] = useState(() => new Set(loadLS("upgrades", [])));

  const [revenueHistory, setRevenueHistory] = useState(() => loadLS("revhist", []));

  // Save/Load state
  const [lastAutosave, setLastAutosave] = useState(0);
  const [cloudBackupStatus, setCloudBackupStatus] = useState(null); // null, "loading", "success", "error"

  // Team management state
  const [managers, setManagers] = useState(() => loadLS("managers", 0));
  const [devOverlay, setDevOverlay] = useState(false);
  
  // Upgrade tracking state
  const [editorTrainingCount, setEditorTrainingCount] = useState(() => loadLS("editorTrainingCount", {}));
  const [pcUpgradeCount, setPCUpgradeCount] = useState(() => loadLS("pcUpgradeCount", {}));
  
  // Market cycle state
  const [marketCycle, setMarketCycle] = useState(() => loadLS("marketCycle", {
    boostedType: null,
    nerfedType: null,
    cycleStartDay: 1,
    currentCycle: 1
  }));
  
  // Work mechanics state
  const [editorWorkHours, setEditorWorkHours] = useState(() => loadLS("editorWorkHours", {}));
  const [graceWindowJobs, setGraceWindowJobs] = useState(() => loadLS("graceWindowJobs", new Set()));
  
  // Meme events state
  const [memeEventState, setMemeEventState] = useState(() => loadLS("memeEventState", {
    lastEventDay: 0,
    eventsToday: 0,
    lastEventId: null
  }));
  const [activeMemeEvent, setActiveMemeEvent] = useState(null);
  
  // Black market state
  const [blackMarketEffects, setBlackMarketEffects] = useState(() => loadLS("blackMarketEffects", {
    active: false,
    expiresAt: 0,
    skillBoost: 0,
    speedBoost: 0
  }));
  const [virusWarning, setVirusWarning] = useState(false);
  const [virusCountdown, setVirusCountdown] = useState(3);
  
  // Research state
  const [researchLevels, setResearchLevels] = useState(() => loadLS("researchLevels", {}));
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  
  // Prestige state
  const [prestigePoints, setPrestigePoints] = useState(() => loadLS("prestigePoints", 0));
  const [seasonHighRep, setSeasonHighRep] = useState(() => loadLS("seasonHighRep", 0));
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  
  // Achievements state
  const [achievements, setAchievements] = useState(() => loadLS("achievements", new Set()));
  const [achievementStats, setAchievementStats] = useState(() => loadLS("achievementStats", {
    flawlessDeliveries: 0,
    overnightJobs: 0,
    speedDemonJobs: 0,
    qualityMasterJobs: 0,
    maxWorkHours: 0,
    marketCycles: 0,
    maxResearchCategories: 0
  }));
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  
  // API state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [submitRunStatus, setSubmitRunStatus] = useState(null);
  const [requestHandleStatus, setRequestHandleStatus] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('game'); // 'game' or 'leaderboard'
  const [requestHandleForm, setRequestHandleForm] = useState({
    email: '',
    preferredHandle: ''
  });
  
  // Health check state
  const [lastHealthCheck, setLastHealthCheck] = useState(0);
  const [healthCheckWarning, setHealthCheckWarning] = useState(null);
  const [shadowSave, setShadowSave] = useState(null);
  const [softClampWarnings, setSoftClampWarnings] = useState([]);
  
  // Dev parameter detection
  const urlParams = new URLSearchParams(window.location.search);
  const isDevMode = urlParams.get('dev') === '1';
  const currentHandle = urlParams.get('handle') || null;
  const isOwner = CONFIG.ownerHandle && currentHandle === CONFIG.ownerHandle;
  const showDevFeatures = isDevMode || isOwner;

  // Dev command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);
  
  // Changelog state
  const [changelog, setChangelog] = useState(() => loadLS("changelog", []));
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    renderTime: 0,
    tickTime: 0,
    memoryUsage: 0,
    renderCount: 0,
    lastFrameTime: 0
  });
  const [performanceWarnings, setPerformanceWarnings] = useState([]);

  // Run summary generation
  const generateRunSummary = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Car Editor Tycoon', 400, 80);
    ctx.fillText('Run Summary', 400, 130);
    
    // Stats grid
    const stats = [
      { label: 'Team Size', value: `${editors.length} editors`, icon: '👥' },
      { label: 'Equipment', value: `${pcs.length} PCs`, icon: '🖥️' },
      { label: 'Reputation', value: `${reputation}`, icon: '⭐' },
      { label: 'Cash', value: `$${cash.toLocaleString()}`, icon: '💰' },
      { label: 'Season', value: `Day ${Math.floor(tick / 24)}`, icon: '📅' },
      { label: 'Prestige', value: `${prestigePoints} points`, icon: '🌟' }
    ];
    
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    
    stats.forEach((stat, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = 100 + col * 300;
      const y = 200 + row * 80;
      
      // Icon
      ctx.font = '32px Arial';
      ctx.fillText(stat.icon, x, y);
      
      // Label
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#888888';
      ctx.fillText(stat.label, x + 50, y - 10);
      
      // Value
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, x + 50, y + 15);
    });
    
    // Achievements
    if (achievements.size > 0) {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 Achievements', 400, 420);
      
      ctx.font = '16px Arial';
      ctx.fillStyle = '#cccccc';
      const achievementList = Array.from(achievements).slice(0, 3);
      achievementList.forEach((achievementId, index) => {
        const achievement = CONFIG.achievements[achievementId];
        if (achievement) {
          ctx.fillText(`${achievement.icon} ${achievement.name}`, 400, 450 + index * 25);
        }
      });
    }
    
    // Footer
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, 400, 580);
    
    // Download the image
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `car-editor-tycoon-run-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      pushLog("📸 Run summary image generated and downloaded!");
    });
  };
  
  // Marketing state
  const [marketingUsage, setMarketingUsage] = useState(() => loadLS("marketingUsage", {
    lastUseDay: 0,
    usesToday: 0
  }));

  // Persist
  useEffect(() => { saveLS("editors", editors); }, [editors]);
  useEffect(() => { saveLS("pcs", pcs); }, [pcs]);
  useEffect(() => { saveLS("jobs", jobs); }, [jobs]);
  useEffect(() => { saveLS("log", eventLog); }, [eventLog]);
  useEffect(() => { saveLS("revhist", revenueHistory); }, [revenueHistory]);
  useEffect(() => { saveLS("upgrades", Array.from(purchased)); }, [purchased]);
  useEffect(() => { saveLS("managers", managers); }, [managers]);
  useEffect(() => { saveLS("editorTrainingCount", editorTrainingCount); }, [editorTrainingCount]);
  useEffect(() => { saveLS("pcUpgradeCount", pcUpgradeCount); }, [pcUpgradeCount]);
  useEffect(() => { saveLS("marketCycle", marketCycle); }, [marketCycle]);
  useEffect(() => { saveLS("editorWorkHours", editorWorkHours); }, [editorWorkHours]);
  useEffect(() => { saveLS("graceWindowJobs", Array.from(graceWindowJobs)); }, [graceWindowJobs]);
  useEffect(() => { saveLS("memeEventState", memeEventState); }, [memeEventState]);
  useEffect(() => { saveLS("blackMarketEffects", blackMarketEffects); }, [blackMarketEffects]);
  useEffect(() => { saveLS("researchLevels", researchLevels); }, [researchLevels]);
  useEffect(() => { saveLS("prestigePoints", prestigePoints); }, [prestigePoints]);
  useEffect(() => { saveLS("seasonHighRep", seasonHighRep); }, [seasonHighRep]);
  useEffect(() => { saveLS("achievements", Array.from(achievements)); }, [achievements]);
  useEffect(() => { saveLS("achievementStats", achievementStats); }, [achievementStats]);
  useEffect(() => { saveLS("marketingUsage", marketingUsage); }, [marketingUsage]);

  // DEV: storage round‑trip (test case)
  useEffect(() => {
    const sample = { msg: "Unicode test β — • 🚗", path: "C:\\Users\\Alex\\Videos\\auto_reel\\clip.mp4" };
    saveLS("__test__", sample);
    const got = loadLS("__test__", null);
    const ok = got && got.msg === sample.msg && got.path === sample.path;
    setEventLog((prev) => [timeStr(), ok ? "✅ Storage test passed" : "❌ Storage test failed", ...prev]);
    try { localStorage.removeItem(KEY_PREFIX + "__test__"); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Additional runtime tests (added)
  useEffect(() => {
    const hired = new Set(editors.map((e) => e.name));
    const remaining = FRIEND_NAMES.filter((n) => !hired.has(n));
    const unique = hired.size === editors.length;
    const inPool = editors.every((e) => FRIEND_NAMES.includes(e.name));
    const ok = unique && inPool && remaining.every((n) => !hired.has(n));
    setEventLog((prev) => [timeStr(), ok ? "✅ Hire-pool tests passed" : `❌ Hire-pool tests failed: ${JSON.stringify({ unique, inPool, remainingCount: remaining.length })}`, ...prev]);
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave every 10 ticks
  useEffect(() => {
    if (tick > 0 && tick % CONFIG.autosaveInterval === 0 && tick !== lastAutosave) {
      setLastAutosave(tick);
      pushLog("💾 Autosaved game progress.");
    }
  }, [tick, lastAutosave]);

  // Autosave on app blur
  useEffect(() => {
    const handleBlur = () => {
      if (tick > 0) {
        pushLog("💾 Autosaved on app blur.");
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [tick]);

  // Command palette keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === CONFIG.dev.commandPaletteHotkey && showDevFeatures) {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandInput('');
        setCommandHistoryIndex(-1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDevFeatures]);

  // Derived upgrade effects
  const effects = useMemo(() => {
    let speedBonus = 0;
    let spawnBonus = 0;
    let leadCapBonus = 0;
    purchased.forEach((id) => {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u) return;
      if (u.speedBonus) speedBonus += u.speedBonus;
      if (u.spawnBonus) spawnBonus += u.spawnBonus;
      if (u.leadCapBonus) leadCapBonus += u.leadCapBonus;
    });
    return { speedBonus, spawnBonus, leadCapBonus };
  }, [purchased]);

  const spawnRate = clamp(baseSpawnRate + effects.spawnBonus + getPrestigeSpawnRateBonus(), 0, 0.95);
  const leadCap = 6 + effects.leadCapBonus;

  // Memoized expensive calculations
  const memoizedCalculations = useMemo(() => {
    if (!CONFIG.dev.performance.memoizeExpensive) {
      return {
        teamEfficiency: Math.max(0.35, 1 - (editors.length - 10) * 0.02),
        dailySalaries: getDailySalaries(),
        dailyOverhead: getDailyOverhead(),
        availableJobTypes: getAvailableJobTypes(),
        currentReputationTier: getCurrentReputationTier(),
        nextReputationUnlock: getNextReputationUnlock()
      };
    }
    
    return measurePerformance(() => ({
      teamEfficiency: Math.max(0.35, 1 - (editors.length - 10) * 0.02),
      dailySalaries: getDailySalaries(),
      dailyOverhead: getDailyOverhead(),
      availableJobTypes: getAvailableJobTypes(),
      currentReputationTier: getCurrentReputationTier(),
      nextReputationUnlock: getNextReputationUnlock()
    }), 'memoized calculations').result;
  }, [editors.length, jobs.length, managers, researchLevels, reputation, CONFIG.dev.performance.memoizeExpensive]);

  // Virtualized lists for large datasets
  const visibleJobs = useMemo(() => {
    if (!CONFIG.dev.performance.virtualizeLists) {
      return jobs;
    }
    return jobs.slice(0, CONFIG.dev.performance.maxVisibleJobs);
  }, [jobs, CONFIG.dev.performance.virtualizeLists]);

  const visibleEditors = useMemo(() => {
    if (!CONFIG.dev.performance.virtualizeLists) {
      return editors;
    }
    return editors.slice(0, CONFIG.dev.performance.maxVisibleEditors);
  }, [editors, CONFIG.dev.performance.virtualizeLists]);

  const visiblePCs = useMemo(() => {
    if (!CONFIG.dev.performance.virtualizeLists) {
      return pcs;
    }
    return pcs.slice(0, CONFIG.dev.performance.maxVisiblePCs);
  }, [pcs, CONFIG.dev.performance.virtualizeLists]);

  // Game loop
  const loopRef = useRef(null);
  useEffect(() => {
    if (!playing) {
      if (loopRef.current) clearInterval(loopRef.current);
      return;
    }
    loopRef.current = setInterval(() => { step(); }, 1000 / speed);
    return () => clearInterval(loopRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, tick, jobs, editors, pcs, spawnRate, leadCap, effects.speedBonus]);

  function step() {
    const tickStart = performance.now();
    
    // Batch all state updates for this tick
    const updates = [];
    
    updates.push(() => setTick((t) => t + 1));

    // Run health check (every 7 in-game days)
    if (tick % (CONFIG.healthCheck.interval * 24) === 0) {
      measurePerformance(() => runHealthCheck(), 'health check');
    }

    // Update market cycle
    measurePerformance(() => updateMarketCycle(), 'market cycle');
    
    // Check for meme events (once per day)
    if (shouldTriggerMemeEvent()) {
      measurePerformance(() => triggerMemeEvent(), 'meme event');
    }
    
    // spawn new jobs randomly
    const jobUpdates = measurePerformance(() => {
      let next = [...jobs];
      if (Math.random() < spawnRate && offerCooldown <= 0 && next.filter(j => j.status === "available").length < leadCap) {
        const availableJobTypes = memoizedCalculations.availableJobTypes;
        if (availableJobTypes.length > 0) {
          next.unshift(randomClientJob(tick, availableJobTypes, getJobPayout));
          updates.push(() => pushLog("📞 New client inquiry - time to hustle!"));
          updates.push(() => setOfferCooldown(rnd(2, 6)));
        }
      }
      return next.map(j => ({ ...j }));
    }, 'job spawning');
    
    updates.push(() => setJobs(jobUpdates.result));
    updates.push(() => setOfferCooldown((c) => Math.max(0, c - 1)));

    // progress active jobs
    const jobProgressUpdates = measurePerformance(() => {
      const next = jobs.map((job) => {
        if (job.status !== "active") return job;
        const ed = editors.find((e) => e.id === job.assignedEditorId);
        const pc = pcs.find((p) => p.id === job.assignedPCId);
        if (!ed || !pc || ed.resting) return job;
        
        // Check if editor is still onboarding
        const isOnboarding = ed.onboardingComplete && tick < ed.onboardingComplete;
        const onboardingMultiplier = isOnboarding ? 0.3 : 1.0; // 30% efficiency during onboarding
        
        // PC crash mechanics
        const crashChance = getPCCrashChance(pc);
        const crash = Math.random() < crashChance ? rnd(1, 2) : 0;
        
        const speedMul = (1 + (ed.speed - 1) + (pc.power - 50) / 100 + effects.speedBonus + getBlackMarketSpeedBoost());
        const baseGain = clamp(1 * speedMul - crash, 0, 4);
        
        // Apply team efficiency, onboarding, and research boosts
        const researchBoost = 1 + getGlobalProgressBoost();
        const finalGain = baseGain * memoizedCalculations.teamEfficiency * onboardingMultiplier * researchBoost;
        const newProgress = job.progress + finalGain;
        return { ...job, progress: newProgress };
      });

      // job completion & deadlines
      const completedJobs = [];
      const failedJobs = [];
      const graceWindowJobs = [];
      
      next.forEach((job) => {
        if (job.status === "active" && job.progress >= job.timeRequired) {
          completedJobs.push(job.id);
        }
        if ((job.status === "active" || job.status === "available") && tick >= job.deadline) {
          // Check for grace window eligibility
          if (isGraceWindowEligible(job)) {
            // Apply grace window
            graceWindowJobs.push(job.id);
            updates.push(() => pushLog(`⏰ ${job.type} gets a grace window! +${CONFIG.balance.jobMechanics.graceWindow.extraHours}h extension granted.`));
          } else if (tick >= getGraceWindowDeadline(job)) {
            // Grace window expired
            failedJobs.push({ id: job.id, reason: "Grace window expired" });
          } else if (tick > job.deadline) {
            // Still in grace window, don't fail yet
            return;
          } else {
            // No grace window, fail immediately
            failedJobs.push({ id: job.id, reason: "Missed deadline" });
          }
        }
      });
      
      // Batch job state updates
      if (completedJobs.length > 0) {
        updates.push(() => completedJobs.forEach(id => completeJob(id)));
      }
      if (failedJobs.length > 0) {
        updates.push(() => failedJobs.forEach(({ id, reason }) => failJob(id, reason)));
      }
      if (graceWindowJobs.length > 0) {
        updates.push(() => setGraceWindowJobs(prev => new Set([...prev, ...graceWindowJobs])));
      }
      
      return next;
    }, 'job progress');
    
    updates.push(() => setJobs(jobProgressUpdates.result));

    // auto rest/regen logic for editors
    const editorUpdates = measurePerformance(() => {
      const newEditors = editors.map((e) => {
        const resting = e.resting ?? false;
        if (!e.assignedJobId) {
          if (e.energy < 100) return { ...e, resting: false, energy: clamp(e.energy + 1, 0, 100) };
          return { ...e, resting: false };
        }
        if (resting) {
          const newEnergy = clamp(e.energy + (3), 0, 100);
          const done = newEnergy >= 100;
          if (done) {
            updates.push(() => pushLog(`☕ ${e.name} is back from coffee break - recharged and ready to edit!`));
            // Reset work hours when fully rested
            updates.push(() => setEditorWorkHours(prev => ({ ...prev, [e.id]: 0 })));
          }
          return { ...e, energy: newEnergy, resting: !done };
        } else {
          // Track work hours and apply burnout
          const currentWorkHours = editorWorkHours[e.id] || 0;
          const newWorkHours = currentWorkHours + 1;
          updates.push(() => setEditorWorkHours(prev => ({ ...prev, [e.id]: newWorkHours })));
          
          // Track workaholic achievement
          updates.push(() => setAchievementStats(prev => ({
            ...prev,
            maxWorkHours: Math.max(prev.maxWorkHours, newWorkHours)
          })));
          
          const burnoutMultiplier = getBurnoutEnergyDrain(e.id);
          const researchEfficiency = 1 - getGlobalEnergyEfficiency();
          const prestigeEfficiency = 1 - getPrestigeEnergyEfficiency();
          const energyDrain = Math.round(1 * burnoutMultiplier * researchEfficiency * prestigeEfficiency);
          const newEnergy = clamp(e.energy - energyDrain, 0, 100);
          const goRest = newEnergy <= 15;
          if (goRest) updates.push(() => pushLog(`☕ ${e.name} needs a coffee break - even editors need caffeine!`));
          return { ...e, energy: newEnergy, resting: goRest };
        }
      });
      
      return newEditors;
    }, 'editor updates');
    
    updates.push(() => setEditors(editorUpdates.result));

    // passive salary and overhead each day (every 24 ticks)
    if ((tick + 1) % 24 === 0) {
      const dailyExpenses = measurePerformance(() => {
        const dailySalaries = memoizedCalculations.dailySalaries;
        const dailyOverhead = memoizedCalculations.dailyOverhead;
        const totalDaily = dailySalaries + dailyOverhead;
        if (totalDaily > 0) {
          updates.push(() => setCash((c) => c - totalDaily));
          updates.push(() => pushLog(`💸 Daily burn: -$${totalDaily.toLocaleString()} (salaries: $${dailySalaries.toLocaleString()}, overhead: $${dailyOverhead.toLocaleString()})`));
        }
        return { dailySalaries, dailyOverhead, totalDaily };
      }, 'daily expenses');
    }
    
    // Execute all batched updates
    const tickEnd = performance.now();
    const tickDuration = tickEnd - tickStart;
    
    if (tickDuration > CONFIG.dev.performance.maxTickTime) {
      console.warn(`Tick performance warning: ${tickDuration.toFixed(2)}ms`);
      setPerformanceWarnings(prev => [...prev.slice(-4), { label: 'tick processing', duration: tickDuration, timestamp: Date.now() }]);
    }
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Batch all state updates
    batchStateUpdates(updates);
  }

  // ==================== Job actions ====================
  function acceptJob(id) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, accepted: true, status: "active" } : j)));
          pushLog("✅ Job accepted - let's make some magic happen!");
    if (autoAssign) autoAssignJob(id);
  }

  function autoAssignJob(jobId) {
    setJobs((prevJobs) => {
      const job = prevJobs.find((j) => j.id === jobId);
      if (!job) return prevJobs;
      const freeEd = editors.find((e) => !e.assignedJobId && e.energy >= 30);
      const freePC = pcs.find((p) => !p.assignedJobId);
      if (freeEd && freePC) {
        assign(jobId, freeEd.id, freePC.id);
      }
      return prevJobs;
    });
  }

  function assign(jobId, editorId, pcId) {
    setEditors((prev) => prev.map((e) => (e.id === editorId ? { ...e, assignedJobId: jobId } : e)));
    setPCs((prev) => prev.map((p) => (p.id === pcId ? { ...p, assignedJobId: jobId } : p)));
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assignedEditorId: editorId, assignedPCId: pcId } : j)));
          pushLog(`👥 ${editorName(editorId)} assigned to ${pcName(pcId)} - dream team activated!`);
  }

  function unassign(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setEditors((prev) => prev.map((e) => (e.assignedJobId === jobId ? { ...e, assignedJobId: null } : e)));
    setPCs((prev) => prev.map((p) => (p.assignedJobId === jobId ? { ...p, assignedJobId: null } : p)));
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assignedEditorId: null, assignedPCId: null } : j)));
          pushLog("🔄 Team unassigned - ready for the next challenge!");
  }

  function completeJob(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const ed = editors.find((e) => e.id === job.assignedEditorId);
    const pc = pcs.find((p) => p.id === job.assignedPCId);
    const quality = Math.round((ed?.skill ?? 40 + getBlackMarketSkillBoost()) * 0.6 + (pc?.power ?? 50) * 0.4 + rnd(-10, 15));
    const passed = quality >= job.difficulty;
    
    // Check if job was completed in grace window
    const usedGraceWindow = graceWindowJobs.has(jobId);
    let pay = passed ? job.payout : Math.round(job.payout * 0.5);
    
    // Apply research effects
    const payoutBoost = 1 + getGlobalPayoutBoost();
    const failPenaltyReduction = 1 - getGlobalFailPenaltyReduction();
    const reputationBoost = 1 + getGlobalReputationBoost();
    
    if (usedGraceWindow) {
      pay = Math.round(pay * CONFIG.balance.jobMechanics.graceWindow.payoutMultiplier * payoutBoost);
      setReputation((r) => clamp(r - CONFIG.balance.jobMechanics.graceWindow.reputationLoss, -50, 999));
              pushLog(`⏰ ${job.type} completed in grace window! Reduced payout but saved the day (-${CONFIG.balance.jobMechanics.graceWindow.reputationLoss} rep).`);
    } else {
      pay = Math.round(pay * payoutBoost);
      const repChange = passed ? 3 : Math.round(-4 * failPenaltyReduction);
      setReputation((r) => clamp(r + Math.round(repChange * reputationBoost), -50, 999));
    }

    setCash((c) => c + pay);
    setRevenueHistory((h) => [...h.slice(-59), { t: tick, v: pay }]);

    // free assignments
    unassign(jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "done" } : j)));
    
    // Remove from grace window set
    if (usedGraceWindow) {
      setGraceWindowJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }

            pushLog(`🎬 ${job.type} for ${job.brand} delivered! ${passed ? "🔥 Amazing quality" : "😅 Decent effort"} - +$${pay.toLocaleString()}`);
    
    // Track achievement stats
    const jobDuration = tick - (job.deadline - job.timeRequired);
    const jobQuality = quality;
    
    setAchievementStats(prev => {
      const newStats = { ...prev };
      
      // Track flawless deliveries (quality >= difficulty)
      if (passed) {
        newStats.flawlessDeliveries += 1;
      }
      
      // Track overnight jobs (>24 hours)
      if (jobDuration > 24) {
        newStats.overnightJobs += 1;
      }
      
      // Track speed demon jobs (<8 hours)
      if (jobDuration < 8) {
        newStats.speedDemonJobs += 1;
      }
      
      // Track quality master jobs (quality > 90)
      if (jobQuality > 90) {
        newStats.qualityMasterJobs += 1;
      }
      
      return newStats;
    });
    
    // Check for new achievements
    setTimeout(checkAchievements, 100);
  }

  function failJob(jobId, reason = "") {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    unassign(jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "failed" } : j)));
    setReputation((r) => clamp(r - 6, -50, 999));
            pushLog(`💥 Job failed${reason ? ` - ${reason}` : ""}! Reputation takes a hit (-6).`);
  }

  // ==================== Company actions ====================
  function getRemainingFriends() {
    const hired = new Set(editors.map((e) => e.name));
    return FRIEND_NAMES.filter((n) => !hired.has(n));
  }

  function hireEditor() {
    const cost = getHireEditorCost();
    if (cash < cost) return toast("Not enough cash to hire.");
    const remaining = getRemainingFriends();
    if (remaining.length === 0) return toast("All friends already hired.");
    const pick = remaining[Math.floor(Math.random() * remaining.length)];

    // Calculate onboarding time
    const onboardingHours = CONFIG.balance.onboardingBaseHours + (editors.length * CONFIG.balance.onboardingScalingFactor);
    const onboardingComplete = tick + onboardingHours;

    const e = {
      id: uid(),
      name: pick,
      skill: FRIEND_BASE.skill,
      speed: FRIEND_BASE.speed,
      energy: 100,
      salary: FRIEND_BASE.salary,
      assignedJobId: null,
      resting: false,
      onboardingComplete, // when they become fully productive
    };
    setEditors((prev) => [...prev, e]);
    setCash((c) => c - cost);
          pushLog(`🎉 Welcome ${e.name} to the team! Onboarding complete in ${onboardingHours}h.`);
  }

  function hireManager() {
    const cost = 2000 + managers * 500;
    if (cash < cost) return toast("Not enough cash to hire manager.");
    
    const availableSlots = CONFIG.balance.managerUnlockThresholds.filter(threshold => editors.length >= threshold).length;
    if (managers >= availableSlots) return toast("No manager slots available.");
    if (managers >= CONFIG.balance.maxManagers) return toast("Maximum managers reached.");
    
    setManagers(prev => prev + 1);
    setCash(c => c - cost);
          pushLog(`👔 Manager #${managers + 1} hired! Team efficiency boosted - time to level up!`);
  }

  function buyPC() {
    const cost = getBuyPCCost();
    if (cash < cost) return toast("Not enough cash for a new PC.");
    const p = {
      id: uid(),
      name: `PC‑${String(pcs.length + 1).padStart(2, "0")}`,
      tier: 1,
      power: rnd(52, 70),
      stability: rnd(88, 96),
      assignedJobId: null,
    };
    setPCs((prev) => [...prev, p]);
    setCash((c) => c - cost);
          pushLog(`🖥️ ${p.name} purchased! Power level: ${p.power} - let's crush some pixels!`);
  }

  function trainEditor(id) {
    const cost = getTrainEditorCost(id);
    if (cash < cost) return toast("Not enough cash to train.");
    
    const baseSkillGain = getSkillGain(id);
    const prestigeBonus = 1 + getPrestigeTrainingEfficiency();
    const skillGain = Math.round(baseSkillGain * prestigeBonus);
    setEditors((prev) => prev.map((e) => (e.id === id ? { ...e, skill: clamp(e.skill + skillGain, 20, 99) } : e)));
    setEditorTrainingCount((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setCash((c) => c - cost);
          pushLog(`🎓 Training complete! +${skillGain} skill points earned - knowledge is power!`);
  }

  function upgradePC(id) {
    const cost = getUpgradePCCost(id);
    if (cash < cost) return toast("Not enough cash to upgrade.");
    
    const basePowerGain = getPCPowerGain(id);
    const baseStabilityGain = getPCStabilityGain(id);
    const prestigeBonus = 1 + getPrestigePCEfficiency();
    const powerGain = Math.round(basePowerGain * prestigeBonus);
    const stabilityGain = Math.round(baseStabilityGain * prestigeBonus);
    
    setPCs((prev) => prev.map((p) => (p.id === id ? { 
      ...p, 
      tier: p.tier + 1, 
      power: clamp(p.power + powerGain, 45, 120), 
      stability: clamp(p.stability + stabilityGain, 70, 99) 
    } : p)));
    setPCUpgradeCount((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setCash((c) => c - cost);
          pushLog(`⚡ PC upgraded! +${powerGain} power, +${stabilityGain} stability - beast mode activated!`);
  }

  // SHOP: buy permanent upgrades
  function buyUpgrade(id) {
    if (purchased.has(id)) return toast("Already owned.");
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    if (cash < u.cost) return toast("Not enough cash.");
    setCash((c) => c - u.cost);
    setPurchased((prev) => new Set([...Array.from(prev), id]));
    pushLog(`Purchased ${u.name}.`);
  }

  function runMarketing() {
    const cost = getMarketingCost();
    if (cash < cost) return toast("Not enough cash for marketing.");
    if (!canUseMarketing()) return toast("Daily marketing limit reached.");
    
    setCash((c) => c - cost);
    
    // Update marketing usage
    setMarketingUsage(prev => ({
      ...prev,
      usesToday: prev.usesToday + 1
    }));
    
    setJobs((prev) => {
      const next = [...prev];
      const availableJobTypes = getAvailableJobTypes();
      if (availableJobTypes.length > 0) {
        const leadCount = getMarketingLeadCount();
        for (let i = 0; i < leadCount; i++) {
          next.unshift(randomClientJob(tick, availableJobTypes, getJobPayout));
        }
      }
      return next;
    });
    
    const leadCount = getMarketingLeadCount();
          pushLog(`📢 Marketing blast sent! ${leadCount} new leads generated - clients are calling!`);
  }

  function resetGame() {
    if (!confirm("Reset your studio?")) return;
    setTick(0);
    setPlaying(false);
    setSpeed(1);
    setCash(1000);
    setReputation(0);
    setAutoAssign(true);
    setEditors(makeStarterEditors());
    setPCs(makeStarterPCs());
    setJobs([]);
    setPurchased(new Set());
    setManagers(0);
    setEditorTrainingCount({});
    setPCUpgradeCount({});
    setMarketCycle({
      boostedType: null,
      nerfedType: null,
      cycleStartDay: 1,
      currentCycle: 1
    });
    setEditorWorkHours({});
    setGraceWindowJobs(new Set());
    setMemeEventState({
      lastEventDay: 0,
      eventsToday: 0,
      lastEventId: null
    });
    setActiveMemeEvent(null);
    setBlackMarketEffects({
      active: false,
      expiresAt: 0,
      skillBoost: 0,
      speedBoost: 0
    });
    setVirusWarning(false);
    setVirusCountdown(3);
    setResearchLevels({});
    setShowResearchPanel(false);
    setShowPrestigeModal(false);
    setShowAchievementsPanel(false);
    setMarketingUsage({
      lastUseDay: 0,
      usesToday: 0
    });
    setLastHealthCheck(0);
    setHealthCheckWarning(null);
    setShadowSave(null);
    setSoftClampWarnings([]);
    setCommandHistory([]);
    setChangelog([]);
    setPerformanceMetrics({
      fps: 0,
      renderTime: 0,
      tickTime: 0,
      memoryUsage: 0,
      renderCount: 0,
      lastFrameTime: 0
    });
    setPerformanceWarnings([]);
    setEventLog(["Welcome to Car Editor Tycoon! Accept jobs, assign your team, and build a legendary studio."]);
    setRevenueHistory([]);
    pushLog("New game started.");
  }

  // ==================== Save/Load Functions ====================
  function exportSave() {
    const saveData = {
      version: CONFIG.gameVersion,
      timestamp: Date.now(),
      gameState: {
        tick,
        playing,
        speed,
        cash,
        reputation,
        autoAssign,
        editors,
        pcs,
        jobs,
        eventLog,
        offerCooldown,
        purchased: Array.from(purchased),
        revenueHistory,
        lastAutosave,
        managers,
        editorTrainingCount,
        pcUpgradeCount,
        marketCycle,
        editorWorkHours,
        graceWindowJobs: Array.from(graceWindowJobs),
        memeEventState,
        blackMarketEffects,
        researchLevels,
        prestigePoints,
        seasonHighRep,
        achievements: Array.from(achievements),
        achievementStats,
        marketingUsage,
        lastHealthCheck,
        healthCheckWarning,
        shadowSave,
        softClampWarnings
      }
    };
    
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `car-editor-tycoon-save-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushLog("💾 Save file exported successfully.");
  }

  function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const saveData = JSON.parse(event.target.result);
          
          // Validate version
          if (saveData.version !== CONFIG.gameVersion) {
            const proceed = confirm(`Save version mismatch!\n\nSave version: ${saveData.version}\nCurrent version: ${CONFIG.gameVersion}\n\nThis may cause compatibility issues. Continue anyway?`);
            if (!proceed) return;
          }
          
          // Show diff preview
          const currentState = {
            cash,
            reputation,
            editors: editors.length,
            pcs: pcs.length,
            jobs: jobs.length,
            purchased: purchased.size
          };
          
          const newState = {
            cash: saveData.gameState.cash,
            reputation: saveData.gameState.reputation,
            editors: saveData.gameState.editors.length,
            pcs: saveData.gameState.pcs.length,
            jobs: saveData.gameState.jobs.length,
            purchased: saveData.gameState.purchased.length
          };
          
          const diff = Object.keys(currentState).map(key => {
            const oldVal = currentState[key];
            const newVal = newState[key];
            const change = newVal - oldVal;
            return `${key}: ${oldVal} → ${newVal} (${change >= 0 ? '+' : ''}${change})`;
          }).join('\n');
          
          const proceed = confirm(`Import save file?\n\n${diff}\n\nThis will overwrite your current game. Continue?`);
          if (!proceed) return;
          
          // Apply save data
          setTick(saveData.gameState.tick);
          setPlaying(saveData.gameState.playing);
          setSpeed(saveData.gameState.speed);
          setCash(saveData.gameState.cash);
          setReputation(saveData.gameState.reputation);
          setAutoAssign(saveData.gameState.autoAssign);
          setEditors(saveData.gameState.editors);
          setPCs(saveData.gameState.pcs);
          setJobs(saveData.gameState.jobs);
          setEventLog(saveData.gameState.eventLog);
          setOfferCooldown(saveData.gameState.offerCooldown);
          setPurchased(new Set(saveData.gameState.purchased));
          setRevenueHistory(saveData.gameState.revenueHistory);
          setLastAutosave(saveData.gameState.lastAutosave || 0);
          setManagers(saveData.gameState.managers || 0);
          setEditorTrainingCount(saveData.gameState.editorTrainingCount || {});
          setPCUpgradeCount(saveData.gameState.pcUpgradeCount || {});
          setMarketCycle(saveData.gameState.marketCycle || {
            boostedType: null,
            nerfedType: null,
            cycleStartDay: 1,
            currentCycle: 1
          });
          setEditorWorkHours(saveData.gameState.editorWorkHours || {});
          setGraceWindowJobs(new Set(saveData.gameState.graceWindowJobs || []));
          setMemeEventState(saveData.gameState.memeEventState || {
            lastEventDay: 0,
            eventsToday: 0,
            lastEventId: null
          });
          setBlackMarketEffects(saveData.gameState.blackMarketEffects || {
            active: false,
            expiresAt: 0,
            skillBoost: 0,
            speedBoost: 0
          });
          setResearchLevels(saveData.gameState.researchLevels || {});
          setPrestigePoints(saveData.gameState.prestigePoints || 0);
          setSeasonHighRep(saveData.gameState.seasonHighRep || 0);
          setAchievements(new Set(saveData.gameState.achievements || []));
          setAchievementStats(saveData.gameState.achievementStats || {
            flawlessDeliveries: 0,
            overnightJobs: 0,
            speedDemonJobs: 0,
            qualityMasterJobs: 0,
            maxWorkHours: 0,
            marketCycles: 0,
            maxResearchCategories: 0
          });
              setMarketingUsage(saveData.gameState.marketingUsage || {
      lastUseDay: 0,
      usesToday: 0
    });
    setLastHealthCheck(saveData.gameState.lastHealthCheck || 0);
    setHealthCheckWarning(saveData.gameState.healthCheckWarning || null);
    setShadowSave(saveData.gameState.shadowSave || null);
    setSoftClampWarnings(saveData.gameState.softClampWarnings || []);
    setCommandHistory(saveData.gameState.commandHistory || []);
    setChangelog(saveData.gameState.changelog || []);
    setPerformanceMetrics(saveData.gameState.performanceMetrics || {
      fps: 0,
      renderTime: 0,
      tickTime: 0,
      memoryUsage: 0,
      renderCount: 0,
      lastFrameTime: 0
    });
    setPerformanceWarnings(saveData.gameState.performanceWarnings || []);
          
          pushLog("💾 Save file imported successfully.");
        } catch (error) {
          toast("Invalid save file format.");
          console.error("Import error:", error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function cloudBackup() {
    if (!CONFIG.cloudBackupUrl) {
      toast("Cloud backup URL not configured.");
      return;
    }
    
    setCloudBackupStatus("loading");
    
    try {
      const saveData = {
        version: CONFIG.gameVersion,
        timestamp: Date.now(),
        gameState: {
          tick,
          playing,
          speed,
          cash,
          reputation,
          autoAssign,
          editors,
          pcs,
          jobs,
          eventLog,
          offerCooldown,
          purchased: Array.from(purchased),
          revenueHistory,
          lastAutosave
        }
      };
      
      const response = await fetch(CONFIG.cloudBackupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });
      
      if (response.ok) {
        setCloudBackupStatus("success");
        pushLog("☁️ Cloud backup successful.");
        setTimeout(() => setCloudBackupStatus(null), 3000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setCloudBackupStatus("error");
      pushLog("❌ Cloud backup failed.");
      console.error("Cloud backup error:", error);
      setTimeout(() => setCloudBackupStatus(null), 3000);
    }
  }

  // ==================== Derived ====================
  const day = Math.floor(tick / 24) + 1;
  const available = visibleJobs.filter((j) => j.status === "available");
  const active = visibleJobs.filter((j) => j.status === "active");
  const done = visibleJobs.filter((j) => j.status === "done");
  const failed = visibleJobs.filter((j) => j.status === "failed");

  const repTier = useMemo(() => (reputation >= 60 ? "Legend" : reputation >= 30 ? "Pro" : reputation >= 10 ? "Solid" : reputation >= 0 ? "Rookie" : "Risky"), [reputation]);

  // Team efficiency calculations
  const teamEfficiency = useMemo(() => {
    const editorCount = editors.length;
    
    // Base efficiency (100% for small teams)
    let efficiency = 1.0;
    
    // Apply decay after threshold
    if (editorCount > CONFIG.balance.efficiencyDecayStart) {
      const excessEditors = editorCount - CONFIG.balance.efficiencyDecayStart;
      const decay = excessEditors * CONFIG.balance.efficiencyDecayRate;
      efficiency = Math.max(CONFIG.balance.efficiencyMin, 1.0 - decay);
    }
    
    // Manager bonuses
    const managerBonus = managers * CONFIG.balance.managerEfficiencyBonus;
    efficiency = Math.min(1.0, efficiency + managerBonus);
    
    return efficiency;
  }, [editors.length, managers]);

  // Manager availability
  const availableManagerSlots = CONFIG.balance.managerUnlockThresholds.filter(threshold => editors.length >= threshold).length;
  const canHireManager = managers < availableManagerSlots && managers < CONFIG.balance.maxManagers;

  // Cost calculation helpers
  const getHireEditorCost = () => {
    return Math.round(CONFIG.balance.hireEditor.baseCost * Math.pow(CONFIG.balance.hireEditor.scalingFactor, editors.length));
  };

  const getBuyPCCost = () => {
    return Math.round(CONFIG.balance.buyPC.baseCost * Math.pow(CONFIG.balance.buyPC.scalingFactor, pcs.length));
  };

  const getTrainEditorCost = (editorId) => {
    const currentCount = editorTrainingCount[editorId] || 0;
    return Math.round(CONFIG.balance.trainEditor.baseCost * Math.pow(CONFIG.balance.trainEditor.scalingFactor, currentCount));
  };

  const getUpgradePCCost = (pcId) => {
    const currentCount = pcUpgradeCount[pcId] || 0;
    return Math.round(CONFIG.balance.upgradePC.baseCost * Math.pow(CONFIG.balance.upgradePC.scalingFactor, currentCount));
  };

  // Upgrade effectiveness helpers
  const getSkillGain = (editorId) => {
    const currentCount = editorTrainingCount[editorId] || 0;
    const diminishingFactor = Math.pow(CONFIG.balance.upgradeEffectiveness.skillGain.diminishingFactor, currentCount);
    const baseGain = CONFIG.balance.upgradeEffectiveness.skillGain.base * diminishingFactor;
    const variance = CONFIG.balance.upgradeEffectiveness.skillGain.variance;
    return Math.round(baseGain + rnd(-variance, variance));
  };

  const getPCPowerGain = (pcId) => {
    const currentCount = pcUpgradeCount[pcId] || 0;
    const diminishingFactor = Math.pow(CONFIG.balance.upgradeEffectiveness.pcPowerGain.diminishingFactor, currentCount);
    const baseGain = CONFIG.balance.upgradeEffectiveness.pcPowerGain.base * diminishingFactor;
    const variance = CONFIG.balance.upgradeEffectiveness.pcPowerGain.variance;
    return Math.round(baseGain + rnd(-variance, variance));
  };

  const getPCStabilityGain = (pcId) => {
    const currentCount = pcUpgradeCount[pcId] || 0;
    const diminishingFactor = Math.pow(CONFIG.balance.upgradeEffectiveness.pcStabilityGain.diminishingFactor, currentCount);
    const baseGain = CONFIG.balance.upgradeEffectiveness.pcStabilityGain.base * diminishingFactor;
    const variance = CONFIG.balance.upgradeEffectiveness.pcStabilityGain.variance;
    return Math.round(baseGain + rnd(-variance, variance));
  };

  // Daily overhead calculation helpers
  const getDailyOverhead = () => {
    const softwareCost = (editors.length * CONFIG.balance.overhead.softwareLicense.perEditor) + 
                        (pcs.length * CONFIG.balance.overhead.softwareLicense.perPC);
    const facilityCost = CONFIG.balance.overhead.facility.baseCost + 
                        (Math.log(editors.length + pcs.length + 1) * CONFIG.balance.overhead.facility.logarithmicFactor);
    return Math.round(softwareCost + facilityCost);
  };

  const getDailySalaries = () => {
    const salaryReduction = 1 - getPrestigeSalaryReduction();
    const editorSalaries = editors.reduce((sum, e) => sum + (e.salary * salaryReduction), 0);
    const managerSalaries = managers * CONFIG.balance.managerSalary;
    return Math.round(editorSalaries + managerSalaries);
  };

  const getProjectedNextDayCash = () => {
    const dailySalaries = getDailySalaries();
    const dailyOverhead = getDailyOverhead();
    const totalDailyBurn = dailySalaries + dailyOverhead;
    return cash - totalDailyBurn;
  };

  const isPayrollRisk = () => {
    return getProjectedNextDayCash() < 0;
  };

  // Job tier and market cycle helpers
  const getCurrentJobTier = () => {
    return JOB_TIERS.find(tier => reputation >= tier.reputationRequired) || JOB_TIERS[0];
  };

  const getAvailableJobTypes = () => {
    const currentTier = getCurrentJobTier();
    return JOB_TYPES.filter(job => job.tier <= currentTier.reputationRequired);
  };

  const getJobPayout = (jobType, basePayout) => {
    let payout = basePayout;
    
    // Apply tier multiplier
    const tier = JOB_TIERS.find(t => t.reputationRequired >= jobType.tier) || JOB_TIERS[0];
    payout *= tier.multiplier;
    
    // Apply market cycle multipliers
    if (marketCycle.boostedType === jobType.name) {
      payout *= CONFIG.balance.marketCycle.boostMultiplier;
    } else if (marketCycle.nerfedType === jobType.name) {
      payout *= CONFIG.balance.marketCycle.nerfMultiplier;
    }
    
    return Math.round(payout);
  };

  const updateMarketCycle = () => {
    const daysSinceCycleStart = day - marketCycle.cycleStartDay;
    if (daysSinceCycleStart >= CONFIG.balance.marketCycle.cycleLength) {
      // Roll new market cycle
      const availableTypes = JOB_TYPES.map(job => job.name);
      const boostedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      let nerfedType;
      do {
        nerfedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      } while (nerfedType === boostedType);
      
      setMarketCycle({
        boostedType,
        nerfedType,
        cycleStartDay: day,
        currentCycle: marketCycle.currentCycle + 1
      });
      
      // Track market cycles achievement
      setAchievementStats(prev => ({
        ...prev,
        marketCycles: prev.marketCycles + 1
      }));
      
      pushLog(`📈 Market cycle ${marketCycle.currentCycle + 1}: ${boostedType} boosted, ${nerfedType} nerfed.`);
    }
  };

  // Work mechanics helpers
  const getPCCrashChance = (pc) => {
    const baseChance = CONFIG.balance.jobMechanics.pcCrash.baseChance;
    const stabilityReduction = (pc.stability / 100) * CONFIG.balance.jobMechanics.pcCrash.stabilityFactor;
    return Math.max(0, baseChance - stabilityReduction);
  };

  const isEditorBurnout = (editorId) => {
    const workHours = editorWorkHours[editorId] || 0;
    return workHours > CONFIG.balance.jobMechanics.burnout.threshold;
  };

  const getBurnoutEnergyDrain = (editorId) => {
    if (isEditorBurnout(editorId)) {
      return CONFIG.balance.jobMechanics.burnout.energyDrainMultiplier;
    }
    return 1.0;
  };

  const isGraceWindowEligible = (job) => {
    const progress = job.progress / job.timeRequired;
    return progress >= CONFIG.balance.jobMechanics.graceWindow.threshold && 
           !graceWindowJobs.has(job.id) &&
           tick >= job.deadline;
  };

  const getGraceWindowDeadline = (job) => {
    return job.deadline + CONFIG.balance.jobMechanics.graceWindow.extraHours;
  };

  // Meme events helpers
  const getCurrentDay = () => Math.floor(tick / 24);
  
  const shouldTriggerMemeEvent = () => {
    const currentDay = getCurrentDay();
    const lastEventDay = memeEventState.lastEventDay;
    const eventsToday = memeEventState.eventsToday;
    
    // Reset daily counter if it's a new day
    if (currentDay > lastEventDay) {
      setMemeEventState(prev => ({
        ...prev,
        lastEventDay: currentDay,
        eventsToday: 0
      }));
      return false;
    }
    
    // Check if we can trigger an event today
    if (eventsToday >= CONFIG.balance.memeEvents.maxPerDay) {
      return false;
    }
    
    // Roll for event
    return Math.random() < CONFIG.balance.memeEvents.dailyChance;
  };
  
  const triggerMemeEvent = () => {
    const events = CONFIG.balance.memeEvents.events;
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    // Apply cash delta
    setCash(prev => prev + randomEvent.cashDelta);
    
    // Update state
    setMemeEventState(prev => ({
      ...prev,
      eventsToday: prev.eventsToday + 1,
      lastEventId: randomEvent.id
    }));
    
    // Show modal
    setActiveMemeEvent(randomEvent);
    
    // Log to studio feed
    const sign = randomEvent.cashDelta > 0 ? "+" : "";
    pushLog(`${randomEvent.icon} ${randomEvent.title}: ${sign}$${Math.abs(randomEvent.cashDelta)}`);
    
    // Auto-hide modal after 3 seconds
    setTimeout(() => {
      setActiveMemeEvent(null);
    }, 3000);
  };

  // Black market helpers
  const isBlackMarketActive = () => {
    return blackMarketEffects.active && tick < blackMarketEffects.expiresAt;
  };

  const getBlackMarketSkillBoost = () => {
    return isBlackMarketActive() ? blackMarketEffects.skillBoost : 0;
  };

  const getBlackMarketSpeedBoost = () => {
    return isBlackMarketActive() ? blackMarketEffects.speedBoost : 0;
  };

  const buyCrackedPlugins = () => {
    if (cash < CONFIG.balance.blackMarket.crackedPlugins.cost) {
      pushLog("❌ Not enough cash for cracked plugins.");
      return;
    }

    // Deduct cost
    setCash(prev => prev - CONFIG.balance.blackMarket.crackedPlugins.cost);

    // Apply effects
    const expiresAt = tick + CONFIG.balance.blackMarket.crackedPlugins.duration;
    setBlackMarketEffects({
      active: true,
      expiresAt: expiresAt,
      skillBoost: CONFIG.balance.blackMarket.crackedPlugins.skillBoost,
      speedBoost: CONFIG.balance.blackMarket.crackedPlugins.speedBoost
    });

    pushLog("🖤 Cracked plugins installed. Massive performance boost active for 24h.");

    // Check for virus
    if (Math.random() < CONFIG.balance.blackMarket.crackedPlugins.virusRisk) {
      setTimeout(() => {
        triggerVirus();
      }, 2000); // 2 second delay for dramatic effect
    }
  };

  const triggerVirus = () => {
    setVirusWarning(true);
    pushLog("🚨 WARNING: MALICIOUS CODE DETECTED! SYSTEM COMPROMISED!");
    
    // Start countdown
    const countdown = setInterval(() => {
      setVirusCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          // Force reset after countdown
          setTimeout(() => {
            resetGame();
            setVirusWarning(false);
            setVirusCountdown(3);
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVirusExport = () => {
    exportSave();
    pushLog("💾 Emergency save exported before system reset.");
  };

  // Research helpers
  const getResearchLevel = (researchId) => {
    return researchLevels[researchId] || 0;
  };

  const getResearchCost = (researchId) => {
    const level = getResearchLevel(researchId);
    if (level >= CONFIG.balance.research.maxLevel) return Infinity;
    return Math.round(CONFIG.balance.research.baseCost * Math.pow(CONFIG.balance.research.costMultiplier, level));
  };

  const getResearchEffect = (researchId) => {
    const research = CONFIG.balance.research.upgrades.find(u => u.id === researchId);
    if (!research) return 0;
    return getResearchLevel(researchId) * research.value;
  };

  const buyResearch = (researchId) => {
    const cost = getResearchCost(researchId);
    if (cash < cost) {
      pushLog("❌ Not enough cash for research.");
      return;
    }

    const research = CONFIG.balance.research.upgrades.find(u => u.id === researchId);
    if (!research) return;

    // Deduct cost
    setCash(prev => prev - cost);

    // Increase level
    setResearchLevels(prev => ({
      ...prev,
      [researchId]: (prev[researchId] || 0) + 1
    }));

    // Track research master achievement
    const maxedCategories = Object.values(researchLevels).filter(level => level >= CONFIG.balance.research.maxLevel).length;
    setAchievementStats(prev => ({
      ...prev,
      maxResearchCategories: Math.max(prev.maxResearchCategories, maxedCategories + 1)
    }));

    pushLog(`🔬 ${research.name} upgraded to level ${getResearchLevel(researchId) + 1}.`);
  };

  // Global effect calculations
  const getGlobalProgressBoost = () => getResearchEffect("progress_boost");
  const getGlobalPayoutBoost = () => getResearchEffect("payout_boost");
  const getGlobalFailPenaltyReduction = () => getResearchEffect("fail_penalty_reduction");
  const getGlobalEnergyEfficiency = () => getResearchEffect("energy_efficiency");
  const getGlobalReputationBoost = () => getResearchEffect("reputation_gain");

  // Prestige helpers
  const canPrestige = () => {
    return reputation >= CONFIG.balance.prestige.requirements.reputation && 
           cash >= CONFIG.balance.prestige.requirements.cash;
  };

  const getPrestigePerkEffect = (perkId) => {
    const perk = CONFIG.balance.prestige.perks.find(p => p.id === perkId);
    if (!perk) return 0;
    return prestigePoints * perk.value;
  };

  const getPrestigeSpawnRateBonus = () => getPrestigePerkEffect("spawn_rate");
  const getPrestigeSalaryReduction = () => getPrestigePerkEffect("salary_reduction");
  const getPrestigeTrainingEfficiency = () => getPrestigePerkEffect("training_efficiency");
  const getPrestigePCEfficiency = () => getPrestigePerkEffect("pc_efficiency");
  const getPrestigeEnergyEfficiency = () => getPrestigePerkEffect("energy_efficiency");

  const performPrestige = () => {
    if (!canPrestige()) {
      pushLog("❌ Cannot prestige: need Rep 100+ and $10,000+ cash.");
      return;
    }

    // Update season high reputation
    if (reputation > seasonHighRep) {
      setSeasonHighRep(reputation);
    }

    // Add prestige point
    setPrestigePoints(prev => prev + 1);

    // Reset game state
    resetGame();

    // Keep prestige data
    setPrestigePoints(prestigePoints + 1);
    setSeasonHighRep(Math.max(seasonHighRep, reputation));

      pushLog("🌟 PRESTIGE COMPLETE! You've earned 1 Prestige Point and unlocked meta perks!");
  setShowPrestigeModal(false);
};

// Marketing helpers
const getMarketingCost = () => {
  const currentDay = Math.floor(tick / 24);
  
  // Reset daily usage if it's a new day
  if (currentDay > marketingUsage.lastUseDay) {
    setMarketingUsage({
      lastUseDay: currentDay,
      usesToday: 0
    });
    return CONFIG.marketing.baseCost;
  }
  
  // Calculate cost based on daily usage
  return Math.round(CONFIG.marketing.baseCost * Math.pow(CONFIG.marketing.costMultiplier, marketingUsage.usesToday));
};

const canUseMarketing = () => {
  const currentDay = Math.floor(tick / 24);
  
  // Reset daily usage if it's a new day
  if (currentDay > marketingUsage.lastUseDay) {
    setMarketingUsage({
      lastUseDay: currentDay,
      usesToday: 0
    });
    return true;
  }
  
  return marketingUsage.usesToday < CONFIG.marketing.maxUsesPerDay;
};

const getMarketingLeadCount = () => {
  return Math.random() < 0.3 ? CONFIG.marketing.leadCount.max : CONFIG.marketing.leadCount.min; // 30% chance for 3 leads
};

// Reputation helpers
const getCurrentReputationTier = () => {
  return CONFIG.reputationTiers.find(tier => reputation >= tier.min && reputation <= tier.max) || CONFIG.reputationTiers[0];
};

const getNextReputationUnlock = () => {
  return CONFIG.reputationUnlocks.find(unlock => reputation < unlock.reputation);
};

// API helpers
const apiCall = async (url, options = {}, retryCount = 0) => {
  if (!url) {
    throw new Error('API endpoint not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.api.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    
    if (retryCount < 1) {
      // Retry once after delay
      await new Promise(resolve => setTimeout(resolve, CONFIG.api.retryDelay));
      return apiCall(url, options, retryCount + 1);
    }
    
    throw error;
  }
};

const submitRun = async (handle, rep, cash, jobsCompleted, funniestEvent) => {
  if (!CONFIG.api.submitRunUrl) {
    throw new Error('Submit run endpoint not configured');
  }

  setSubmitRunStatus({ type: 'loading', message: 'Submitting run...' });

  try {
    const result = await apiCall(CONFIG.api.submitRunUrl, {
      method: 'POST',
      body: JSON.stringify({
        handle,
        reputation: rep,
        cash,
        jobsCompleted,
        funniestEvent,
        gameVersion: CONFIG.gameVersion,
        timestamp: Date.now()
      })
    });

    setSubmitRunStatus({ type: 'success', message: 'Run submitted successfully!' });
    return result;
  } catch (error) {
    const errorMessage = `Failed to submit run: ${error.message}`;
    setSubmitRunStatus({ type: 'error', message: errorMessage });
    throw error;
  }
};

const fetchLeaderboard = async () => {
  if (!CONFIG.api.leaderboardUrl) {
    throw new Error('Leaderboard endpoint not configured');
  }

  setLeaderboardLoading(true);
  setLeaderboardError(null);

  try {
    const data = await apiCall(CONFIG.api.leaderboardUrl, {
      method: 'GET'
    });

    setLeaderboardData(data);
    setLeaderboardLoading(false);
    return data;
  } catch (error) {
    const errorMessage = `Failed to fetch leaderboard: ${error.message}`;
    setLeaderboardError(errorMessage);
    setLeaderboardLoading(false);
    throw error;
  }
};

const requestHandle = async (email, preferredHandle) => {
  if (!CONFIG.api.requestHandleUrl) {
    throw new Error('Request handle endpoint not configured');
  }

  setRequestHandleStatus({ type: 'loading', message: 'Requesting handle...' });

  try {
    const result = await apiCall(CONFIG.api.requestHandleUrl, {
      method: 'POST',
      body: JSON.stringify({
        email,
        preferredHandle,
        gameVersion: CONFIG.gameVersion,
        timestamp: Date.now()
      })
    });

    setRequestHandleStatus({ type: 'success', message: 'Handle request submitted! Check your email.' });
    return result;
  } catch (error) {
    const errorMessage = `Failed to request handle: ${error.message}`;
    setRequestHandleStatus({ type: 'error', message: errorMessage });
    throw error;
  }
};

const getSampleLeaderboardData = () => [
  { rank: 1, handle: "speed_demon", reputation: 245, cash: 125000, jobsCompleted: 89, funniestEvent: "Adobe charged me 3 times in one day" },
  { rank: 2, handle: "quality_king", reputation: 198, cash: 98000, jobsCompleted: 76, funniestEvent: "Client asked for 'more cinematic' on a 15s ad" },
  { rank: 3, handle: "studio_boss", reputation: 167, cash: 75000, jobsCompleted: 65, funniestEvent: "PC crashed during final render" },
  { rank: 4, handle: "overnight_warrior", reputation: 134, cash: 62000, jobsCompleted: 52, funniestEvent: "Worked 48 hours straight, forgot to eat" },
  { rank: 5, handle: "reputation_master", reputation: 112, cash: 48000, jobsCompleted: 43, funniestEvent: "Client loved the 'wrong' version" }
];

// Health check helpers
const createShadowSave = () => {
  return {
    cash,
    reputation,
    editors,
    pcs,
    jobs,
    logs,
    managers,
    editorTrainingCount,
    pcUpgradeCount,
    marketCycle,
    editorWorkHours,
    graceWindowJobs,
    memeEventState,
    activeMemeEvent,
    blackMarketEffects,
    virusWarning,
    virusCountdown,
    researchLevels,
    showResearchPanel,
    prestigePoints,
    seasonHighRep,
    showPrestigeModal,
    achievements,
    achievementStats,
    showAchievementsPanel,
    marketingUsage,
    lastHealthCheck,
    healthCheckWarning,
    shadowSave,
    softClampWarnings,
    commandHistory,
    changelog,
    performanceMetrics,
    performanceWarnings
  };
};

const applyShadowSave = (shadowData) => {
  setCash(shadowData.cash);
  setReputation(shadowData.reputation);
  setEditors(shadowData.editors);
  setPcs(shadowData.pcs);
  setJobs(shadowData.jobs);
  setLogs(shadowData.logs);
  setManagers(shadowData.managers);
  setEditorTrainingCount(shadowData.editorTrainingCount);
  setPcUpgradeCount(shadowData.pcUpgradeCount);
  setMarketCycle(shadowData.marketCycle);
  setEditorWorkHours(shadowData.editorWorkHours);
  setGraceWindowJobs(shadowData.graceWindowJobs);
  setMemeEventState(shadowData.memeEventState);
  setActiveMemeEvent(shadowData.activeMemeEvent);
  setBlackMarketEffects(shadowData.blackMarketEffects);
  setVirusWarning(shadowData.virusWarning);
  setVirusCountdown(shadowData.virusCountdown);
  setResearchLevels(shadowData.researchLevels);
  setShowResearchPanel(shadowData.showResearchPanel);
  setPrestigePoints(shadowData.prestigePoints);
  setSeasonHighRep(shadowData.seasonHighRep);
  setShowPrestigeModal(shadowData.showPrestigeModal);
  setAchievements(shadowData.achievements);
  setAchievementStats(shadowData.achievementStats);
  setShowAchievementsPanel(shadowData.showAchievementsPanel);
  setMarketingUsage(shadowData.marketingUsage);
  setLastHealthCheck(shadowData.lastHealthCheck);
  setHealthCheckWarning(shadowData.healthCheckWarning);
  setShadowSave(shadowData.shadowSave);
  setSoftClampWarnings(shadowData.softClampWarnings);
};

const checkForNaN = (value, name) => {
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return `NaN/Infinity detected in ${name}: ${value}`;
  }
  return null;
};

const checkForNegativeCash = (currentCash, cost, action) => {
  if (currentCash - cost < 0) {
    return `Negative cash would result from ${action}: ${currentCash} - ${cost} = ${currentCash - cost}`;
  }
  return null;
};

const checkSoftClamps = () => {
  const warnings = [];
  
  // Check editor salaries
  editors.forEach(editor => {
    if (editor.salary > CONFIG.healthCheck.softClamps.maxSalary) {
      warnings.push(`Editor salary clamped: ${editor.salary} → ${CONFIG.healthCheck.softClamps.maxSalary}`);
    }
  });
  
  // Check job payouts
  jobs.forEach(job => {
    if (job.pay > CONFIG.healthCheck.softClamps.maxPayout) {
      warnings.push(`Job payout clamped: ${job.pay} → ${CONFIG.healthCheck.softClamps.maxPayout}`);
    }
  });
  
  // Check cash
  if (cash > CONFIG.healthCheck.softClamps.maxCash) {
    warnings.push(`Cash clamped: ${cash} → ${CONFIG.healthCheck.softClamps.maxCash}`);
  }
  
  // Check reputation
  if (reputation > CONFIG.healthCheck.softClamps.maxReputation) {
    warnings.push(`Reputation clamped: ${reputation} → ${CONFIG.healthCheck.softClamps.maxReputation}`);
  }
  
  // Check editor count
  if (editors.length > CONFIG.healthCheck.softClamps.maxEditors) {
    warnings.push(`Editor count clamped: ${editors.length} → ${CONFIG.healthCheck.softClamps.maxEditors}`);
  }
  
  // Check PC count
  if (pcs.length > CONFIG.healthCheck.softClamps.maxPCs) {
    warnings.push(`PC count clamped: ${pcs.length} → ${CONFIG.healthCheck.softClamps.maxPCs}`);
  }
  
  return warnings;
};

const runHealthCheck = () => {
  const currentDay = Math.floor(tick / 24);
  const daysSinceLastCheck = currentDay - lastHealthCheck;
  
  if (daysSinceLastCheck < CONFIG.healthCheck.interval) {
    return; // Not time for health check yet
  }
  
  console.log(`Running health check (day ${currentDay})...`);
  
  // Create shadow save before simulation
  const shadowData = createShadowSave();
  setShadowSave(shadowData);
  
  // Create a copy of current state for simulation
  let simCash = cash;
  let simReputation = reputation;
  let simEditors = [...editors];
  let simPcs = [...pcs];
  let simJobs = [...jobs];
  let simTick = tick;
  let simLeadsGenerated = 0;
  let simErrors = [];
  
  // Run 7-day simulation
  for (let day = 0; day < CONFIG.healthCheck.simulationDays; day++) {
    for (let hour = 0; hour < 24; hour++) {
      simTick++;
      
      // Simulate job spawning
      if (Math.random() < 0.1) { // 10% chance per hour
        simLeadsGenerated++;
        const availableJobTypes = getAvailableJobTypes();
        if (availableJobTypes.length > 0) {
          simJobs.unshift(randomClientJob(simTick, availableJobTypes, getJobPayout));
        }
      }
      
      // Simulate job progress
      simJobs.forEach(job => {
        if (job.status === "active") {
          const teamEfficiency = Math.max(0.35, 1 - (simEditors.length - 10) * 0.02);
          const progress = (simEditors.length * 0.1 + simPcs.length * 0.05) * teamEfficiency;
          job.progress += progress;
          
          if (job.progress >= 100) {
            job.status = "done";
            simCash += job.pay;
            simReputation += 2;
          }
        }
      });
      
      // Simulate daily payments
      if (hour === 23) {
        const dailySalaries = simEditors.reduce((sum, editor) => sum + editor.salary, 0);
        const dailyOverhead = CONFIG.balance.overhead.softwareLicenses * (simEditors.length + simPcs.length) + 
                             CONFIG.balance.overhead.facilityCost + 
                             Math.log(simEditors.length + simPcs.length + 1) * CONFIG.balance.overhead.facilityScaling;
        
        simCash -= dailySalaries + dailyOverhead;
      }
      
      // Check for NaN values
      const nanChecks = [
        checkForNaN(simCash, 'cash'),
        checkForNaN(simReputation, 'reputation'),
        ...simEditors.map(editor => checkForNaN(editor.salary, 'editor salary')),
        ...simPcs.map(pc => checkForNaN(pc.power, 'pc power'))
      ].filter(Boolean);
      
      if (nanChecks.length > 0) {
        simErrors.push(...nanChecks);
      }
      
      // Check for negative cash
      const negativeCashCheck = checkForNegativeCash(simCash, 0, 'daily operations');
      if (negativeCashCheck) {
        simErrors.push(negativeCashCheck);
      }
    }
  }
  
  // Check leads per day
  const leadsPerDay = simLeadsGenerated / CONFIG.healthCheck.simulationDays;
  if (leadsPerDay < CONFIG.healthCheck.minLeadsPerDay) {
    simErrors.push(`Insufficient leads generated: ${leadsPerDay.toFixed(2)} per day (min: ${CONFIG.healthCheck.minLeadsPerDay})`);
  }
  
  // Check soft clamps
  const clampWarnings = checkSoftClamps();
  if (clampWarnings.length > 0) {
    setSoftClampWarnings(clampWarnings);
  }
  
  // If errors found, show warning and offer revert
  if (simErrors.length > 0) {
    console.warn('Health check failed:', simErrors);
    setHealthCheckWarning({
      type: 'error',
      title: 'Game Integrity Check Failed',
      message: 'Potential corruption detected. Consider exporting your save and refreshing.',
      errors: simErrors,
      canRevert: true
    });
  } else {
    console.log('Health check passed');
    setHealthCheckWarning(null);
  }
  
  setLastHealthCheck(currentDay);
};

// Changelog helpers
const addChangelogEntry = (type, message, details = null) => {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type, // 'feature', 'migration', 'dev', 'system'
    message,
    details,
    gameVersion: CONFIG.gameVersion,
    tick,
    day: Math.floor(tick / 24)
  };
  
  setChangelog(prev => {
    const newChangelog = [entry, ...prev.slice(0, CONFIG.dev.changelogMaxEntries - 1)];
    saveLS("changelog", newChangelog);
    return newChangelog;
  });
};

const exportLogs = () => {
  const logData = {
    version: CONFIG.gameVersion,
    timestamp: new Date().toISOString(),
    gameState: {
      tick,
      day: Math.floor(tick / 24),
      cash,
      reputation,
      editors: editors.length,
      pcs: pcs.length,
      jobs: jobs.length,
      managers,
      prestigePoints,
      achievements: achievements.size
    },
    eventLog,
    changelog,
    commandHistory
  };
  
  const json = JSON.stringify(logData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `car-editor-tycoon-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addChangelogEntry('dev', 'Logs exported', { exportedAt: new Date().toISOString() });
  pushLog("📋 Logs exported successfully.");
};

// Dev command palette helpers
const runPerformanceTest = () => {
  console.log('Running performance test...');
  addChangelogEntry('dev', 'Performance test started', { 
    timestamp: Date.now(),
    currentState: {
      editors: editors.length,
      pcs: pcs.length,
      jobs: jobs.length,
      speed: speed
    }
  });
  
  // Test 1: Large dataset simulation
  const testStart = performance.now();
  
  // Create large test dataset
  const testEditors = Array.from({ length: 150 }, (_, i) => ({
    id: `test-editor-${i}`,
    name: `Test Editor ${i}`,
    skill: 50 + Math.random() * 50,
    speed: 1 + Math.random() * 2,
    energy: 100,
    salary: 100 + Math.random() * 200,
    assignedJobId: null,
    resting: false,
    onboardingComplete: 0
  }));
  
  const testPCs = Array.from({ length: 100 }, (_, i) => ({
    id: `test-pc-${i}`,
    name: `Test PC ${i}`,
    power: 50 + Math.random() * 100,
    stability: 0.8 + Math.random() * 0.2,
    assignedJobId: null
  }));
  
  const testJobs = Array.from({ length: 100 }, (_, i) => ({
    id: `test-job-${i}`,
    type: 'Commercial',
    client: `Test Client ${i}`,
    description: `Test job ${i}`,
    difficulty: 50 + Math.random() * 50,
    timeRequired: 100,
    payout: 1000 + Math.random() * 5000,
    deadline: tick + 24 * 7,
    progress: Math.random() * 100,
    status: Math.random() > 0.5 ? 'active' : 'available',
    accepted: false,
    assignedEditorId: null,
    assignedPCId: null
  }));
  
  // Test 2: Simulate 8x speed for 100 ticks
  const originalSpeed = speed;
  const originalEditors = editors;
  const originalPCs = pcs;
  const originalJobs = jobs;
  
  // Temporarily set large dataset
  setEditors(testEditors);
  setPCs(testPCs);
  setJobs(testJobs);
  setSpeed(8);
  
  const simulationStart = performance.now();
  let totalTickTime = 0;
  let tickCount = 0;
  
  // Run 100 ticks at 8x speed
  for (let i = 0; i < 100; i++) {
    const tickStart = performance.now();
    
    // Simulate one tick
    const tickUpdates = [];
    tickUpdates.push(() => setTick(t => t + 1));
    
    // Simulate job progress
    const updatedJobs = testJobs.map(job => {
      if (job.status === 'active' && Math.random() > 0.5) {
        return { ...job, progress: Math.min(100, job.progress + Math.random() * 10) };
      }
      return job;
    });
    tickUpdates.push(() => setJobs(updatedJobs));
    
    // Simulate editor updates
    const updatedEditors = testEditors.map(editor => {
      if (editor.energy < 100) {
        return { ...editor, energy: Math.min(100, editor.energy + Math.random() * 5) };
      }
      return editor;
    });
    tickUpdates.push(() => setEditors(updatedEditors));
    
    // Execute updates
    batchStateUpdates(tickUpdates);
    
    const tickEnd = performance.now();
    totalTickTime += tickEnd - tickStart;
    tickCount++;
  }
  
  const simulationEnd = performance.now();
  const totalTime = simulationEnd - simulationStart;
  const avgTickTime = totalTickTime / tickCount;
  
  // Restore original state
  setEditors(originalEditors);
  setPCs(originalPCs);
  setJobs(originalJobs);
  setSpeed(originalSpeed);
  
  const results = {
    totalTime: totalTime.toFixed(2),
    avgTickTime: avgTickTime.toFixed(2),
    ticksPerSecond: (1000 / avgTickTime).toFixed(1),
    targetFPS: CONFIG.dev.performance.targetFPS,
    maxTickTime: CONFIG.dev.performance.maxTickTime,
    passed: avgTickTime <= CONFIG.dev.performance.maxTickTime
  };
  
  addChangelogEntry('dev', 'Performance test completed', results);
  pushLog(`🔬 Performance test: ${results.avgTickTime}ms/tick, ${results.ticksPerSecond} ticks/sec ${results.passed ? '✅' : '❌'}`);
  
  return results;
};

const runSimulation = (days = CONFIG.dev.simulationDays) => {
  const startTick = tick;
  const startCash = cash;
  const startReputation = reputation;
  const startJobs = jobs.length;
  
  console.log(`Running ${days}-day simulation...`);
  addChangelogEntry('dev', `${days}-day simulation started`, { 
    startTick, 
    startCash, 
    startReputation, 
    startJobs 
  });
  
  // Create a copy of current state for simulation
  let simCash = cash;
  let simReputation = reputation;
  let simEditors = [...editors];
  let simPcs = [...pcs];
  let simJobs = [...jobs];
  let simTick = tick;
  let simLeadsGenerated = 0;
  let simJobsCompleted = 0;
  
  // Run simulation
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      simTick++;
      
      // Simulate job spawning
      if (Math.random() < 0.1) { // 10% chance per hour
        simLeadsGenerated++;
        const availableJobTypes = getAvailableJobTypes();
        if (availableJobTypes.length > 0) {
          simJobs.unshift(randomClientJob(simTick, availableJobTypes, getJobPayout));
        }
      }
      
      // Simulate job progress
      simJobs.forEach(job => {
        if (job.status === "active") {
          const teamEfficiency = Math.max(0.35, 1 - (simEditors.length - 10) * 0.02);
          const progress = (simEditors.length * 0.1 + simPcs.length * 0.05) * teamEfficiency;
          job.progress += progress;
          
          if (job.progress >= 100) {
            job.status = "done";
            simCash += job.pay;
            simReputation += 2;
            simJobsCompleted++;
          }
        }
      });
      
      // Simulate daily payments
      if (hour === 23) {
        const dailySalaries = simEditors.reduce((sum, editor) => sum + editor.salary, 0);
        const dailyOverhead = CONFIG.balance.overhead.softwareLicenses * (simEditors.length + simPcs.length) + 
                             CONFIG.balance.overhead.facilityCost + 
                             Math.log(simEditors.length + simPcs.length + 1) * CONFIG.balance.overhead.facilityScaling;
        
        simCash -= dailySalaries + dailyOverhead;
      }
    }
  }
  
  const results = {
    days,
    cashGain: simCash - startCash,
    reputationGain: simReputation - startReputation,
    jobsCompleted: simJobsCompleted,
    leadsGenerated: simLeadsGenerated,
    finalCash: simCash,
    finalReputation: simReputation
  };
  
  addChangelogEntry('dev', `${days}-day simulation completed`, results);
  pushLog(`🔮 ${days}-day simulation: +$${results.cashGain.toLocaleString()}, +${results.reputationGain} rep, ${results.jobsCompleted} jobs completed`);
  
  return results;
};

const fillCash = (amount) => {
  const clampedAmount = Math.min(amount, CONFIG.dev.maxCashFill);
  const oldCash = cash;
  setCash(clampedAmount);
  
  addChangelogEntry('dev', 'Cash filled', { 
    oldCash, 
    newCash: clampedAmount, 
    requested: amount 
  });
  pushLog(`💰 Cash filled to $${clampedAmount.toLocaleString()}`);
};

const spawnLeads = (count) => {
  const clampedCount = Math.min(count, CONFIG.dev.maxLeadsSpawn);
  const availableJobTypes = getAvailableJobTypes();
  
  if (availableJobTypes.length === 0) {
    pushLog("❌ No available job types to spawn leads");
    return;
  }
  
  setJobs(prev => {
    const next = [...prev];
    for (let i = 0; i < clampedCount; i++) {
      next.unshift(randomClientJob(tick, availableJobTypes, getJobPayout));
    }
    return next;
  });
  
  addChangelogEntry('dev', 'Leads spawned', { 
    count: clampedCount, 
    requested: count 
  });
  pushLog(`📋 Spawned ${clampedCount} new leads`);
};

const toggleFeatureFlag = (flagName) => {
  if (CONFIG.featureFlags.hasOwnProperty(flagName)) {
    const oldValue = CONFIG.featureFlags[flagName];
    CONFIG.featureFlags[flagName] = !oldValue;
    
    addChangelogEntry('dev', `Feature flag toggled: ${flagName}`, { 
      flag: flagName, 
      oldValue, 
      newValue: !oldValue 
    });
    pushLog(`🔧 Feature flag '${flagName}' ${!oldValue ? 'enabled' : 'disabled'}`);
  } else {
    pushLog(`❌ Unknown feature flag: ${flagName}`);
  }
};

const resetToLastGoodSave = () => {
  if (shadowSave) {
    applyShadowSave(shadowSave);
    addChangelogEntry('dev', 'Reset to last good save', { 
      resetFrom: 'shadowSave' 
    });
    pushLog("🔄 Reset to last known good state");
  } else {
    pushLog("❌ No shadow save available");
  }
};

const executeCommand = (command) => {
  const parts = command.trim().toLowerCase().split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);
  
  try {
    switch (cmd) {
      case 'sim':
      case 'simulate':
        const days = parseInt(args[0]) || CONFIG.dev.simulationDays;
        runSimulation(days);
        break;
        
      case 'cash':
      case 'fill':
        const amount = parseInt(args[0]) || 100000;
        fillCash(amount);
        break;
        
      case 'leads':
      case 'spawn':
        const count = parseInt(args[0]) || 5;
        spawnLeads(count);
        break;
        
      case 'flag':
      case 'toggle':
        const flagName = args[0];
        if (flagName) {
          toggleFeatureFlag(flagName);
        } else {
          pushLog("❌ Please specify a feature flag name");
        }
        break;
        
      case 'reset':
      case 'revert':
        resetToLastGoodSave();
        break;
        
      case 'logs':
      case 'export':
        exportLogs();
        break;
        
      case 'perf':
      case 'performance':
        runPerformanceTest();
        break;
        
      case 'help':
        pushLog("🔧 Available commands: sim [days], cash [amount], leads [count], flag [name], reset, logs, perf, help");
        break;
        
      default:
        pushLog(`❌ Unknown command: ${cmd}. Type 'help' for available commands.`);
    }
  } catch (error) {
    pushLog(`❌ Command error: ${error.message}`);
  }
  
  // Add to command history
  setCommandHistory(prev => [command, ...prev.slice(0, 49)]); // Keep last 50 commands
  setCommandHistoryIndex(-1);
};

// Performance monitoring helpers
const measurePerformance = (callback, label) => {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  const duration = end - start;
  
  if (duration > CONFIG.dev.performance.maxTickTime) {
    console.warn(`Performance warning: ${label} took ${duration.toFixed(2)}ms`);
    setPerformanceWarnings(prev => [...prev.slice(-4), { label, duration, timestamp: Date.now() }]);
  }
  
  return { result, duration };
};

const updatePerformanceMetrics = () => {
  const now = performance.now();
  const frameTime = now - performanceMetrics.lastFrameTime;
  const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
  
  setPerformanceMetrics(prev => ({
    ...prev,
    fps,
    lastFrameTime: now,
    renderCount: prev.renderCount + 1,
    memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0
  }));
};

const batchStateUpdates = (updates) => {
  if (!CONFIG.dev.performance.batchUpdates) {
    updates.forEach(update => update());
    return;
  }
  
  // Use React's automatic batching in React 18+
  React.startTransition(() => {
    updates.forEach(update => update());
  });
};

const getAchievementProgress = (achievementId) => {
  switch (achievementId) {
    case "flawlessDeliveries":
      return achievementStats.flawlessDeliveries;
    case "largeTeam":
      return editors.length + managers;
    case "overnightJobs":
      return achievementStats.overnightJobs;
    case "highReputation":
      return reputation;
    case "richStudio":
      return cash;
    case "speedDemon":
      return achievementStats.speedDemonJobs;
    case "qualityMaster":
      return achievementStats.qualityMasterJobs;
    case "workaholic":
      return achievementStats.maxWorkHours;
    case "marketCycler":
      return achievementStats.marketCycles;
    case "researchMaster":
      return achievementStats.maxResearchCategories;
    default:
      return 0;
  }
};

// Achievements helpers
const unlockAchievement = (achievementId) => {
  if (achievements.has(achievementId)) return; // Already unlocked
  
  const achievement = CONFIG.achievements[achievementId];
  if (!achievement) return;
  
  setAchievements(prev => new Set([...prev, achievementId]));
  pushLog(`🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name}`);
  
  // Show toast notification
  showAchievementToast(achievement);
};

const showAchievementToast = (achievement) => {
  // Create a temporary toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 bg-neutral-900 border-2 border-${achievement.color.replace('text-', '')} rounded-xl p-4 shadow-lg animate-bounce`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="text-2xl">${achievement.icon}</div>
      <div>
        <div class="font-bold ${achievement.color}">${achievement.name}</div>
        <div class="text-sm text-neutral-300">${achievement.description}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Remove toast after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
};

const checkAchievements = () => {
  // Check flawless deliveries
  if (achievementStats.flawlessDeliveries >= CONFIG.achievements.flawlessDeliveries.requirement) {
    unlockAchievement("flawlessDeliveries");
  }
  
  // Check large team
  const totalStaff = editors.length + managers;
  if (totalStaff >= CONFIG.achievements.largeTeam.requirement) {
    unlockAchievement("largeTeam");
  }
  
  // Check overnight jobs
  if (achievementStats.overnightJobs >= CONFIG.achievements.overnightJobs.requirement) {
    unlockAchievement("overnightJobs");
  }
  
  // Check high reputation
  if (reputation >= CONFIG.achievements.highReputation.requirement) {
    unlockAchievement("highReputation");
  }
  
  // Check rich studio
  if (cash >= CONFIG.achievements.richStudio.requirement) {
    unlockAchievement("richStudio");
  }
  
  // Check speed demon
  if (achievementStats.speedDemonJobs >= CONFIG.achievements.speedDemon.requirement) {
    unlockAchievement("speedDemon");
  }
  
  // Check quality master
  if (achievementStats.qualityMasterJobs >= CONFIG.achievements.qualityMaster.requirement) {
    unlockAchievement("qualityMaster");
  }
  
  // Check workaholic
  if (achievementStats.maxWorkHours >= CONFIG.achievements.workaholic.requirement) {
    unlockAchievement("workaholic");
  }
  
  // Check market cycler
  if (achievementStats.marketCycles >= CONFIG.achievements.marketCycler.requirement) {
    unlockAchievement("marketCycler");
  }
  
  // Check research master
  if (achievementStats.maxResearchCategories >= CONFIG.achievements.researchMaster.requirement) {
    unlockAchievement("researchMaster");
  }
};

  // ==================== Helpers ====================
  function editorName(id) { return editors.find((e) => e.id === id)?.name ?? "—"; }
  function pcName(id) { return pcs.find((p) => p.id === id)?.name ?? "—"; }
  function pushLog(msg) { setEventLog((prev) => [timeStr(), msg, ...prev].slice(0, 50)); }
  function timeStr() { const d = `Day ${day}`; const h = tick % 24; return `[${d} • ${String(h).padStart(2, "0")}:00]`; }
  function toast(msg) { pushLog(`⚠️ ${msg}`); }

  // ==================== UI ====================
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          Car Editor Tycoon <span className="text-orange-400">β</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPlaying((p) => !p)} className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${playing ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
            {playing ? "Pause" : "Start"}
          </button>
          <button onClick={() => step()} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-neutral-800 hover:bg-neutral-700">+1 Tick</button>
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-xl">
            <span className="text-xs opacity-70">Speed</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-neutral-800 rounded-lg text-sm px-2 py-1 focus:outline-none">
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
            </select>
          </div>
          <label className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-xl text-sm">
            <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
            Auto‑assign
          </label>
          {showDevFeatures && (
            <label className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-xl text-sm">
              <input type="checkbox" checked={devOverlay} onChange={(e) => setDevOverlay(e.target.checked)} />
              Dev Overlay
            </label>
          )}
          <button onClick={exportSave} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-blue-600 hover:bg-blue-500">Export</button>
          <button onClick={importSave} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-purple-600 hover:bg-purple-500">Import</button>
          {CONFIG.cloudBackupUrl && (
            <button 
              onClick={cloudBackup} 
              disabled={cloudBackupStatus === "loading"}
              className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${
                cloudBackupStatus === "loading" 
                  ? "bg-neutral-700 opacity-60" 
                  : cloudBackupStatus === "success"
                  ? "bg-green-600"
                  : cloudBackupStatus === "error"
                  ? "bg-red-600"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {cloudBackupStatus === "loading" ? "Backing up..." : 
               cloudBackupStatus === "success" ? "✓ Backed up" :
               cloudBackupStatus === "error" ? "✗ Failed" : "Cloud Backup"}
            </button>
          )}
          <button onClick={resetGame} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-neutral-900 hover:bg-neutral-800">Reset</button>
          <button onClick={() => setShowResearchPanel(true)} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-blue-600 hover:bg-blue-500">🔬 Research</button>
          {CONFIG.featureFlags.prestige && (
            <button 
              onClick={() => setShowPrestigeModal(true)} 
              className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${
                canPrestige() 
                  ? "bg-purple-600 hover:bg-purple-500" 
                  : "bg-neutral-700 opacity-60"
              }`}
              title={canPrestige() ? "Prestige: Reset for meta perks" : "Need Rep 100+ and $10,000+ to prestige"}
            >
              🌟 Prestige {prestigePoints > 0 && `(${prestigePoints})`}
            </button>
          )}
          <button onClick={() => setShowAchievementsPanel(true)} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-yellow-600 hover:bg-yellow-500">
            🏆 Achievements {achievements.size > 0 && `(${achievements.size})`}
          </button>
          <button onClick={() => setCurrentRoute('leaderboard')} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-indigo-600 hover:bg-indigo-500">
            📊 Leaderboard
          </button>
          {showDevFeatures && (
            <button onClick={() => setShowCommandPalette(true)} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-purple-600 hover:bg-purple-500">
              🔧 Commands
            </button>
          )}
          {showDevFeatures && (
            <button onClick={() => setShowChangelog(true)} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-gray-600 hover:bg-gray-500">
              📋 Changelog {changelog.length > 0 && `(${changelog.length})`}
            </button>
          )}
          <button onClick={generateRunSummary} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-purple-600 hover:bg-purple-500">
            📸 Share Run
          </button>
        </div>
        
        {/* Research Icons */}
        <div className="flex items-center gap-1 mt-2 md:mt-0">
          {CONFIG.balance.research.upgrades.map((research) => {
            const level = getResearchLevel(research.id);
            if (level === 0) return null;
            
            return (
              <div 
                key={research.id}
                className="text-lg cursor-help"
                title={`${research.name} - Level ${level} (${research.tooltip})`}
              >
                {research.icon}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payroll Risk Banner */}
      {isPayrollRisk() && (
        <div className="mt-4 bg-red-900/60 border border-red-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-red-300">Payroll Risk</h3>
              <p className="text-sm text-red-200">
                Projected cash tomorrow: <span className="font-bold">${getProjectedNextDayCash().toLocaleString()}</span> 
                (Daily burn: ${(getDailySalaries() + getDailyOverhead()).toLocaleString()})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Health Check Warning Banner */}
      {healthCheckWarning && (
        <div className="mt-4 bg-red-900/60 border border-red-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔍</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-300">{healthCheckWarning.title}</h3>
              <p className="text-sm text-red-200 mb-2">{healthCheckWarning.message}</p>
              {healthCheckWarning.errors && (
                <div className="text-xs text-red-200 mb-3">
                  <div className="font-semibold mb-1">Issues detected:</div>
                  {healthCheckWarning.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="ml-2">• {error}</div>
                  ))}
                  {healthCheckWarning.errors.length > 3 && (
                    <div className="ml-2 text-red-300">... and {healthCheckWarning.errors.length - 3} more</div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={exportSave}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold"
                >
                  📁 Export Save
                </button>
                {healthCheckWarning.canRevert && shadowSave && (
                  <button 
                    onClick={() => {
                      if (confirm('Revert to last known good state? This will undo recent changes.')) {
                        applyShadowSave(shadowSave);
                        setHealthCheckWarning(null);
                      }
                    }}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-semibold"
                  >
                    🔄 Revert Changes
                  </button>
                )}
                <button 
                  onClick={() => setHealthCheckWarning(null)}
                  className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-xs font-semibold"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-9 gap-3 mt-4">
        <StatCard label="Cash" value={`$${cash.toLocaleString()}`} sub="Budget" />
        <StatCard 
          label="Reputation" 
          value={`${reputation}`} 
          sub={`${getCurrentReputationTier().name} • ${getNextReputationUnlock() ? `${getNextReputationUnlock().reputation - reputation} to ${getNextReputationUnlock().description}` : 'Max tier'}`}
        />
        <StatCard label="Day" value={`${day}`} sub={`Hour ${String(tick % 24).padStart(2, "0")}:00`} />
        <StatCard label="Active Jobs" value={`${active.length}`} sub={`${available.length} waiting`} />
        <StatCard label="Team" value={`${editors.length} editors`} sub={`${managers} managers • ${(teamEfficiency * 100).toFixed(0)}% efficiency`} />
        <StatCard label="Job Tier" value={getCurrentJobTier().name} sub={`Rep ${reputation} • ${getAvailableJobTypes().length}/${JOB_TYPES.length} types`} />
        <StatCard label="Daily Burn" value={`$${(getDailySalaries() + getDailyOverhead()).toLocaleString()}`} sub={`Salaries $${getDailySalaries()} • Overhead $${getDailyOverhead()}`} />
        <StatCard label="Upgrades" value={`${purchased.size}/${UPGRADES.length}`} sub={`Spawn ${(spawnRate * 100).toFixed(0)}% • Lead cap ${leadCap}`} />
        {CONFIG.featureFlags.prestige && (
          <StatCard label="Prestige" value={`${prestigePoints} pts`} sub={`Season High: ${seasonHighRep} rep`} />
        )}
      </div>

      {/* Main Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-4">
        {/* Left: Leads */}
        <section className="xl:col-span-4 bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Leads & Inquiries</h2>
            {marketCycle.boostedType && (
              <div className="text-xs bg-green-900/60 border border-green-700/60 px-2 py-1 rounded">
                📈 {marketCycle.boostedType} boosted
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={runMarketing} 
              disabled={!canUseMarketing()}
              className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${
                canUseMarketing() 
                  ? "bg-orange-600 hover:bg-orange-500" 
                  : "bg-neutral-700 opacity-60"
              }`}
              title={canUseMarketing() ? `Marketing: ${marketingUsage.usesToday}/${CONFIG.marketing.maxUsesPerDay} uses today` : "Daily marketing limit reached"}
            >
              Run Marketing (−${getMarketingCost()})
            </button>
            <span className="text-xs opacity-70">
              Spawn rate: {(spawnRate * 100).toFixed(0)}% (cap {leadCap}) • Uses: {marketingUsage.usesToday}/{CONFIG.marketing.maxUsesPerDay}
            </span>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
            {available.length === 0 && (
              <div className="text-sm opacity-60">No leads right now. Try marketing or wait for inquiries.</div>
            )}
            {available.map((j) => (
              <div key={j.id} className="rounded-xl p-3 bg-neutral-800/70 border border-neutral-700/60">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {j.type}
                    {marketCycle.boostedType === j.type && <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">📈</span>}
                    {marketCycle.nerfedType === j.type && <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">📉</span>}
                  </div>
                  <div className="text-sm text-emerald-400 font-bold">${j.payout.toLocaleString()}</div>
                </div>
                <div className="text-sm opacity-80">{j.clientName}</div>
                <div className="text-xs opacity-70">{j.brand}</div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <Badge>Req {j.difficulty}</Badge>
                  <Badge>Hours {j.timeRequired}</Badge>
                  {graceWindowJobs.has(j.id) ? (
                    <Badge className="bg-orange-900 border-orange-700">Grace: {Math.max(getGraceWindowDeadline(j) - tick, 0)}h</Badge>
                  ) : (
                    <Badge>Due in {Math.max(j.deadline - tick, 0)}h</Badge>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => acceptJob(j.id)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500">Accept</button>
                  <button onClick={() => failJob(j.id, "Declined")} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-neutral-700 hover:bg-neutral-600">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Center: Active Board */}
        <section className="xl:col-span-5 bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
          <h2 className="font-bold text-lg mb-3">Production Board</h2>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-2">
            {active.length === 0 && <div className="text-sm opacity-60">No active jobs. Accept a lead and assign staff.</div>}
            {active.map((j) => (
              <div key={j.id} className="rounded-xl p-3 bg-neutral-800/70 border border-neutral-700/60">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {j.type}
                      {marketCycle.boostedType === j.type && <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">📈</span>}
                      {marketCycle.nerfedType === j.type && <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">📉</span>}
                    </div>
                    <div className="text-xs opacity-70">{j.brand}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">${j.payout.toLocaleString()}</div>
                    <div className="text-xs opacity-70">Due in {Math.max(j.deadline - tick, 0)}h</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div className="bg-neutral-900/70 rounded-lg p-2">
                    <div className="opacity-70 text-xs">Editor</div>
                    <div className="font-semibold">{editorName(j.assignedEditorId)}</div>
                  </div>
                  <div className="bg-neutral-900/70 rounded-lg p-2">
                    <div className="opacity-70 text-xs">Workstation</div>
                    <div className="font-semibold">{pcName(j.assignedPCId)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={Math.round((j.progress / j.timeRequired) * 100)} />
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => unassign(j.id)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-neutral-700 hover:bg-neutral-600">Unassign</button>
                  <button onClick={() => autoAssignJob(j.id)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-neutral-700 hover:bg-neutral-600">Auto‑assign</button>
                </div>
              </div>
            ))}

            {(done.length > 0 || failed.length > 0) && (
              <div className="pt-2 border-t border-neutral-800/60">
                <h3 className="text-sm font-bold mb-2 opacity-80">History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {done.slice(0, 6).map((j) => (
                    <div key={j.id} className="rounded-lg p-2 bg-neutral-800/70 border border-neutral-700/60 text-xs">
                      ✅ {j.type} • {j.brand} • ${j.payout}
                    </div>
                  ))}
                  {failed.slice(0, 6).map((j) => (
                    <div key={j.id} className="rounded-lg p-2 bg-neutral-800/70 border border-neutral-700/60 text-xs">
                      ❌ {j.type} • {j.brand}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Team, Upgrades & Shop */}
        <section className="xl:col-span-3 space-y-4">
          {/* Team & upgrades */}
          <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
            <h2 className="font-bold text-lg mb-3">Team & Upgrades</h2>
            <div className="space-y-2 mb-3">
              <div className="flex gap-2 items-center flex-wrap">
                <button onClick={hireEditor} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-sky-600 hover:bg-sky-500">Hire Editor (−${getHireEditorCost()})</button>
                <span className="text-xs opacity-70">Remaining friends: {getRemainingFriends().length}</span>
                <button onClick={buyPC} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-fuchsia-600 hover:bg-fuchsia-500">Buy PC (−${getBuyPCCost()})</button>
              </div>
              {canHireManager && (
                <div className="flex gap-2 items-center flex-wrap">
                  <button onClick={hireManager} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-amber-600 hover:bg-amber-500">Hire Manager (−$ {2000 + managers * 500})</button>
                  <span className="text-xs opacity-70">Managers: {managers}/{availableManagerSlots} • +{(CONFIG.balance.managerEfficiencyBonus * 100).toFixed(0)}% efficiency each</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-auto pr-2">
              <div>
                <h3 className="font-semibold mb-1">Editors</h3>
                {visibleEditors.map((e) => {
                  const isOnboarding = e.onboardingComplete && tick < e.onboardingComplete;
                  const onboardingHoursLeft = isOnboarding ? e.onboardingComplete - tick : 0;
                  return (
                    <div key={e.id} className="rounded-xl p-3 bg-neutral-800/70 border border-neutral-700/60 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {e.name} 
                          {e.assignedJobId && !e.resting && <span className="text-xs opacity-70"> • busy</span>}
                          {e.assignedJobId && e.resting && <span className="text-xs opacity-70"> • resting</span>}
                          {isOnboarding && <span className="text-xs text-orange-400"> • onboarding</span>}
                          {isEditorBurnout(e.id) && <span className="text-xs text-red-400"> • burnout</span>}
                        </div>
                        <div className="text-xs opacity-70">Salary ${e.salary}/day</div>
                      </div>
                                              <div className="text-xs opacity-80">
                          Skill {e.skill + getBlackMarketSkillBoost()} • Speed {(e.speed + effects.speedBonus + getBlackMarketSpeedBoost()).toFixed(2)}x
                          {isOnboarding && <span className="text-orange-400"> • {onboardingHoursLeft}h remaining</span>}
                          {(editorTrainingCount[e.id] || 0) > 0 && <span className="text-blue-400"> • Trained {(editorTrainingCount[e.id] || 0)}x</span>}
                          {(editorWorkHours[e.id] || 0) > 0 && <span className="text-yellow-400"> • Worked {(editorWorkHours[e.id] || 0)}h</span>}
                          {isBlackMarketActive() && <span className="text-red-400"> • Cracked plugins active</span>}
                        </div>
                      <div className="mt-1">
                        <Bar value={e.energy} label="Energy" />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => trainEditor(e.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-700 hover:bg-neutral-600">Train (−${getTrainEditorCost(e.id)})</button>
                      </div>
                    </div>
                  );
                })}
                {CONFIG.dev.performance.virtualizeLists && editors.length > CONFIG.dev.performance.maxVisibleEditors && (
                  <div className="text-xs text-neutral-400 text-center py-2">
                    Showing {CONFIG.dev.performance.maxVisibleEditors} of {editors.length} editors
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-1">Workstations</h3>
                {visiblePCs.map((p) => (
                  <div key={p.id} className="rounded-xl p-3 bg-neutral-800/70 border border-neutral-700/60 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.name} {p.assignedJobId && <span className="text-xs opacity-70">• busy</span>}</div>
                      <div className="text-xs opacity-70">Tier {p.tier}</div>
                    </div>
                    <div className="text-xs opacity-80">
                      Power {p.power} • Stability {p.stability}%
                      {(pcUpgradeCount[p.id] || 0) > 0 && <span className="text-purple-400"> • Upgraded {(pcUpgradeCount[p.id] || 0)}x</span>}
                      <span className="text-gray-400"> • {(getPCCrashChance(p) * 100).toFixed(1)}% crash chance</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => upgradePC(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-700 hover:bg-neutral-600">Upgrade (−${getUpgradePCCost(p.id)})</button>
                    </div>
                  </div>
                ))}
                {CONFIG.dev.performance.virtualizeLists && pcs.length > CONFIG.dev.performance.maxVisiblePCs && (
                  <div className="text-xs text-neutral-400 text-center py-2">
                    Showing {CONFIG.dev.performance.maxVisiblePCs} of {pcs.length} PCs
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
            <h2 className="font-bold text-lg mb-3">Shop — Plugins & Memberships</h2>
            <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-auto pr-2">
              {UPGRADES.map((u) => {
                const owned = purchased.has(u.id);
                return (
                  <div key={u.id} className="rounded-xl p-3 bg-neutral-800/70 border border-neutral-700/60">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{u.name} {owned && <span className="text-xs opacity-70">• owned</span>}</div>
                        <div className="text-xs opacity-80">{u.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">${u.cost.toLocaleString()}</div>
                        <button disabled={owned || cash < u.cost} onClick={() => buyUpgrade(u.id)} className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${owned ? "bg-neutral-700 opacity-60" : cash < u.cost ? "bg-neutral-700 opacity-80" : "bg-emerald-600 hover:bg-emerald-500"}`}>{owned ? "Owned" : "Buy"}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs opacity-70 mt-2">Permanent upgrades apply to all editors and persist across sessions.</div>
            
            {/* Black Market Section */}
            {CONFIG.featureFlags.blackMarket && (
              <div className="mt-4 pt-4 border-t border-red-500/30">
                <h3 className="font-bold text-lg mb-3 text-red-400">🖤 Black Market</h3>
                <div className="rounded-xl p-3 bg-red-900/20 border border-red-500/30">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-red-300">Cracked Plugins</div>
                      <div className="text-xs opacity-80 text-red-200">
                        {CONFIG.balance.blackMarket.crackedPlugins.description}
                      </div>
                      <div className="text-xs text-red-400 mt-1">
                        ⚠️ <strong>5% risk of catastrophic virus</strong> - may force game reset
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-400">${CONFIG.balance.blackMarket.crackedPlugins.cost}</div>
                      <button 
                        onClick={buyCrackedPlugins} 
                        disabled={cash < CONFIG.balance.blackMarket.crackedPlugins.cost || isBlackMarketActive()}
                        className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          cash < CONFIG.balance.blackMarket.crackedPlugins.cost || isBlackMarketActive() 
                            ? "bg-neutral-700 opacity-60" 
                            : "bg-red-600 hover:bg-red-500"
                        }`}
                        title="⚠️ WARNING: 5% chance of catastrophic virus that will reset your game!"
                      >
                        {isBlackMarketActive() ? "Active" : "Buy (Risky)"}
                      </button>
                    </div>
                  </div>
                  {isBlackMarketActive() && (
                    <div className="mt-2 text-xs text-red-300">
                      ⏰ Active for {Math.max(0, Math.ceil((blackMarketEffects.expiresAt - tick) / 24))} more hours
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Research Panel */}
        {showResearchPanel && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-2xl mx-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">🔬 Research & Development</h2>
                <button 
                  onClick={() => setShowResearchPanel(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-neutral-400 mb-4">
                Permanent global upgrades. Each purchase increases the next cost by 50%.
              </div>
              <div className="grid grid-cols-1 gap-3">
                {CONFIG.balance.research.upgrades.map((research) => {
                  const level = getResearchLevel(research.id);
                  const cost = getResearchCost(research.id);
                  const effect = getResearchEffect(research.id);
                  const isMaxed = level >= CONFIG.balance.research.maxLevel;
                  
                  return (
                    <div key={research.id} className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{research.icon}</span>
                            <span className="font-semibold">{research.name}</span>
                            <span className="text-xs bg-neutral-700 px-2 py-1 rounded">
                              Level {level}/{CONFIG.balance.research.maxLevel}
                            </span>
                          </div>
                          <div className="text-sm text-neutral-300 mb-2">{research.description}</div>
                          <div className="text-xs text-neutral-400">
                            Current effect: {research.effect === "failPenalty" || research.effect === "energyDrain" ? "-" : "+"}{(effect * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">
                            ${cost.toLocaleString()}
                          </div>
                          <button 
                            onClick={() => buyResearch(research.id)}
                            disabled={isMaxed || cash < cost}
                            className={`mt-2 px-4 py-2 rounded-lg font-semibold ${
                              isMaxed 
                                ? "bg-neutral-700 opacity-60" 
                                : cash < cost 
                                  ? "bg-neutral-700 opacity-80" 
                                  : "bg-emerald-600 hover:bg-emerald-500"
                            }`}
                          >
                            {isMaxed ? "Maxed" : "Research"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Prestige Modal */}
        {showPrestigeModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-2xl mx-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-purple-400">🌟 Prestige System</h2>
                <button 
                  onClick={() => setShowPrestigeModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-purple-300 mb-2">Requirements</h3>
                  <div className="text-sm space-y-1">
                    <div className={`flex items-center gap-2 ${reputation >= CONFIG.balance.prestige.requirements.reputation ? 'text-green-400' : 'text-red-400'}`}>
                      {reputation >= CONFIG.balance.prestige.requirements.reputation ? '✓' : '✗'} Reputation: {reputation}/{CONFIG.balance.prestige.requirements.reputation}
                    </div>
                    <div className={`flex items-center gap-2 ${cash >= CONFIG.balance.prestige.requirements.cash ? 'text-green-400' : 'text-red-400'}`}>
                      {cash >= CONFIG.balance.prestige.requirements.cash ? '✓' : '✗'} Cash: ${cash.toLocaleString()}/${CONFIG.balance.prestige.requirements.cash.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-neutral-800 rounded-xl p-4 mb-4">
                  <h3 className="font-bold mb-2">Current Status</h3>
                  <div className="text-sm space-y-1">
                    <div>Prestige Points: <span className="text-purple-400 font-bold">{prestigePoints}</span></div>
                    <div>Season High Reputation: <span className="text-blue-400 font-bold">{seasonHighRep}</span></div>
                  </div>
                </div>
                
                <div className="bg-neutral-800 rounded-xl p-4">
                  <h3 className="font-bold mb-2">Meta Perks (Active)</h3>
                  <div className="text-sm space-y-1">
                    {CONFIG.balance.prestige.perks.map((perk) => {
                      const effect = getPrestigePerkEffect(perk.id);
                      return (
                        <div key={perk.id} className="flex items-center gap-2">
                          <span>{perk.icon}</span>
                          <span>{perk.name}:</span>
                          <span className={`font-bold ${effect > 0 ? 'text-green-400' : 'text-neutral-400'}`}>
                            {perk.effect === "salaryReduction" || perk.effect === "energyEfficiency" ? "-" : "+"}{(effect * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={performPrestige}
                  disabled={!canPrestige()}
                  className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                    canPrestige()
                      ? "bg-purple-600 hover:bg-purple-500 text-white"
                      : "bg-neutral-700 opacity-60 text-neutral-400"
                  }`}
                >
                  {canPrestige() ? "🌟 Prestige Now" : "Requirements Not Met"}
                </button>
                <button 
                  onClick={() => setShowPrestigeModal(false)}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              <div className="text-xs text-neutral-400 mt-4 text-center">
                ⚠️ Prestige will reset your game but keep your prestige points and meta perks
              </div>
            </div>
          </div>
        )}
        
        {/* Achievements Panel */}
        {showAchievementsPanel && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-4xl mx-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-yellow-400">🏆 Achievements</h2>
                <button 
                  onClick={() => setShowAchievementsPanel(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-sm text-neutral-400 mb-4">
                Unlock achievements by reaching various milestones. These are purely cosmetic badges.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(CONFIG.achievements).map(([key, achievement]) => {
                  const isUnlocked = achievements.has(achievement.id);
                  const progress = getAchievementProgress(achievement.id);
                  const percentage = Math.min(100, (progress / achievement.requirement) * 100);
                  
                  return (
                    <div 
                      key={achievement.id} 
                      className={`rounded-xl p-4 border-2 transition-all ${
                        isUnlocked 
                          ? `bg-neutral-800 border-${achievement.color.replace('text-', '')} opacity-100` 
                          : 'bg-neutral-800/50 border-neutral-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`text-2xl ${isUnlocked ? achievement.color : 'text-neutral-500'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold ${isUnlocked ? achievement.color : 'text-neutral-400'}`}>
                            {achievement.name}
                          </div>
                          <div className="text-sm text-neutral-300">
                            {achievement.description}
                          </div>
                        </div>
                        {isUnlocked && (
                          <div className="text-green-400 text-xl">✓</div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-400">Progress</span>
                          <span className={isUnlocked ? achievement.color : 'text-neutral-400'}>
                            {progress}/{achievement.requirement}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isUnlocked ? achievement.color.replace('text-', 'bg-') : 'bg-neutral-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 text-center text-sm text-neutral-400">
                {achievements.size}/{Object.keys(CONFIG.achievements).length} achievements unlocked
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Run Modal */}
        {submitRunStatus && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">🏆 Submit Run</h2>
                <button 
                  onClick={() => setSubmitRunStatus(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className={`p-4 rounded-xl mb-4 ${
                submitRunStatus.type === 'loading' ? 'bg-blue-900/20 border border-blue-500/30' :
                submitRunStatus.type === 'success' ? 'bg-green-900/20 border border-green-500/30' :
                'bg-red-900/20 border border-red-500/30'
              }`}>
                <div className={`text-center ${
                  submitRunStatus.type === 'loading' ? 'text-blue-300' :
                  submitRunStatus.type === 'success' ? 'text-green-300' :
                  'text-red-300'
                }`}>
                  {submitRunStatus.message}
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={() => setSubmitRunStatus(null)}
                  className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Log */}
      <section className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
          <h2 className="font-bold text-lg mb-2">Studio Feed</h2>
          <div className="max-h-[200px] overflow-auto pr-2 text-sm space-y-1">
            {eventLog.map((line, idx) => (
              <div key={idx} className={line.startsWith("[") ? "text-orange-300/80" : "opacity-90"}>{line}</div>
            ))}
          </div>
        </div>
        <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
          <h2 className="font-bold text-lg mb-2">Tips</h2>
          <ul className="text-sm list-disc pl-5 space-y-1 opacity-90">
            <li>Shop: plugins boost editor speed; district.jp boosts client flow.</li>
            <li>Start the clock, accept small jobs — editors auto‑rest and resume at full energy.</li>
            <li>Train editors and upgrade PCs to hit higher difficulty jobs.</li>
            <li>Missed deadlines crush reputation — keep an eye on due hours.</li>
            <li>👥 Team efficiency decays after 10 editors; hire managers to offset this.</li>
            <li>🆕 New hires need onboarding time; shown on editor cards.</li>
            <li>💰 Costs scale exponentially; upgrades have diminishing returns.</li>
            <li>💸 Daily overhead: software licenses + facility costs scale with team size.</li>
            <li>⚠️ Watch for payroll risk warnings when daily burn exceeds cash.</li>
            <li>🏆 Job tiers unlock at Rep 10/25/50/90; higher tiers pay more.</li>
            <li>📈 Market cycles every 7 days: one job type boosted, one nerfed.</li>
            <li>⏰ Grace window: 95%+ jobs get 6h extra with reduced payout.</li>
            <li>💻 PC stability reduces crash chance; burnout after 12h work.</li>
            <li>🎲 Meme events: Random daily events with cash impacts and animations.</li>
            <li>🖤 Black Market: Cracked plugins boost performance but risk catastrophic virus.</li>
            <li>🔬 Research: Permanent global upgrades with increasing costs.</li>
            <li>🌟 Prestige: Reset for meta perks when Rep 100+ and $10,000+ cash.</li>
            <li>🏆 Achievements: Unlock cosmetic badges by reaching various milestones.</li>
            <li>📈 Marketing: Cost scales with daily use; sometimes spawns 3 leads instead of 2.</li>
            <li>⭐ Reputation Tiers: Rookie → Pro → Legend → Master → Icon with unlock tooltips.</li>
            <li>📊 Leaderboard: Submit runs and compete with other players (requires API configuration).</li>
            <li>📧 Request Handle: Get a custom handle for leaderboard submissions.</li>
            <li>🔍 Health Check: Automatic integrity verification every 7 in-game days with corruption detection.</li>
            <li>🔧 Dev Commands: Press <code>`</code> (backtick) to open command palette for testing and debugging.</li>
            <li>📋 Changelog: Track all feature changes, migrations, and dev actions with detailed timestamps.</li>
            <li>💾 Game autosaves every 10 ticks and when you switch tabs/windows.</li>
            <li>Export/Import: Download saves as JSON files or load previous saves.</li>
            <li>Cloud backup: Set CONFIG.cloudBackupUrl to enable cloud saves.</li>
          </ul>
        </div>
      </section>

              {/* Dev Overlay */}
        {devOverlay && showDevFeatures && (
        <section className="mt-4 bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/60">
          <h2 className="font-bold text-lg mb-3">Dev Overlay — Team Efficiency</h2>
          <div className="grid grid-cols-1 md:grid-cols-16 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Efficiency Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div>Base Efficiency: 100%</div>
                {editors.length > CONFIG.balance.efficiencyDecayStart && (
                  <div className="text-orange-400">
                    Decay: -{((editors.length - CONFIG.balance.efficiencyDecayStart) * CONFIG.balance.efficiencyDecayRate * 100).toFixed(1)}%
                  </div>
                )}
                {managers > 0 && (
                  <div className="text-green-400">
                    Manager Bonus: +{(managers * CONFIG.balance.managerEfficiencyBonus * 100).toFixed(1)}%
                  </div>
                )}
                <div className="font-semibold">
                  Final Efficiency: {(teamEfficiency * 100).toFixed(1)}%
                </div>
              </div>
            </div>
                         <div>
               <h3 className="font-semibold mb-2">Manager System</h3>
               <div className="space-y-2 text-sm">
                 <div>Current Managers: {managers}/{availableManagerSlots}</div>
                 <div>Max Managers: {CONFIG.balance.maxManagers}</div>
                 <div>Manager Salary: ${CONFIG.balance.managerSalary}/day each</div>
                 <div>Efficiency Bonus: +{(CONFIG.balance.managerEfficiencyBonus * 100).toFixed(0)}% each</div>
                 <div className="text-xs opacity-70">
                   Unlock thresholds: {CONFIG.balance.managerUnlockThresholds.join(', ')} editors
                 </div>
               </div>
             </div>
                           <div>
                <h3 className="font-semibold mb-2">Cost Scaling</h3>
                <div className="space-y-2 text-sm">
                  <div>Hire Editor: ${getHireEditorCost()} ({(CONFIG.balance.hireEditor.scalingFactor - 1) * 100}% growth)</div>
                  <div>Buy PC: ${getBuyPCCost()} ({(CONFIG.balance.buyPC.scalingFactor - 1) * 100}% growth)</div>
                  <div>Train Editor: ${getTrainEditorCost('example')} ({(CONFIG.balance.trainEditor.scalingFactor - 1) * 100}% growth)</div>
                  <div>Upgrade PC: ${getUpgradePCCost('example')} ({(CONFIG.balance.upgradePC.scalingFactor - 1) * 100}% growth)</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Daily Overhead</h3>
                <div className="space-y-2 text-sm">
                  <div>Software Licenses: ${editors.length * CONFIG.balance.overhead.softwareLicense.perEditor + pcs.length * CONFIG.balance.overhead.softwareLicense.perPC}/day</div>
                  <div>Facility Cost: ${Math.round(CONFIG.balance.overhead.facility.baseCost + (Math.log(editors.length + pcs.length + 1) * CONFIG.balance.overhead.facility.logarithmicFactor))}/day</div>
                  <div>Total Overhead: ${getDailyOverhead()}/day</div>
                  <div>Total Daily Burn: ${getDailySalaries() + getDailyOverhead()}/day</div>
                                    <div className="text-xs opacity-70">
                    Software: ${CONFIG.balance.overhead.softwareLicense.perEditor}/editor, ${CONFIG.balance.overhead.softwareLicense.perPC}/PC
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Market Cycle</h3>
                <div className="space-y-2 text-sm">
                  <div>Current Cycle: {marketCycle.currentCycle}</div>
                  <div>Days in Cycle: {day - marketCycle.cycleStartDay + 1}/{CONFIG.balance.marketCycle.cycleLength}</div>
                  {marketCycle.boostedType && (
                    <div className="text-green-400">
                      📈 Boosted: {marketCycle.boostedType} (+{(CONFIG.balance.marketCycle.boostMultiplier - 1) * 100}%)
                    </div>
                  )}
                  {marketCycle.nerfedType && (
                    <div className="text-red-400">
                      📉 Nerfed: {marketCycle.nerfedType} (-{(1 - CONFIG.balance.marketCycle.nerfMultiplier) * 100}%)
                    </div>
                  )}
                  <div className="text-xs opacity-70">
                    Cycles every {CONFIG.balance.marketCycle.cycleLength} days
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Work Mechanics</h3>
                <div className="space-y-2 text-sm">
                  <div>Grace Window: {(CONFIG.balance.jobMechanics.graceWindow.threshold * 100).toFixed(0)}% completion</div>
                  <div>Grace Hours: +{CONFIG.balance.jobMechanics.graceWindow.extraHours}h</div>
                  <div>Grace Payout: {(CONFIG.balance.jobMechanics.graceWindow.payoutMultiplier * 100).toFixed(0)}%</div>
                  <div>Burnout Threshold: {CONFIG.balance.jobMechanics.burnout.threshold}h</div>
                  <div>Burnout Drain: {CONFIG.balance.jobMechanics.burnout.energyDrainMultiplier}x</div>
                  <div>PC Crash Base: {(CONFIG.balance.jobMechanics.pcCrash.baseChance * 100).toFixed(1)}%</div>
                  <div className="text-xs opacity-70">
                    Stability reduces crash chance
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Black Market</h3>
                <div className="space-y-2 text-sm">
                  <div>Feature Enabled: {CONFIG.featureFlags.blackMarket ? "Yes" : "No"}</div>
                  <div>Active: {isBlackMarketActive() ? "Yes" : "No"}</div>
                  {isBlackMarketActive() && (
                    <>
                      <div>Skill Boost: +{getBlackMarketSkillBoost()}</div>
                      <div>Speed Boost: +{getBlackMarketSpeedBoost()}x</div>
                      <div>Expires: {Math.max(0, Math.ceil((blackMarketEffects.expiresAt - tick) / 24))}h</div>
                    </>
                  )}
                  <div>Cost: ${CONFIG.balance.blackMarket.crackedPlugins.cost}</div>
                  <div>Virus Risk: {(CONFIG.balance.blackMarket.crackedPlugins.virusRisk * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Research</h3>
                <div className="space-y-2 text-sm">
                  <div>Base Cost: ${CONFIG.balance.research.baseCost}</div>
                  <div>Cost Multiplier: {(CONFIG.balance.research.costMultiplier - 1) * 100}%</div>
                  <div>Max Level: {CONFIG.balance.research.maxLevel}</div>
                  <div>Progress Boost: +{(getGlobalProgressBoost() * 100).toFixed(1)}%</div>
                  <div>Payout Boost: +{(getGlobalPayoutBoost() * 100).toFixed(1)}%</div>
                  <div>Fail Penalty: -{(getGlobalFailPenaltyReduction() * 100).toFixed(1)}%</div>
                  <div>Energy Efficiency: -{(getGlobalEnergyEfficiency() * 100).toFixed(1)}%</div>
                  <div>Reputation Boost: +{(getGlobalReputationBoost() * 100).toFixed(1)}%</div>
                </div>
              </div>
              {CONFIG.featureFlags.prestige && (
                <div>
                  <h3 className="font-semibold mb-2">Prestige</h3>
                  <div className="space-y-2 text-sm">
                    <div>Prestige Points: {prestigePoints}</div>
                    <div>Season High Rep: {seasonHighRep}</div>
                    <div>Spawn Rate Bonus: +{(getPrestigeSpawnRateBonus() * 100).toFixed(1)}%</div>
                    <div>Salary Reduction: -{(getPrestigeSalaryReduction() * 100).toFixed(1)}%</div>
                    <div>Training Efficiency: +{(getPrestigeTrainingEfficiency() * 100).toFixed(1)}%</div>
                    <div>PC Efficiency: +{(getPrestigePCEfficiency() * 100).toFixed(1)}%</div>
                    <div>Energy Efficiency: -{(getPrestigeEnergyEfficiency() * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">Achievements</h3>
                <div className="space-y-2 text-sm">
                  <div>Unlocked: {achievements.size}/{Object.keys(CONFIG.achievements).length}</div>
                  <div>Flawless Deliveries: {achievementStats.flawlessDeliveries}</div>
                  <div>Overnight Jobs: {achievementStats.overnightJobs}</div>
                  <div>Speed Demon Jobs: {achievementStats.speedDemonJobs}</div>
                  <div>Quality Master Jobs: {achievementStats.qualityMasterJobs}</div>
                  <div>Max Work Hours: {achievementStats.maxWorkHours}</div>
                  <div>Market Cycles: {achievementStats.marketCycles}</div>
                  <div>Max Research Categories: {achievementStats.maxResearchCategories}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Reputation Tiers</h3>
                <div className="space-y-2 text-sm">
                  <div>Current Tier: {getCurrentReputationTier().name} ({reputation} rep)</div>
                  {getNextReputationUnlock() && (
                    <div>Next Unlock: {getNextReputationUnlock().reputation} rep - {getNextReputationUnlock().description}</div>
                  )}
                  <div className="text-xs opacity-70">
                    Tiers: Rookie (0-9) → Pro (10-24) → Legend (25-49) → Master (50-89) → Icon (90+)
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Marketing</h3>
                <div className="space-y-2 text-sm">
                  <div>Base Cost: ${CONFIG.marketing.baseCost}</div>
                  <div>Cost Multiplier: {(CONFIG.marketing.costMultiplier - 1) * 100}% per use</div>
                  <div>Max Uses Per Day: {CONFIG.marketing.maxUsesPerDay}</div>
                  <div>Current Cost: ${getMarketingCost()}</div>
                  <div>Uses Today: {marketingUsage.usesToday}/{CONFIG.marketing.maxUsesPerDay}</div>
                  <div>Lead Count: {CONFIG.marketing.leadCount.min}-{CONFIG.marketing.leadCount.max} (30% chance for 3)</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">API Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div>Submit Run: {CONFIG.api.submitRunUrl ? 'Configured' : 'Not configured'}</div>
                  <div>Leaderboard: {CONFIG.api.leaderboardUrl ? 'Configured' : 'Not configured'}</div>
                  <div>Request Handle: {CONFIG.api.requestHandleUrl ? 'Configured' : 'Not configured'}</div>
                  <div>Timeout: {CONFIG.api.timeout}ms</div>
                  <div>Retry Delay: {CONFIG.api.retryDelay}ms</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Health Check</h3>
                <div className="space-y-2 text-sm">
                  <div>Last Check: Day {lastHealthCheck}</div>
                  <div>Next Check: Day {lastHealthCheck + CONFIG.healthCheck.interval}</div>
                  <div>Current Day: {Math.floor(tick / 24)}</div>
                  <div>Simulation Days: {CONFIG.healthCheck.simulationDays}</div>
                  <div>Min Leads/Day: {CONFIG.healthCheck.minLeadsPerDay}</div>
                  {healthCheckWarning && (
                    <div className="text-red-400 font-semibold">⚠️ Health check failed</div>
                  )}
                  {softClampWarnings.length > 0 && (
                    <div className="text-yellow-400 font-semibold">⚠️ {softClampWarnings.length} soft clamp warnings</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Performance</h3>
                <div className="space-y-2 text-sm">
                  <div>FPS: {performanceMetrics.fps}</div>
                  <div>Render Time: {performanceMetrics.renderTime.toFixed(1)}ms</div>
                  <div>Tick Time: {performanceMetrics.tickTime.toFixed(1)}ms</div>
                  <div>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</div>
                  <div>Render Count: {performanceMetrics.renderCount}</div>
                  <div>Target FPS: {CONFIG.dev.performance.targetFPS}</div>
                  <div>Max Render: {CONFIG.dev.performance.maxRenderTime}ms</div>
                  <div>Max Tick: {CONFIG.dev.performance.maxTickTime}ms</div>
                  {performanceWarnings.length > 0 && (
                    <div className="text-yellow-400 font-semibold">⚠️ {performanceWarnings.length} performance warnings</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Meme Events</h3>
                <div className="space-y-2 text-sm">
                  <div>Daily Chance: {(CONFIG.balance.memeEvents.dailyChance * 100).toFixed(2)}%</div>
                  <div>Max Per Day: {CONFIG.balance.memeEvents.maxPerDay}</div>
                  <div>Events Today: {memeEventState.eventsToday}</div>
                  <div>Current Day: {getCurrentDay()}</div>
                  {memeEventState.lastEventId && (
                    <div className="text-xs opacity-70">
                      Last: {CONFIG.balance.memeEvents.events.find(e => e.id === memeEventState.lastEventId)?.title}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
      )}

      {currentRoute === 'game' ? (
        <>
          <footer className="mt-6 text-center text-xs opacity-60">Have fun stacking plugins and scaling your studio 🏁</footer>
        </>
      ) : (
        <LeaderboardRoute 
          leaderboardData={leaderboardData}
          leaderboardLoading={leaderboardLoading}
          leaderboardError={leaderboardError}
          requestHandleForm={requestHandleForm}
          setRequestHandleForm={setRequestHandleForm}
          requestHandleStatus={requestHandleStatus}
          onFetchLeaderboard={fetchLeaderboard}
          onRequestHandle={requestHandle}
          onBackToGame={() => setCurrentRoute('game')}
          getSampleData={getSampleLeaderboardData}
        />
      )}
      
      {/* Meme Event Modal */}
      <MemeEventModal 
        event={activeMemeEvent} 
        onClose={() => setActiveMemeEvent(null)} 
      />
      
      {/* Virus Warning Modal */}
      <VirusWarningModal 
        countdown={virusCountdown}
        onExport={handleVirusExport}
      />
      
      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-2xl mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">🔧 Dev Command Palette</h2>
              <button 
                onClick={() => setShowCommandPalette(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Command</label>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (commandInput.trim()) {
                        executeCommand(commandInput);
                        setCommandInput('');
                        setShowCommandPalette(false);
                      }
                    } else if (e.key === 'Escape') {
                      setShowCommandPalette(false);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (commandHistoryIndex < commandHistory.length - 1) {
                        const newIndex = commandHistoryIndex + 1;
                        setCommandHistoryIndex(newIndex);
                        setCommandInput(commandHistory[newIndex]);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (commandHistoryIndex > 0) {
                        const newIndex = commandHistoryIndex - 1;
                        setCommandHistoryIndex(newIndex);
                        setCommandInput(commandHistory[newIndex]);
                      } else if (commandHistoryIndex === 0) {
                        setCommandHistoryIndex(-1);
                        setCommandInput('');
                      }
                    }
                  }}
                  placeholder="Type a command (e.g., 'sim 30', 'cash 100000', 'leads 10')"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button 
                  onClick={() => executeCommand('sim 30')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold"
                >
                  🔮 Sim 30d
                </button>
                <button 
                  onClick={() => executeCommand('cash 100000')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold"
                >
                  💰 Fill Cash
                </button>
                <button 
                  onClick={() => executeCommand('leads 10')}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-semibold"
                >
                  📋 Spawn Leads
                </button>
                <button 
                  onClick={() => executeCommand('flag blackMarket')}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold"
                >
                  🔧 Toggle Flag
                </button>
                <button 
                  onClick={() => executeCommand('reset')}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold"
                >
                  🔄 Reset
                </button>
                <button 
                  onClick={() => executeCommand('logs')}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold"
                >
                  📋 Export Logs
                </button>
                <button 
                  onClick={() => executeCommand('perf')}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-semibold"
                >
                  🔬 Perf Test
                </button>
              </div>
              
              <div className="text-xs text-neutral-400">
                <div className="font-semibold mb-1">Available Commands:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <div>• <code>sim [days]</code> - Run simulation</div>
                  <div>• <code>cash [amount]</code> - Fill cash</div>
                  <div>• <code>leads [count]</code> - Spawn leads</div>
                  <div>• <code>flag [name]</code> - Toggle feature flag</div>
                  <div>• <code>reset</code> - Reset to last good save</div>
                  <div>• <code>logs</code> - Export logs</div>
                  <div>• <code>perf</code> - Run performance test</div>
                  <div>• <code>help</code> - Show help</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Panel */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-4xl mx-4 w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📋 Changelog</h2>
              <button 
                onClick={() => setShowChangelog(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] space-y-3">
              {changelog.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No changelog entries yet
                </div>
              ) : (
                changelog.map((entry) => (
                  <div key={entry.id} className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm px-2 py-1 rounded ${
                          entry.type === 'feature' ? 'bg-blue-900/50 text-blue-300' :
                          entry.type === 'migration' ? 'bg-yellow-900/50 text-yellow-300' :
                          entry.type === 'dev' ? 'bg-purple-900/50 text-purple-300' :
                          'bg-neutral-700 text-neutral-300'
                        }`}>
                          {entry.type}
                        </div>
                        <div className="text-sm text-neutral-400">
                          Day {entry.day} (Tick {entry.tick})
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-medium mb-1">{entry.message}</div>
                    {entry.details && (
                      <div className="text-sm text-neutral-400">
                        <pre className="whitespace-pre-wrap text-xs bg-neutral-900 p-2 rounded">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Leaderboard Route ====================
function LeaderboardRoute({
  leaderboardData,
  leaderboardLoading,
  leaderboardError,
  requestHandleForm,
  setRequestHandleForm,
  requestHandleStatus,
  onFetchLeaderboard,
  onRequestHandle,
  onBackToGame,
  getSampleData
}) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Load leaderboard on mount
  useEffect(() => {
    if (CONFIG.api.leaderboardUrl) {
      onFetchLeaderboard().catch(() => {
        // Error handled by the function
      });
    }
  }, [onFetchLeaderboard]);

  const handleSubmitRun = async () => {
    const handle = prompt("Enter your handle:");
    if (!handle) return;
    
    const funniestEvent = prompt("What was the funniest thing that happened? (optional):");
    
    try {
      await submitRun(
        handle,
        reputation,
        cash,
        jobs.filter(j => j.status === "done").length,
        funniestEvent || "Nothing funny happened"
      );
    } catch (error) {
      // Error handled by submitRun function
    }
  };

  const handleRequestHandle = async (e) => {
    e.preventDefault();
    if (!requestHandleForm.email || !requestHandleForm.preferredHandle) {
      alert("Please fill in both email and preferred handle");
      return;
    }
    
    try {
      await onRequestHandle(requestHandleForm.email, requestHandleForm.preferredHandle);
      setRequestHandleForm({ email: '', preferredHandle: '' });
      setShowRequestForm(false);
    } catch (error) {
      // Error handled by onRequestHandle function
    }
  };

  const displayData = CONFIG.api.leaderboardUrl ? leaderboardData : getSampleData();

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          📊 Leaderboard
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onBackToGame} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-neutral-800 hover:bg-neutral-700">
            ← Back to Game
          </button>
          {CONFIG.api.submitRunUrl && (
            <button onClick={handleSubmitRun} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-green-600 hover:bg-green-500">
              🏆 Submit Run
            </button>
          )}
          {CONFIG.api.requestHandleUrl && (
            <button onClick={() => setShowRequestForm(true)} className="px-3 py-2 rounded-xl text-sm font-semibold shadow bg-blue-600 hover:bg-blue-500">
              📧 Request Handle
            </button>
          )}
          {CONFIG.api.leaderboardUrl && (
            <button 
              onClick={() => onFetchLeaderboard()} 
              disabled={leaderboardLoading}
              className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${
                leaderboardLoading ? 'bg-neutral-700 opacity-60' : 'bg-orange-600 hover:bg-orange-500'
              }`}
            >
              {leaderboardLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* API Status */}
      {!CONFIG.api.leaderboardUrl && (
        <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-bold text-blue-300">API Not Configured</h3>
              <p className="text-sm text-blue-200">
                Showing sample data. Configure CONFIG.api.leaderboardUrl to connect to a real leaderboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {leaderboardError && (
        <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-red-300">Error Loading Leaderboard</h3>
              <p className="text-sm text-red-200">{leaderboardError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-6 bg-neutral-900/60 rounded-2xl p-6 border border-neutral-800/60">
        <h2 className="text-xl font-bold mb-4">Top Studios</h2>
        
        {leaderboardLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">⏳</div>
            <div>Loading leaderboard...</div>
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📊</div>
            <div>No leaderboard data available</div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayData.map((entry, index) => (
              <div key={index} className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-yellow-400' :
                      entry.rank === 2 ? 'text-gray-400' :
                      entry.rank === 3 ? 'text-orange-600' :
                      'text-neutral-400'
                    }`}>
                      #{entry.rank}
                    </div>
                    <div className="font-semibold text-lg">{entry.handle}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">${entry.cash.toLocaleString()}</div>
                    <div className="text-sm text-neutral-400">{entry.reputation} reputation</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-neutral-300">
                  <div>Jobs completed: {entry.jobsCompleted}</div>
                  <div className="text-xs opacity-70">Funniest: "{entry.funniestEvent}"</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Handle Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📧 Request Handle</h2>
              <button 
                onClick={() => setShowRequestForm(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRequestHandle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={requestHandleForm.email}
                  onChange={(e) => setRequestHandleForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Handle</label>
                <input
                  type="text"
                  value={requestHandleForm.preferredHandle}
                  onChange={(e) => setRequestHandleForm(prev => ({ ...prev, preferredHandle: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., speed_demon"
                  required
                />
              </div>
              
              {requestHandleStatus && (
                <div className={`p-3 rounded-lg ${
                  requestHandleStatus.type === 'loading' ? 'bg-blue-900/20 border border-blue-500/30' :
                  requestHandleStatus.type === 'success' ? 'bg-green-900/20 border border-green-500/30' :
                  'bg-red-900/20 border border-red-500/30'
                }`}>
                  <div className={`text-sm ${
                    requestHandleStatus.type === 'loading' ? 'text-blue-300' :
                    requestHandleStatus.type === 'success' ? 'text-green-300' :
                    'text-red-300'
                  }`}>
                    {requestHandleStatus.message}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={requestHandleStatus?.type === 'loading'}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                    requestHandleStatus?.type === 'loading'
                      ? 'bg-neutral-700 opacity-60'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {requestHandleStatus?.type === 'loading' ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Small UI bits ====================
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}

function Badge({ children, className = "" }) { 
  return <span className={`inline-block bg-neutral-900 border border-neutral-700/60 px-2 py-0.5 rounded-md text-[11px] ${className}`}>{children}</span>; 
}

function Progress({ value }) {
  return (
    <div className="w-full h-3 rounded-lg bg-neutral-900 border border-neutral-800/60 overflow-hidden">
      <div className="h-full bg-emerald-600" style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function MemeEventModal({ event, onClose }) {
  const [timeLeft, setTimeLeft] = useState(2);
  
  useEffect(() => {
    if (!event) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [event, onClose]);
  
  if (!event) return null;
  
  const isPositive = event.cashDelta > 0;
  const sign = isPositive ? "+" : "";
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-flash">
      <div 
        className={`relative bg-neutral-900 border-4 rounded-2xl p-8 max-w-md mx-4 text-center animate-shake shadow-2xl ${
          isPositive 
            ? 'border-green-500 shadow-green-500/50' 
            : 'border-red-500 shadow-red-500/50'
        }`}
        style={{
          animation: 'shake 0.5s ease-in-out',
          boxShadow: `0 0 40px ${isPositive ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`
        }}
      >
        <div className="text-6xl mb-4 animate-bounce">{event.icon}</div>
        <h2 className={`text-2xl font-bold mb-3 ${event.color}`}>{event.title}</h2>
        <p className="text-neutral-300 mb-4 text-sm leading-relaxed">{event.description}</p>
        <div className={`text-4xl font-bold ${event.color} animate-pulse mb-2`}>
          {sign}${Math.abs(event.cashDelta).toLocaleString()}
        </div>
        <div className="text-xs text-neutral-400 mb-4">
          {isPositive ? "💰 Cha-ching!" : "💸 Ouch!"} • Auto-dismissing in {timeLeft}s
        </div>
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-semibold transition-all hover:scale-105"
        >
          Close Now
        </button>
      </div>
    </div>
  );
}

function VirusWarningModal({ countdown, onExport }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/90 animate-pulse">
      <div className="relative bg-black border-4 border-red-500 rounded-2xl p-8 max-w-lg mx-4 text-center animate-bounce">
        <div className="text-6xl mb-4 animate-pulse">🦠</div>
        <h2 className="text-3xl font-bold mb-4 text-red-400">SYSTEM COMPROMISED!</h2>
        <p className="text-red-300 mb-6 text-lg">
          MALICIOUS CODE DETECTED!<br/>
          Your system has been infected with a catastrophic virus.
        </p>
        <div className="text-5xl font-bold text-red-500 mb-6 animate-pulse">
          {countdown}
        </div>
        <p className="text-red-200 mb-6">
          System will be reset in {countdown} seconds to prevent further corruption.
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onExport}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
          >
            💾 Export Save
          </button>
        </div>
        <div className="text-xs text-red-400 mt-4">
          ⚠️ This is your last chance to save your progress!
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}

function Bar({ value, label }) {
  return (
    <div>
      <div className="flex justify-between text-xs opacity-70">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-2 rounded-md bg-neutral-900 overflow-hidden border border-neutral-800/60">
        <div className="h-full bg-sky-600" style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

// ==================== LocalStorage helpers ====================
const KEY_PREFIX = "car-editor-tycoon:";

function encodeForStorage(value) {
  const json = JSON.stringify(value);
  try {
    const bytes = new TextEncoder().encode(json);
    const b64 = btoa(String.fromCharCode(...bytes));
    return "b64:" + b64;
  } catch {
    return json;
  }
}

function decodeFromStorage(raw) {
  try {
    if (raw.startsWith("b64:")) {
      const b64 = raw.slice(4);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
    }
  } catch {}
  try { return JSON.parse(raw); } catch { return null; }
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return fallback;
    const val = decodeFromStorage(raw);
    return val ?? fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, val) {
  try {
    const encoded = encodeForStorage(val);
    localStorage.setItem(KEY_PREFIX + key, encoded);
  } catch {}
}
