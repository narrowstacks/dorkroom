/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// global colors
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';
// global brand colors (except darkroom and eInk)
const brandColors = {
  genericBrandColor: '#000000',
  kodakBrandColor: '#e7a62e',
  fujiBrandColor: '#1f9d62',
  ilfordBrandColor: '#15d422',
  cinestillBrandColor: '#ff0000',
  lomographyBrandColor: '#7a33d7',
  rolleiBrandColor: '#2c3e50',
  adoxBrandColor: '#ff6b35',
  agfaBrandColor: '#8b4513',
  aristaBrandColor: '#708090',
  efkeBrandColor: '#c0392b',
  fomapanBrandColor: '#27ae60',
  holgaBrandColor: '#e74c3c',
  // Generic brands - each with unique colors
  catlabsBrandColor: '#7b68ee',
  ultrafineBrandColor: '#4169e1',
  silberraBrandColor: '#c0c0c0',
  luckyBrandColor: '#ffd700',
  yodicaBrandColor: '#6b8e23',
  streetCandyFilmBrandColor: '#ff69b4',
  shanghaiFilmBrandColor: '#dc143c',
  berggerBrandColor: '#8b4513',
  fppBrandColor: '#ff8c00',
  jchBrandColor: '#191970',
  konoBrandColor: '#20b2aa',
  psychedelicBluesBrandColor: '#4b0082',
  revologBrandColor: '#32cd32',
  dubblefilmBrandColor: '#00ced1',
  legacyProBrandColor: '#2f4f4f',
  washiBrandColor: '#dda0dd',
  orientalBrandColor: '#800020',
};

// global page tints
const pageTints = {
  stopCalcTint: '#9C27B0',
  resizeCalcTint: '#2196F3',
  cameraExposureCalcTint: '#3F51B5',
  reciprocityCalcTint: '#FF9800',
  borderCalcTint: '#4CAF50',
  developmentRecipesTint: '#ad1b1d',
  infobaseTint: '#607D8B',
};

// theme specific colors
type ColorScheme = {
  // general colors
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  listItemText: string;
  selectedItemBackground: string;

  // results box colors
  cardBackground: string;
  resultRowBackground: string;
  inputBackground: string;
  borderColor: string;
  shadowColor: string;
  outline: string;

  // text colors
  textSecondary: string;
  textMuted: string;

  // error and success colors
  errorColor: string;
  successColor: string;
  surfaceVariant: string;

  // gradient colors for themed backgrounds
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  heroBackground: string;
  heroBorder: string;
  panelBackground: string;

  // stop calculator
  stopCalcTint: string;

  // resize calculator
  resizeCalcTint: string;

  // camera exposure calculator
  cameraExposureCalcTint: string;

  // reciprocity calculator
  reciprocityCalcTint: string;

  // border calculator
  borderCalcTint: string;
  bladeColor: string;
  bladeShadowColor: string;
  paperColor: string;
  printPreviewColor: string;

  // development recipes
  developmentRecipesTint: string;

  // infobase
  infobaseTint: string;

  // brand colors
  genericBrandColor: string;
  kodakBrandColor: string;
  fujiBrandColor: string;
  ilfordBrandColor: string;
  cinestillBrandColor: string;
  lomographyBrandColor: string;
  rolleiBrandColor: string;
  adoxBrandColor: string;
  agfaBrandColor: string;
  aristaBrandColor: string;
  efkeBrandColor: string;
  fomapanBrandColor: string;
  holgaBrandColor: string;
  // Generic brands
  catlabsBrandColor: string;
  ultrafineBrandColor: string;
  silberraBrandColor: string;
  luckyBrandColor: string;
  yodicaBrandColor: string;
  streetCandyFilmBrandColor: string;
  shanghaiFilmBrandColor: string;
  berggerBrandColor: string;
  fppBrandColor: string;
  jchBrandColor: string;
  konoBrandColor: string;
  psychedelicBluesBrandColor: string;
  revologBrandColor: string;
  dubblefilmBrandColor: string;
  legacyProBrandColor: string;
  washiBrandColor: string;
  orientalBrandColor: string;
};

