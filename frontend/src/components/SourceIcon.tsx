import {
  HardDrive,
  Trello,
  Mail,
  Cloud,
  Calendar,
  type LucideProps,
} from 'lucide-react';
import type { SearchSource } from '../types/search.types';

interface SourceIconProps extends Omit<LucideProps, 'ref'> {
  source: SearchSource;
}

/**
 * Returns the appropriate icon for a search source
 */
export function SourceIcon({ source, ...props }: SourceIconProps) {
  switch (source) {
    case 'Google Drive':
      return <HardDrive {...props} />;
    case 'Trello':
      return <Trello {...props} />;
    case 'Gmail':
      return <Mail {...props} />;
    case 'OneDrive':
      return <Cloud {...props} />;
    case 'Google Calendar':
      return <Calendar {...props} />;
    default:
      return <HardDrive {...props} />;
  }
}
