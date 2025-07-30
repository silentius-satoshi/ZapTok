export interface ZapOption {
  amount: number;
  emoji: string;
  message: string;
}

export const defaultZapOptions: ZapOption[] = [
  { amount: 21, emoji: "👍", message: "Great post 👍" },
  { amount: 420, emoji: "🚀", message: "Let's go 🚀" },
  { amount: 1000, emoji: "☕", message: "Coffee on me ☕" },
  { amount: 5000, emoji: "🍻", message: "Cheers 🍻" },
  { amount: 10000, emoji: "🍷", message: "Party time 🍷" },
  { amount: 100000, emoji: "👑", message: "Generational wealth 👑" },
];

export const defaultZap: ZapOption = {
  amount: 21,
  emoji: "⚡",
  message: "Zap!"
};
