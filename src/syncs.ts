// file: src/syncs.ts

import { initializeNewUserSync } from "./syncs/initializeNewUser.sync.ts";
import { autoAddChordsSync } from "./syncs/autoAddChords.sync.ts";
import { recommendationSyncs } from "./syncs/recommendation.sync.ts";

/**
 * Registers all synchronization logic (listeners) with the concept backend.
 * @param concepts The collection of instantiated concepts (UserAccount, ChordLibrary, etc.)
 */
export function registerSyncs(concepts: any) {
  console.log("Registering ChordConnect Syncs...");

  // User Lifecycle
  initializeNewUserSync(concepts);

  // Library Management
  autoAddChordsSync(concepts);

  // Recommendation Flow
  recommendationSyncs(concepts);

  console.log("ChordConnect Syncs Registered.");
}
