export const challenges = [
  "Afraid to sleep alone",
  "Bedtime resistance",
  "Tantrums",
  "Biting or hitting",
  "Jealous of sibling",
  "Fear of daycare",
  "Separation anxiety",
  "Doctor fear",
  "Confidence building",
  "Moving house",
  "Giving up pacifier",
  "Potty training"
];

export const challengeExamples = challenges;

export const toneOptions = [
  { value: "magical", id: "magical", label: "Magical", description: "Sparkly, wondrous, emotionally soft" },
  { value: "funny", id: "funny", label: "Funny", description: "Playful, silly, lighthearted" },
  { value: "calming", id: "calming", label: "Calming", description: "Gentle, slow, sleep-ready" },
  { value: "brave", id: "brave", label: "Brave", description: "Empowering, confident, adventurous" }
] as const;

export const tones = toneOptions;

export const lengthOptions = [
  { value: "short", id: "short", label: "Short", words: "350-500 words" },
  { value: "medium", id: "medium", label: "Medium", words: "700-900 words" },
  { value: "long", id: "long", label: "Long", words: "1100-1400 words" }
] as const;

export const lengths = lengthOptions;

export const storyExamples = [
  {
    title: "Luna and the Sleepy Moon Fox",
    challenge: "Sleeping alone",
    preview:
      "When Luna met a silver fox who guarded the moon pillows, she learned her room could feel brave, cozy, and full of tiny night lights."
  },
  {
    title: "Max and the Dragon Who Forgot to Roar",
    challenge: "Tantrums",
    preview:
      "Max helps a little dragon find words for big feelings before the volcano in his tummy gets too loud."
  },
  {
    title: "Mia's Kindergarten Star Map",
    challenge: "Daycare fear",
    preview:
      "Mia follows a trail of friendly stars to discover that goodbye can be small, safe, and temporary."
  }
];

export const exampleStories = storyExamples;

export const testimonials = [
  {
    name: "Ava, mom of two",
    quote:
      "My daughter asked for her bravery fox story three nights in a row. It gave us language for bedtime fear."
  },
  {
    name: "Nora, first-time parent",
    quote:
      "The parent note was the difference. I knew exactly what to say when the tantrum started."
  },
  {
    name: "Sofia, daycare transition",
    quote:
      "The story made goodbye feel safe instead of scary. We printed it and packed it in his bag."
  }
];

export const pricingPlans = [
  {
    name: "Free Preview",
    price: "$0",
    description: "Try one short personalized story preview.",
    features: ["Short preview", "Parent explanation", "Shareable story link"]
  },
  {
    name: "Premium Story",
    price: "$7",
    description: "Unlock the full story and parenting guide.",
    features: ["Full custom story", "Real-life parent plan", "Printable keepsake", "Audio-ready script"]
  },
  {
    name: "Bedtime Club",
    price: "$19/mo",
    description: "Weekly new stories for recurring challenges.",
    features: ["4 premium stories monthly", "Weekly recommendations", "Bedtime streaks", "Priority advice"]
  }
];

export const retentionLoops = [
  {
    title: "Saved story library",
    copy:
      "Every generated story becomes a keepsake parents can revisit, print, narrate, or turn into a themed pack."
  },
  {
    title: "Weekly recommendations",
    copy:
      "The next story theme is suggested from the child's challenge, age, and previous emotional skill."
  },
  {
    title: "Email reminders and streaks",
    copy:
      "Bedtime nudges, streak celebrations, and seasonal prompts keep the ritual alive without feeling pushy."
  }
];
