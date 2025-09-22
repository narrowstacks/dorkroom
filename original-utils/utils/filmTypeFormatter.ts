/**
 * Formats film type strings for consistent display to end users
 * @param filmType - The raw film type from the API (e.g., "bw", "color", "slide")
 * @returns Formatted film type string for display
 */
export function formatFilmType(filmType?: string): string {
  if (!filmType) return "Unknown";

  const normalizedType = filmType.toLowerCase().trim();

  switch (normalizedType) {
    case "bw":
    case "b&w":
    case "b & w":
    case "black and white":
      return "B&W";
    case "color":
    case "color negative":
      return "Color";
    case "slide":
    case "reversal":
    case "color slide":
    case "color transparency":
      return "Slide";
    default:
      // For unknown types, capitalize first letter of each word
      return filmType
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
  }
}
