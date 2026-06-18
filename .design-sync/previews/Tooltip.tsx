import { Tooltip } from '@dorkroom/ui';
import { Github, Settings } from 'lucide-react';

// Tooltip reveals its label only on hover / focus (CSS group-hover), so a static
// capture shows the trigger; the bubble appears on interaction. We compose it
// around realistic icon-button triggers, mirroring the app's top-nav usage.

const triggerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 10,
  border: '1px solid var(--color-border-secondary)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
};

// Bottom-positioned tooltip (default) around a GitHub icon button.
export const Bottom = () => (
  <div style={{ maxWidth: 280, padding: '8px 0' }}>
    <Tooltip label="Contribute on GitHub" position="bottom">
      <span style={triggerStyle}>
        <Github className="size-5" />
      </span>
    </Tooltip>
  </div>
);

// Top-positioned tooltip around a Settings icon button.
export const Top = () => (
  <div style={{ maxWidth: 280, padding: '8px 0' }}>
    <Tooltip label="Settings" position="top">
      <span style={triggerStyle}>
        <Settings className="size-5" />
      </span>
    </Tooltip>
  </div>
);
