export type Theme = 'light' | 'dark' | 'darkroom' | 'high-contrast' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  highlight: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
  };
  border: {
    primary: string;
    secondary: string;
    muted: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  visualization: {
    preview: string;
    border: string;
    overlay: string;
  };
  gradients: {
    cardPrimary: string;
    cardSecondary: string;
    cardAccent: string;
    cardHighlight: string;
    cardNeutral: string;
    cardInfo: string;
    cardWarning: string;
    cardError: string;
  };
  tags: {
    officialIlford: string;
    officialKodak: string;
    officialFuji: string;
    community: string;
    default: string;
  };
}

export const darkTheme: ThemeColors = {
  background: '#09090b',
  surface: '#121214',
  surfaceMuted: '#1c1c1f',
  primary: '#6ef3a4',
  secondary: '#7dd6ff',
  accent: '#f99f96',
  highlight: '#e5ff7d',
  text: {
    primary: '#ffffff',
    secondary: '#e4e4e7',
    tertiary: '#a1a1aa',
    muted: '#71717a',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.2)',
    secondary: 'rgba(255, 255, 255, 0.1)',
    muted: 'rgba(255, 255, 255, 0.05)',
  },
  semantic: {
    success: '#6ef3a4',
    warning: '#e5ff7d',
    error: '#f99f96',
    info: '#7dd6ff',
  },
  visualization: {
    preview: '#666666',
    border: '#353535',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  gradients: {
    cardPrimary:
      'linear-gradient(135deg, rgba(110, 243, 164, 0.45), rgba(36, 146, 88, 0.34))',
    cardSecondary:
      'linear-gradient(135deg, rgba(125, 214, 255, 0.42), rgba(30, 96, 145, 0.35))',
    cardAccent:
      'linear-gradient(135deg, rgba(249, 159, 150, 0.46), rgba(141, 61, 69, 0.33))',
    cardHighlight:
      'linear-gradient(135deg, rgba(229, 255, 125, 0.48), rgba(139, 156, 46, 0.36))',
    cardNeutral:
      'linear-gradient(135deg, rgba(47, 211, 107, 0.56), rgba(14, 85, 49, 0.44))',
    cardInfo:
      'linear-gradient(135deg, rgba(139, 37, 195, 0.62), rgba(25, 9, 61, 0.46))',
    cardWarning:
      'linear-gradient(135deg, rgba(200, 165, 23, 0.64), rgba(94, 46, 10, 0.47))',
    cardError:
      'linear-gradient(135deg, rgba(169, 38, 86, 0.64), rgba(73, 19, 43, 0.47))',
  },
  tags: {
    officialIlford: '#6ef3a4',
    officialKodak: '#e5ff7d',
    officialFuji: '#7dd6ff',
    community: '#f99f96',
    default: '#a1a1aa',
  },
};

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  surfaceMuted: '#f1f3f4',
  primary: '#2d7a4a',
  secondary: '#1e6091',
  accent: '#c4524a',
  highlight: '#8b9c2e',
  text: {
    primary: '#09090b',
    secondary: '#27272a',
    tertiary: '#52525b',
    muted: '#71717a',
  },
  border: {
    primary: 'rgba(9, 9, 11, 0.2)',
    secondary: 'rgba(9, 9, 11, 0.1)',
    muted: 'rgba(9, 9, 11, 0.05)',
  },
  semantic: {
    success: '#2d7a4a',
    warning: '#8b9c2e',
    error: '#c4524a',
    info: '#1e6091',
  },
  visualization: {
    preview: '#d4d4d8',
    border: '#a1a1aa',
    overlay: 'rgba(255, 255, 255, 0.5)',
  },
  gradients: {
    cardPrimary:
      'linear-gradient(135deg, rgba(45, 122, 74, 0.15), rgba(20, 83, 45, 0.08))',
    cardSecondary:
      'linear-gradient(135deg, rgba(30, 96, 145, 0.15), rgba(15, 58, 87, 0.08))',
    cardAccent:
      'linear-gradient(135deg, rgba(196, 82, 74, 0.15), rgba(141, 61, 69, 0.08))',
    cardHighlight:
      'linear-gradient(135deg, rgba(139, 156, 46, 0.15), rgba(94, 105, 31, 0.08))',
    cardNeutral:
      'linear-gradient(135deg, rgba(45, 122, 74, 0.18), rgba(20, 83, 45, 0.10))',
    cardInfo:
      'linear-gradient(135deg, rgba(139, 37, 195, 0.18), rgba(88, 28, 135, 0.10))',
    cardWarning:
      'linear-gradient(135deg, rgba(200, 165, 23, 0.18), rgba(154, 127, 18, 0.10))',
    cardError:
      'linear-gradient(135deg, rgba(169, 38, 86, 0.18), rgba(127, 29, 65, 0.10))',
  },
  tags: {
    officialIlford: '#2d7a4a',
    officialKodak: '#8b9c2e',
    officialFuji: '#1e6091',
    community: '#c4524a',
    default: '#52525b',
  },
};

export const darkroomTheme: ThemeColors = {
  background: '#000000',
  surface: '#000000',
  surfaceMuted: '#000000',
  primary: '#ff0000',
  secondary: '#ff0000',
  accent: '#ff0000',
  highlight: '#ff0000',
  text: {
    primary: '#ff0000',
    secondary: '#a90000',
    tertiary: '#920000',
    muted: '#820000',
  },
  border: {
    primary: '#ff0000',
    secondary: '#a90000',
    muted: '#920000',
  },
  semantic: {
    success: '#ff0000',
    warning: '#a90000',
    error: '#920000',
    info: '#820000',
  },
  visualization: {
    preview: '#ff0000',
    border: '#a90000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  gradients: {
    cardPrimary: '#ff0000',
    cardSecondary: '#000000',
    cardAccent: '#ff0000',
    cardHighlight: '#ff0000',
    cardNeutral: '#000000',
    cardInfo: '#000000',
    cardWarning: '#000000',
    cardError: '#000000',
  },
  tags: {
    officialIlford: '#ff0000',
    officialKodak: '#ff0000',
    officialFuji: '#ff0000',
    community: '#ff0000',
    default: '#a1a1aa',
  },
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
  darkroom: darkroomTheme,
  'high-contrast': {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#ffffff',
    primary: '#000000',
    secondary: '#000000',
    accent: '#000000',
    highlight: '#000000',
    text: {
      primary: '#000000',
      secondary: '#000000',
      tertiary: '#000000',
      muted: '#000000',
    },
    border: {
      primary: '#000000',
      secondary: '#000000',
      muted: '#000000',
    },
    semantic: {
      success: '#000000',
      warning: '#000000',
      error: '#000000',
      info: '#000000',
    },
    visualization: {
      preview: '#000000',
      border: '#000000',
      overlay: 'rgba(255, 255, 255, 0.5)',
    },
    gradients: {
      cardPrimary: '#ffffff',
      cardSecondary: '#ffffff',
      cardAccent: '#ffffff',
      cardHighlight: '#ffffff',
      cardNeutral: '#ffffff',
      cardInfo: '#ffffff',
      cardWarning: '#ffffff',
      cardError: '#ffffff',
    },
    tags: {
      officialIlford: '#000000',
      officialKodak: '#000000',
      officialFuji: '#000000',
      community: '#000000',
      default: '#000000',
    },
  },
} as const;

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(
  theme: Theme
): 'light' | 'dark' | 'darkroom' | 'high-contrast' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}
