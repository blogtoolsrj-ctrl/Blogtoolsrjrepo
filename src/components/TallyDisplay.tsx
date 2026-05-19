
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TallyDisplayProps {
  tally: Record<string, number>;
}

export const TallyDisplay: React.FC<TallyDisplayProps> = ({ tally }) => {
  const entries = Object.entries(tally).filter(([_, count]) => count > 0);

  if (entries.length === 0) {
    return <div className="p-8 text-center text-muted-foreground bg-secondary/20 rounded-lg border border-dashed">No PC trips detected</div>;
  }

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-background">
      <Table>
        <TableHeader className="bg-secondary/50">
          <TableRow>
            <TableHead className="font-headline uppercase text-xs">Standard PC ID</TableHead>
            <TableHead className="text-right font-headline uppercase text-xs">Trip Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([pc, count]) => (
            <TableRow key={pc} className="hover:bg-secondary/30">
              <TableCell className="font-mono font-medium">{pc}</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className="border-accent text-accent">
                  {count} trips
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
