describe('useBorderCalculatorState', () => {
  describe('hook functionality', () => {
    it('should be importable', () => {
      const {
        useBorderCalculatorState,
      } = require('../useBorderCalculatorState');
      expect(typeof useBorderCalculatorState).toBe('function');
    });

    it('should export initialState', () => {
      const { initialState } = require('../useBorderCalculatorState');
      expect(typeof initialState).toBe('object');
      expect(initialState).toBeDefined();
    });
  });

  describe('initial state structure', () => {
    it('should have correct initial state properties', () => {
      const { initialState } = require('../useBorderCalculatorState');

      // Core input properties
      expect(initialState).toHaveProperty('aspectRatio');
      expect(initialState).toHaveProperty('paperSize');
      expect(initialState).toHaveProperty('customAspectWidth');
      expect(initialState).toHaveProperty('customAspectHeight');
      expect(initialState).toHaveProperty('customPaperWidth');
      expect(initialState).toHaveProperty('customPaperHeight');
      expect(initialState).toHaveProperty('minBorder');
      expect(initialState).toHaveProperty('enableOffset');
      expect(initialState).toHaveProperty('ignoreMinBorder');
      expect(initialState).toHaveProperty('horizontalOffset');
      expect(initialState).toHaveProperty('verticalOffset');
      expect(initialState).toHaveProperty('showBlades');
      expect(initialState).toHaveProperty('isLandscape');
      expect(initialState).toHaveProperty('isRatioFlipped');

      // Warning and tracking properties
      expect(initialState).toHaveProperty('offsetWarning');
      expect(initialState).toHaveProperty('bladeWarning');
      expect(initialState).toHaveProperty('minBorderWarning');
      expect(initialState).toHaveProperty('paperSizeWarning');
      expect(initialState).toHaveProperty('lastValidMinBorder');

      // Image-related properties
      expect(initialState).toHaveProperty('selectedImageUri');
      expect(initialState).toHaveProperty('imageDimensions');
      expect(initialState).toHaveProperty('isCropping');
      expect(initialState).toHaveProperty('cropOffset');
      expect(initialState).toHaveProperty('cropScale');

      // Last valid tracking properties
      expect(initialState).toHaveProperty('lastValidCustomAspectWidth');
      expect(initialState).toHaveProperty('lastValidCustomAspectHeight');
      expect(initialState).toHaveProperty('lastValidCustomPaperWidth');
      expect(initialState).toHaveProperty('lastValidCustomPaperHeight');
    });

    it('should have correct initial state data types', () => {
      const { initialState } = require('../useBorderCalculatorState');

      // String properties
      expect(typeof initialState.aspectRatio).toBe('string');
      expect(typeof initialState.paperSize).toBe('string');

      // Number properties
      expect(typeof initialState.customAspectWidth).toBe('number');
      expect(typeof initialState.customAspectHeight).toBe('number');
      expect(typeof initialState.customPaperWidth).toBe('number');
      expect(typeof initialState.customPaperHeight).toBe('number');
      expect(typeof initialState.minBorder).toBe('number');
      expect(typeof initialState.horizontalOffset).toBe('number');
      expect(typeof initialState.verticalOffset).toBe('number');
      expect(typeof initialState.lastValidMinBorder).toBe('number');
      expect(typeof initialState.lastValidCustomAspectWidth).toBe('number');
      expect(typeof initialState.lastValidCustomAspectHeight).toBe('number');
      expect(typeof initialState.lastValidCustomPaperWidth).toBe('number');
      expect(typeof initialState.lastValidCustomPaperHeight).toBe('number');
      expect(typeof initialState.cropScale).toBe('number');

      // Boolean properties
      expect(typeof initialState.enableOffset).toBe('boolean');
      expect(typeof initialState.ignoreMinBorder).toBe('boolean');
      expect(typeof initialState.showBlades).toBe('boolean');
      expect(typeof initialState.isLandscape).toBe('boolean');
      expect(typeof initialState.isRatioFlipped).toBe('boolean');
      expect(typeof initialState.isCropping).toBe('boolean');

      // Object properties
      expect(typeof initialState.imageDimensions).toBe('object');
      expect(typeof initialState.cropOffset).toBe('object');

      // Properties that should be null initially
      expect(initialState.offsetWarning).toBeNull();
      expect(initialState.bladeWarning).toBeNull();
      expect(initialState.minBorderWarning).toBeNull();
      expect(initialState.paperSizeWarning).toBeNull();
      expect(initialState.selectedImageUri).toBeNull();
    });

    it('should have correct default values', () => {
      const { initialState } = require('../useBorderCalculatorState');
      const {
        DEFAULT_MIN_BORDER,
        DEFAULT_CUSTOM_PAPER_WIDTH,
        DEFAULT_CUSTOM_PAPER_HEIGHT,
        DEFAULT_CUSTOM_ASPECT_WIDTH,
        DEFAULT_CUSTOM_ASPECT_HEIGHT,
      } = require('../types');

      expect(initialState.customAspectWidth).toBe(DEFAULT_CUSTOM_ASPECT_WIDTH);
      expect(initialState.customAspectHeight).toBe(
        DEFAULT_CUSTOM_ASPECT_HEIGHT
      );
      expect(initialState.customPaperWidth).toBe(DEFAULT_CUSTOM_PAPER_WIDTH);
      expect(initialState.customPaperHeight).toBe(DEFAULT_CUSTOM_PAPER_HEIGHT);
      expect(initialState.minBorder).toBe(DEFAULT_MIN_BORDER);
      expect(initialState.lastValidMinBorder).toBe(DEFAULT_MIN_BORDER);
      expect(initialState.lastValidCustomAspectWidth).toBe(
        DEFAULT_CUSTOM_ASPECT_WIDTH
      );
      expect(initialState.lastValidCustomAspectHeight).toBe(
        DEFAULT_CUSTOM_ASPECT_HEIGHT
      );
      expect(initialState.lastValidCustomPaperWidth).toBe(
        DEFAULT_CUSTOM_PAPER_WIDTH
      );
      expect(initialState.lastValidCustomPaperHeight).toBe(
        DEFAULT_CUSTOM_PAPER_HEIGHT
      );

      expect(initialState.enableOffset).toBe(false);
      expect(initialState.ignoreMinBorder).toBe(false);
      expect(initialState.horizontalOffset).toBe(0);
      expect(initialState.verticalOffset).toBe(0);
      expect(initialState.showBlades).toBe(false);
      expect(initialState.isLandscape).toBe(true);
      expect(initialState.isRatioFlipped).toBe(false);
      expect(initialState.isCropping).toBe(false);
      expect(initialState.cropScale).toBe(1);

      expect(initialState.imageDimensions).toEqual({ width: 0, height: 0 });
      expect(initialState.cropOffset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('constants validation', () => {
    it('should export valid constants', () => {
      const {
        DEFAULT_MIN_BORDER,
        DEFAULT_CUSTOM_PAPER_WIDTH,
        DEFAULT_CUSTOM_PAPER_HEIGHT,
        DEFAULT_CUSTOM_ASPECT_WIDTH,
        DEFAULT_CUSTOM_ASPECT_HEIGHT,
        CALC_STORAGE_KEY,
      } = require('../types');

      expect(typeof DEFAULT_MIN_BORDER).toBe('number');
      expect(typeof DEFAULT_CUSTOM_PAPER_WIDTH).toBe('number');
      expect(typeof DEFAULT_CUSTOM_PAPER_HEIGHT).toBe('number');
      expect(typeof DEFAULT_CUSTOM_ASPECT_WIDTH).toBe('number');
      expect(typeof DEFAULT_CUSTOM_ASPECT_HEIGHT).toBe('number');
      expect(typeof CALC_STORAGE_KEY).toBe('string');

      // Verify reasonable default values
      expect(DEFAULT_MIN_BORDER).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_PAPER_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_PAPER_HEIGHT).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_ASPECT_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_ASPECT_HEIGHT).toBeGreaterThan(0);
      expect(CALC_STORAGE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe('reducer functionality', () => {
    // Note: These are structural tests since we cannot easily test the reducer in isolation
    // without setting up the full React context

    it('should have a reducer function (internal)', () => {
      // Test that the module is structured correctly for reducer usage
      const module = require('../useBorderCalculatorState');
      expect(typeof module.useBorderCalculatorState).toBe('function');
      expect(typeof module.initialState).toBe('object');
    });
  });

  describe('integration with types', () => {
    it('should have compatible state interface', () => {
      const { initialState } = require('../useBorderCalculatorState');

      // Test that all required fields from BorderCalculatorState interface exist
      const requiredFields = [
        'aspectRatio',
        'paperSize',
        'customAspectWidth',
        'customAspectHeight',
        'customPaperWidth',
        'customPaperHeight',
        'minBorder',
        'enableOffset',
        'ignoreMinBorder',
        'horizontalOffset',
        'verticalOffset',
        'showBlades',
        'isLandscape',
        'isRatioFlipped',
        'offsetWarning',
        'bladeWarning',
        'minBorderWarning',
        'paperSizeWarning',
        'lastValidMinBorder',
        'selectedImageUri',
        'imageDimensions',
        'isCropping',
        'cropOffset',
        'cropScale',
        'lastValidCustomAspectWidth',
        'lastValidCustomAspectHeight',
        'lastValidCustomPaperWidth',
        'lastValidCustomPaperHeight',
      ];

      requiredFields.forEach((field) => {
        expect(initialState).toHaveProperty(field);
      });
    });
  });

  describe('storage integration', () => {
    it('should use correct storage key', () => {
      const { CALC_STORAGE_KEY } = require('../types');
      expect(CALC_STORAGE_KEY).toBe('borderCalculatorState');
    });
  });

  describe('mathematical validations', () => {
    it('should have positive default values for dimensions', () => {
      const {
        DEFAULT_CUSTOM_PAPER_WIDTH,
        DEFAULT_CUSTOM_PAPER_HEIGHT,
        DEFAULT_CUSTOM_ASPECT_WIDTH,
        DEFAULT_CUSTOM_ASPECT_HEIGHT,
        DEFAULT_MIN_BORDER,
      } = require('../types');

      expect(DEFAULT_CUSTOM_PAPER_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_PAPER_HEIGHT).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_ASPECT_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_CUSTOM_ASPECT_HEIGHT).toBeGreaterThan(0);
      expect(DEFAULT_MIN_BORDER).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable default dimensions', () => {
      const {
        DEFAULT_CUSTOM_PAPER_WIDTH,
        DEFAULT_CUSTOM_PAPER_HEIGHT,
        DEFAULT_CUSTOM_ASPECT_WIDTH,
        DEFAULT_CUSTOM_ASPECT_HEIGHT,
      } = require('../types');

      // Paper dimensions should be in reasonable print size range
      expect(DEFAULT_CUSTOM_PAPER_WIDTH).toBeLessThan(100);
      expect(DEFAULT_CUSTOM_PAPER_HEIGHT).toBeLessThan(100);
      expect(DEFAULT_CUSTOM_PAPER_WIDTH).toBeGreaterThan(1);
      expect(DEFAULT_CUSTOM_PAPER_HEIGHT).toBeGreaterThan(1);

      // Aspect ratios should be reasonable
      expect(DEFAULT_CUSTOM_ASPECT_WIDTH).toBeLessThan(50);
      expect(DEFAULT_CUSTOM_ASPECT_HEIGHT).toBeLessThan(50);
      expect(DEFAULT_CUSTOM_ASPECT_WIDTH).toBeGreaterThan(0.1);
      expect(DEFAULT_CUSTOM_ASPECT_HEIGHT).toBeGreaterThan(0.1);
    });
  });
});
