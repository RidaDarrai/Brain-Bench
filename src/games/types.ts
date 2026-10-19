/** What a finished game reports back to the TestPage. */
export interface GameResult {
  /** Final score of the run (direction depends on the test). */
  score: number;
  /** Levels actually passed during this run (empty for non-leveled tests). */
  cleared: number[];
  /**
   * Whether this score is eligible as a personal best (default true).
   * False e.g. for a timed-out Aim Trainer run, whose partial average
   * would otherwise beat legitimate completed runs.
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
