import { formatFilmType } from "../filmTypeFormatter";

describe("formatFilmType", () => {
  it("should format 'bw' to 'B&W'", () => {
    expect(formatFilmType("bw")).toBe("B&W");
  });

  it("should format 'b&w' to 'B&W'", () => {
    expect(formatFilmType("b&w")).toBe("B&W");
  });

  it("should format 'b & w' to 'B&W'", () => {
    expect(formatFilmType("b & w")).toBe("B&W");
  });

  it("should format 'black and white' to 'B&W'", () => {
    expect(formatFilmType("black and white")).toBe("B&W");
  });

  it("should format 'color' to 'Color'", () => {
    expect(formatFilmType("color")).toBe("Color");
  });

  it("should format 'Color' to 'Color'", () => {
    expect(formatFilmType("Color")).toBe("Color");
  });

  it("should format 'COLOR' to 'Color'", () => {
    expect(formatFilmType("COLOR")).toBe("Color");
  });

  it("should format 'color negative' to 'Color'", () => {
    expect(formatFilmType("color negative")).toBe("Color");
  });

  it("should format 'slide' to 'Slide'", () => {
    expect(formatFilmType("slide")).toBe("Slide");
  });

  it("should format 'Slide' to 'Slide'", () => {
    expect(formatFilmType("Slide")).toBe("Slide");
  });

  it("should format 'SLIDE' to 'Slide'", () => {
    expect(formatFilmType("SLIDE")).toBe("Slide");
  });

  it("should format 'reversal' to 'Slide'", () => {
    expect(formatFilmType("reversal")).toBe("Slide");
  });

  it("should format 'color slide' to 'Slide'", () => {
    expect(formatFilmType("color slide")).toBe("Slide");
  });

  it("should format 'color transparency' to 'Slide'", () => {
    expect(formatFilmType("color transparency")).toBe("Slide");
  });

  it("should handle undefined input", () => {
    expect(formatFilmType(undefined)).toBe("Unknown");
  });

  it("should handle empty string", () => {
    expect(formatFilmType("")).toBe("Unknown");
  });

  it("should capitalize unknown types properly", () => {
    expect(formatFilmType("infrared")).toBe("Infrared");
    expect(formatFilmType("instant")).toBe("Instant");
    expect(formatFilmType("SPECIALTY")).toBe("Specialty");
  });

  it("should handle multi-word unknown types", () => {
    expect(formatFilmType("special format")).toBe("Special Format");
    expect(formatFilmType("MULTI WORD TYPE")).toBe("Multi Word Type");
  });

  it("should trim whitespace", () => {
    expect(formatFilmType("  bw  ")).toBe("B&W");
    expect(formatFilmType("  color  ")).toBe("Color");
    expect(formatFilmType("  slide  ")).toBe("Slide");
  });
});
