
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subLabel?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, subLabel }) => {
  return (
    <Card className="bg-secondary/50 border-border/50 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-background border border-border shadow-sm">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-headline font-bold truncate">
            {value}
          </p>
          {subLabel && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">
              {subLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
