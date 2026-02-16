export function LowdownCard() {
  return (
    <section className="panel lowdown-card">
      <h2>Lowdown Card</h2>
      <p className="muted">Quick reference for Sound Master rounds.</p>

      <h3>Do</h3>
      <ul>
        <li>Make sounds and movements only.</li>
        <li>Keep pace high; mark score at end of round.</li>
        <li>Rotate Sound Master through all players.</li>
      </ul>

      <h3>Do Not</h3>
      <ul>
        <li>Use normal spoken words.</li>
        <li>Use answer words or part-words as sounds.</li>
        <li>Point directly at the target object.</li>
        <li>Use lifelines before timer starts.</li>
      </ul>

      <h3>Penalty Triggers (+1 to all other teams)</h3>
      <ul>
        <li>Pass in a normal round.</li>
        <li>Hands unclasped without Uncuff me.</li>
        <li>Indicating directly toward the answer word/scene.</li>
        <li>Using words other than onomatopoeia.</li>
        <li>Using onomatopoeia that forms part of the answer word/scene.</li>
        <li>Using movement with no sound at all.</li>
      </ul>
    </section>
  );
}
