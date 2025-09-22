import React from "react";
import { SearchDropdown } from "@/components/ui/search";
import type { Film, Developer } from "@/api/dorkroom/types";

interface MobileSearchModalsProps {
  showFilmModal: boolean;
  showDeveloperModal: boolean;
  onCloseFilmModal: () => void;
  onCloseDeveloperModal: () => void;
  allFilms: Film[];
  allDevelopers: Developer[];
  onFilmSelect: (film: Film) => void;
  onDeveloperSelect: (developer: Developer) => void;
}

export function MobileSearchModals({
  showFilmModal,
  showDeveloperModal,
  onCloseFilmModal,
  onCloseDeveloperModal,
  allFilms,
  allDevelopers,
  onFilmSelect,
  onDeveloperSelect,
}: MobileSearchModalsProps) {
  return (
    <>
      <SearchDropdown
        variant="mobile"
        type="film"
        isOpen={showFilmModal}
        onClose={onCloseFilmModal}
        films={allFilms}
        onFilmSelect={onFilmSelect}
        onItemSelect={() => {}} // Not used for mobile variant
      />

      <SearchDropdown
        variant="mobile"
        type="developer"
        isOpen={showDeveloperModal}
        onClose={onCloseDeveloperModal}
        developers={allDevelopers}
        onDeveloperSelect={onDeveloperSelect}
        onItemSelect={() => {}} // Not used for mobile variant
      />
    </>
  );
}
