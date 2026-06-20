import { NavigationDropdown, printingItems, referenceItems } from '@dorkroom/ui';
import { BookOpen, Printer } from 'lucide-react';
import { useState } from 'react';

// The desktop nav category trigger, fed the app's real "Printing" items. Closed
// (resting) state — clicking opens the rich item panel with summaries.
export const PrintingCategory = () => {
  const [path, setPath] = useState('/border');
  return (
    <div style={{ maxWidth: 280 }}>
      <NavigationDropdown
        label="Printing"
        icon={Printer}
        items={printingItems}
        currentPath={path}
        onNavigate={setPath}
      />
    </div>
  );
};

// Active state: the trigger fills in when the current route belongs to this
// category (here /reciprocity lives under a Film/Reference grouping example).
export const ActiveTrigger = () => {
  const [path, setPath] = useState('/films');
  return (
    <div style={{ maxWidth: 280 }}>
      <NavigationDropdown
        label="Reference"
        icon={BookOpen}
        items={referenceItems}
        currentPath={path}
        onNavigate={setPath}
      />
    </div>
  );
};
