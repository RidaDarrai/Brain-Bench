/** What a finished game reports back to the TestPage. */
export interface GameResult {
  /** Final score of the run (direction depends on the test). */
  score: number;
  /** Levels actually passed during this run (empty for non-leveled tests). */
  cleared: number[];
  /**
   * Whether this score is eligible as a personal best (default true).
   * False for runs that end without a legitimate final score (e.g. a
   * partial average), which would otherwise beat completed runs.
   */
  validForBest?: boolean;
}

export interface GameProps {
  /** Level to start at (leveled tests only; ignored otherwise). */
  startLevel: number;
  /** Called when the player dismisses the game-over overlay. */
  onComplete: (result: GameResult) => void;
}

export type GameComponent = (props: GameProps) => JSX.Element;
