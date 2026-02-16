import type { GameState } from '../../state/types';

interface ScorecardPanelProps {
  state: GameState;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function ScorecardPanel({ state }: ScorecardPanelProps) {
  return (
    <section className="panel">
      <h2>Scorecard</h2>

      <table className="score-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Score</th>
            <th>Uncuff</th>
            <th>Steal</th>
          </tr>
        </thead>
        <tbody>
          {state.teams
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((team) => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>{team.score}</td>
                <td>{team.uncuffRemaining}</td>
                <td>{team.stealRemaining}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h3>Game Log</h3>
      <ul className="log-list">
        {state.log.map((event) => (
          <li key={event.id}>
            <strong>{formatTime(event.timestamp)}</strong> - {event.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
