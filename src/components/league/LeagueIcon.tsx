import { Trophy, Flag, Shield, Star, Zap, Flame, Target, Crown, Rocket, Swords } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flag: Flag,
  shield: Shield,
  star: Star,
  zap: Zap,
  flame: Flame,
  target: Target,
  crown: Crown,
  rocket: Rocket,
  swords: Swords,
};

export function LeagueIcon({ iconName, className = "h-5 w-5 text-white" }: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName.toLowerCase()];
  if (!Icon) return null;
  return <Icon className={className} />;
}
