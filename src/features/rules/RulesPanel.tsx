export function RulesPanel() {
  return (
    <section className="panel">
      <h2>Official Rules (In-App Reference)</h2>

      <h3>Set It Up</h3>
      <ol>
        <li>Separate cards into 5 categories: Action, Incident, Object, Nature, and P's.</li>
        <li>Play with 2-4 teams and at least 2 players per team.</li>
        <li>Each team starts with 4 lifelines: 2x Uncuff me, 2x Steal.</li>
        <li>Give each team a Lowdown card.</li>
        <li>Pick the first Sound Master (this app uses random picker).</li>
      </ol>

      <h3>Round Flow</h3>
      <ol>
        <li>Sound Master rolls the die to determine category or All-in.</li>
        <li>Draw a card from the selected category.</li>
        <li>Start a 1-minute timer and give clues using sound + movement only.</li>
        <li>Hands stay clasped behind back unless Uncuff me is active.</li>
        <li>Only onomatopoeia is allowed.</li>
        <li>No clue sounds that are part of the answer itself.</li>
        <li>Pointing directly at the answer object is not allowed.</li>
        <li>You may pass cards during normal rounds.</li>
        <li>Round ends when timer expires, then play moves clockwise.</li>
      </ol>

      <h3>Scoring</h3>
      <ul>
        <li>Cards are worth 1, 2, or 3 points.</li>
        <li>Score is added at the end of the round.</li>
        <li>Mistake penalties give +1 point to all other teams.</li>
        <li>No pass penalty in All-in rounds.</li>
      </ul>

      <h3>Lifelines</h3>
      <ul>
        <li>Lifelines can only be played once timer starts.</li>
        <li>Uncuff me: Sound Master can use hands for the entire round.</li>
        <li>Steal: one immediate guess during another team's round.</li>
        <li>Steal success keeps the card; steal failure burns the card.</li>
        <li>No lifelines during All-in rounds.</li>
      </ul>

      <h3>All-In</h3>
      <ol>
        <li>If die lands on All-in, Sound Master chooses any category.</li>
        <li>All teams can guess until timer runs out.</li>
        <li>First correct team gets points; simultaneous correct guesses can share points.</li>
      </ol>

      <h3>Winning</h3>
      <ul>
        <li>Choose a target score at setup.</li>
        <li>First team to reach the target wins.</li>
        <li>If multiple teams reach target together, start an all-in tiebreak round.</li>
      </ul>

      <h3>Mistakes (+1 To Other Team/s)</h3>
      <ul>
        <li>Each passed card in a normal round (not applicable in All-in).</li>
        <li>Unclasping hands from behind back without Uncuff me.</li>
        <li>Indicating directly toward something that makes up the word/scene on the card.</li>
        <li>Using a word other than onomatopoeia.</li>
        <li>Using onomatopoeia that forms part of the word/scene on the card.</li>
        <li>Using movement only with no sound.</li>
      </ul>
    </section>
  );
}
