import {
  Box,
  BriefcaseBusiness,
  Camera,
  ChartLine,
  Cpu,
  Heart,
  Image,
  Plane,
  Rocket,
  Utensils,
} from "lucide-react";

const ICONS = {
  briefcase: BriefcaseBusiness,
  chart: ChartLine,
  utensils: Utensils,
  image: Image,
  heart: Heart,
  camera: Camera,
  box: Box,
  rocket: Rocket,
  cpu: Cpu,
  plane: Plane,
} as const;

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? BriefcaseBusiness;
  return <Icon className={className} />;
}