export const Colors: {
  light: ColorScheme;
  dark: ColorScheme;
  darkroom: ColorScheme;
  eInk: ColorScheme;
} = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    listItemText: '#000000',
    selectedItemBackground: '#e0e0e0',

    // results box colors
    cardBackground: '#ffffff',
    resultRowBackground: '#f8f9fa',
    inputBackground: 'rgba(248,249,250,0.95)',
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000000',
    textSecondary: 'rgba(0,0,0,0.75)',
    textMuted: 'rgba(0,0,0,0.65)',
    errorColor: '#FF6B6B',
    successColor: '#4ECDC4',
    surfaceVariant: 'rgba(248,249,250,0.85)',
    outline: 'rgba(0,0,0,0.08)',

    // gradient colors for themed backgrounds - enhanced for smoother transitions
    gradientStart: 'rgba(255,255,255,0.15)',
    gradientMid: 'rgba(255,255,255,0.06)',
    gradientEnd: 'rgba(0,0,0,0.18)',
    heroBackground: 'rgba(255,255,255,0.95)',
    heroBorder: 'rgba(0,0,0,0.12)',
    panelBackground: 'rgba(248,249,250,0.9)',
    // stop exposure calculator
    stopCalcTint: pageTints.stopCalcTint,

    // resize calculator
    resizeCalcTint: pageTints.resizeCalcTint,

    // camera exposure calculator
    cameraExposureCalcTint: pageTints.cameraExposureCalcTint,

    // reciprocity calculator
    reciprocityCalcTint: pageTints.reciprocityCalcTint,

    // border calculator
    borderCalcTint: pageTints.borderCalcTint,
    bladeColor: '#2b2b2b',
    bladeShadowColor: '#151515',
    paperColor: '#ffffff',
    printPreviewColor: '#8b8b8b',

    // development recipes
    developmentRecipesTint: pageTints.developmentRecipesTint,

    // infobase
    infobaseTint: pageTints.infobaseTint,

    // brand colors
    genericBrandColor: brandColors.genericBrandColor,
    kodakBrandColor: brandColors.kodakBrandColor,
    fujiBrandColor: brandColors.fujiBrandColor,
    ilfordBrandColor: brandColors.ilfordBrandColor,
    cinestillBrandColor: brandColors.cinestillBrandColor,
    lomographyBrandColor: brandColors.lomographyBrandColor,
    rolleiBrandColor: brandColors.rolleiBrandColor,
    adoxBrandColor: brandColors.adoxBrandColor,
    agfaBrandColor: brandColors.agfaBrandColor,
    aristaBrandColor: brandColors.aristaBrandColor,
    efkeBrandColor: brandColors.efkeBrandColor,
    fomapanBrandColor: brandColors.fomapanBrandColor,
    holgaBrandColor: brandColors.holgaBrandColor,
    catlabsBrandColor: brandColors.catlabsBrandColor,
    ultrafineBrandColor: brandColors.ultrafineBrandColor,
    silberraBrandColor: brandColors.silberraBrandColor,
    luckyBrandColor: brandColors.luckyBrandColor,
    yodicaBrandColor: brandColors.yodicaBrandColor,
    streetCandyFilmBrandColor: brandColors.streetCandyFilmBrandColor,
    shanghaiFilmBrandColor: brandColors.shanghaiFilmBrandColor,
    berggerBrandColor: brandColors.berggerBrandColor,
    fppBrandColor: brandColors.fppBrandColor,
    jchBrandColor: brandColors.jchBrandColor,
    konoBrandColor: brandColors.konoBrandColor,
    psychedelicBluesBrandColor: brandColors.psychedelicBluesBrandColor,
    revologBrandColor: brandColors.revologBrandColor,
    dubblefilmBrandColor: brandColors.dubblefilmBrandColor,
    legacyProBrandColor: brandColors.legacyProBrandColor,
    washiBrandColor: brandColors.washiBrandColor,
    orientalBrandColor: brandColors.orientalBrandColor,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    listItemText: '#000000',
    selectedItemBackground: '#444444',

    // results box colors
    cardBackground: '#1e1e1e',
    resultRowBackground: '#2e2e2e',
    inputBackground: 'rgba(30,30,30,0.8)',
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000000',
    outline: 'rgba(255,255,255,0.05)',

    // text colors
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: 'rgba(255,255,255,0.6)',

    // error and success colors
    errorColor: '#FF6B6B',
    successColor: '#4ECDC4',
    surfaceVariant: 'rgba(30,30,30,0.6)',

    // gradient colors for themed backgrounds - enhanced for smoother transitions
    gradientStart: 'rgba(255,255,255,0.16)',
    gradientMid: 'rgba(255,255,255,0.08)',
    gradientEnd: 'rgba(0,0,0,0.26)',
    heroBackground: 'rgba(12,12,14,0.85)',
    heroBorder: 'rgba(255,255,255,0.06)',
    panelBackground: 'rgba(18,18,20,0.85)',

    // stop exposure calculator
    stopCalcTint: pageTints.stopCalcTint,

    // resize calculator
    resizeCalcTint: pageTints.resizeCalcTint,

    // camera exposure calculator
    cameraExposureCalcTint: pageTints.cameraExposureCalcTint,

    // reciprocity calculator
    reciprocityCalcTint: pageTints.reciprocityCalcTint,

    // border calculator
    borderCalcTint: pageTints.borderCalcTint,
    bladeColor: '#393939',
    bladeShadowColor: '#151515',
    paperColor: '#5e5e5e',
    printPreviewColor: '#393939',

    // development recipes
    developmentRecipesTint: pageTints.developmentRecipesTint,

    // infobase
    infobaseTint: pageTints.infobaseTint,

    // brand colors
    genericBrandColor: brandColors.genericBrandColor,
    kodakBrandColor: brandColors.kodakBrandColor,
    fujiBrandColor: brandColors.fujiBrandColor,
    ilfordBrandColor: brandColors.ilfordBrandColor,
    cinestillBrandColor: brandColors.cinestillBrandColor,
    lomographyBrandColor: brandColors.lomographyBrandColor,
    rolleiBrandColor: brandColors.rolleiBrandColor,
    adoxBrandColor: brandColors.adoxBrandColor,
    agfaBrandColor: brandColors.agfaBrandColor,
    aristaBrandColor: brandColors.aristaBrandColor,
    efkeBrandColor: brandColors.efkeBrandColor,
    fomapanBrandColor: brandColors.fomapanBrandColor,
    holgaBrandColor: brandColors.holgaBrandColor,
    catlabsBrandColor: brandColors.catlabsBrandColor,
    ultrafineBrandColor: brandColors.ultrafineBrandColor,
    silberraBrandColor: brandColors.silberraBrandColor,
    luckyBrandColor: brandColors.luckyBrandColor,
    yodicaBrandColor: brandColors.yodicaBrandColor,
    streetCandyFilmBrandColor: brandColors.streetCandyFilmBrandColor,
    shanghaiFilmBrandColor: brandColors.shanghaiFilmBrandColor,
    berggerBrandColor: brandColors.berggerBrandColor,
    fppBrandColor: brandColors.fppBrandColor,
    jchBrandColor: brandColors.jchBrandColor,
    konoBrandColor: brandColors.konoBrandColor,
    psychedelicBluesBrandColor: brandColors.psychedelicBluesBrandColor,
    revologBrandColor: brandColors.revologBrandColor,
    dubblefilmBrandColor: brandColors.dubblefilmBrandColor,
    legacyProBrandColor: brandColors.legacyProBrandColor,
    washiBrandColor: brandColors.washiBrandColor,
    orientalBrandColor: brandColors.orientalBrandColor,
  },
  darkroom: {
    background: '#000000',
    text: '#FF0000',
    tint: '#FF0000',
    icon: '#FF0000',
    tabIconDefault: '#FF0000',
    tabIconSelected: '#FF0000',
    listItemText: '#000000',
    selectedItemBackground: '#550000',

    // results box colors
    cardBackground: '#000000',
    resultRowBackground: '#000000',
    inputBackground: 'rgba(0,0,0,0.8)',
    borderColor: 'rgba(255,0,0,0.3)',
    shadowColor: '#000000',
    textSecondary: 'rgba(255,0,0,0.7)',
    textMuted: 'rgba(255,0,0,0.6)',
    errorColor: '#FF0000',
    successColor: '#FF0000',
    surfaceVariant: 'rgba(0,0,0,0.6)',
    outline: 'rgba(255,0,0,0.1)',

    // gradient colors for themed backgrounds
    gradientStart: 'rgba(255,0,0,0.12)',
    gradientMid: 'rgba(255,0,0,0.0)',
    gradientEnd: 'rgba(255,0,0,0.24)',
    heroBackground: 'rgba(0,0,0,0.95)',
    heroBorder: 'rgba(255,0,0,0.2)',
    panelBackground: 'rgba(0,0,0,0.9)',

    // stop exposure calculator
    stopCalcTint: '#8f0000',

    // resize calculator
    resizeCalcTint: '#8f0000',

    // camera exposure calculator
    cameraExposureCalcTint: '#8f0000',

    // reciprocity calculator
    reciprocityCalcTint: '#8f0000',

    // border calculator
    borderCalcTint: '#4CAF50',
    bladeColor: '#8f0000',
    bladeShadowColor: '#3a0000',
    paperColor: '#000000',
    printPreviewColor: '#ff0000',

    // development recipes
    developmentRecipesTint: '#8f0000',

    // infobase
    infobaseTint: '#8f0000',

    // brand colors
    genericBrandColor: '#000000',
    kodakBrandColor: '#000000',
    fujiBrandColor: '#000000',
    ilfordBrandColor: '#000000',
    cinestillBrandColor: '#000000',
    lomographyBrandColor: '#000000',
    rolleiBrandColor: '#000000',
    adoxBrandColor: '#000000',
    agfaBrandColor: '#000000',
    aristaBrandColor: '#000000',
    efkeBrandColor: '#000000',
    fomapanBrandColor: '#000000',
    holgaBrandColor: '#000000',
    catlabsBrandColor: '#000000',
    ultrafineBrandColor: '#000000',
    silberraBrandColor: '#000000',
    luckyBrandColor: '#000000',
    yodicaBrandColor: '#000000',
    streetCandyFilmBrandColor: '#000000',
    shanghaiFilmBrandColor: '#000000',
    berggerBrandColor: '#000000',
    fppBrandColor: '#000000',
    jchBrandColor: '#000000',
    konoBrandColor: '#000000',
    psychedelicBluesBrandColor: '#000000',
    revologBrandColor: '#000000',
    dubblefilmBrandColor: '#000000',
    legacyProBrandColor: '#000000',
    washiBrandColor: '#000000',
    orientalBrandColor: '#000000',
  },
  eInk: {
    background: '#FFFFFF',
    text: '#000000',
    tint: '#000000',
    icon: '#000000',
    tabIconDefault: '#000000',
    tabIconSelected: '#000000',
    listItemText: '#000000',
    selectedItemBackground: '#cccccc',
    // results box colors
    cardBackground: '#ffffff',
    resultRowBackground: '#ffffff',
    inputBackground: 'rgba(255,255,255,0.8)',
    borderColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#000000',
    textSecondary: 'rgba(0,0,0,0.7)',
    textMuted: 'rgba(0,0,0,0.6)',
    errorColor: '#000000',
    successColor: '#000000',
    surfaceVariant: 'rgba(255,255,255,0.6)',
    outline: 'rgba(0,0,0,0.2)',

    // gradient colors for themed backgrounds
    gradientStart: 'rgba(0,0,0,0.12)',
    gradientMid: 'rgba(0,0,0,0.0)',
    gradientEnd: 'rgba(0,0,0,0.24)',
    heroBackground: 'rgba(255,255,255,0.95)',
    heroBorder: 'rgba(0,0,0,0.2)',
    panelBackground: 'rgba(255,255,255,0.9)',

    // stop calculator
    stopCalcTint: '#000000',

    // resize calculator
    resizeCalcTint: '#000000',

    // camera exposure calculator
    cameraExposureCalcTint: '#000000',

    // reciprocity calculator
    reciprocityCalcTint: '#000000',

    // border calculator
    borderCalcTint: '#000000',
    bladeColor: '#000000',
    bladeShadowColor: '#ffffff',
    paperColor: '#ffffff',
    printPreviewColor: '#7f7f7f',

    // development recipes
    developmentRecipesTint: '#000000',

    // infobase
    infobaseTint: '#000000',

    // brand colors
    genericBrandColor: '#000000',
    kodakBrandColor: '#000000',
    fujiBrandColor: '#000000',
    ilfordBrandColor: '#000000',
    cinestillBrandColor: '#000000',
    lomographyBrandColor: '#000000',
    rolleiBrandColor: '#000000',
    adoxBrandColor: '#000000',
    agfaBrandColor: '#000000',
    aristaBrandColor: '#000000',
    efkeBrandColor: '#000000',
    fomapanBrandColor: '#000000',
    holgaBrandColor: '#000000',
    catlabsBrandColor: '#000000',
    ultrafineBrandColor: '#000000',
    silberraBrandColor: '#000000',
    luckyBrandColor: '#000000',
    yodicaBrandColor: '#000000',
    streetCandyFilmBrandColor: '#000000',
    shanghaiFilmBrandColor: '#000000',
    berggerBrandColor: '#000000',
    fppBrandColor: '#000000',
    jchBrandColor: '#000000',
    konoBrandColor: '#000000',
    psychedelicBluesBrandColor: '#000000',
    revologBrandColor: '#000000',
    dubblefilmBrandColor: '#000000',
    legacyProBrandColor: '#000000',
    washiBrandColor: '#000000',
    orientalBrandColor: '#000000',
  },
};

export default Colors;
