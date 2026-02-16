import { useMemo, useState } from 'react';
import type { SetupTeamInput } from '../../state/types';

export interface SetupConfig {
  teams: SetupTeamInput[];
  targetScore: number;
  turnSeconds: number;
  partyPlayEnabled: boolean;
}

interface SetupScreenProps {
  onStart: (config: SetupConfig) => void;
}

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;

function createDefaultTeams(): SetupTeamInput[] {
  return [
    { name: 'Team 1', players: ['Player 1', 'Player 2'] },
    { name: 'Team 2', players: ['Player 1', 'Player 2'] }
  ];
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [teams, setTeams] = useState<SetupTeamInput[]>(createDefaultTeams());
  const [targetScore, setTargetScore] = useState('30');
  const [turnSeconds, setTurnSeconds] = useState('60');
  const [partyPlayEnabled, setPartyPlayEnabled] = useState(false);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (teams.length < MIN_TEAMS || teams.length > MAX_TEAMS) {
      errors.push('Use 2 to 4 teams.');
    }

    teams.forEach((team, teamIndex) => {
      if (!team.name.trim()) {
        errors.push(`Team ${teamIndex + 1} needs a name.`);
      }
      if (team.players.length < 2) {
        errors.push(`${team.name || `Team ${teamIndex + 1}`} needs at least 2 players.`);
      }
      team.players.forEach((player, playerIndex) => {
        if (!player.trim()) {
          errors.push(`Team ${teamIndex + 1}, player ${playerIndex + 1} needs a name.`);
        }
      });
    });

    const parsedTarget = Number.parseInt(targetScore, 10);
    if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
      errors.push('Target score must be a positive whole number.');
    }

    const parsedTurnSeconds = Number.parseInt(turnSeconds, 10);
    if (!Number.isInteger(parsedTurnSeconds) || parsedTurnSeconds <= 0) {
      errors.push('Turn timer must be a positive whole number.');
    }

    return errors;
  }, [teams, targetScore, turnSeconds]);

  const canStart = validationErrors.length === 0;

  const updateTeamName = (teamIndex: number, value: string) => {
    setTeams((prev) =>
      prev.map((team, index) => (index === teamIndex ? { ...team, name: value } : team))
    );
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, value: string) => {
    setTeams((prev) =>
      prev.map((team, index) => {
        if (index !== teamIndex) {
          return team;
        }
        return {
          ...team,
          players: team.players.map((player, idx) => (idx === playerIndex ? value : player))
        };
      })
    );
  };

  const addTeam = () => {
    setTeams((prev) => {
      if (prev.length >= MAX_TEAMS) {
        return prev;
      }
      return [
        ...prev,
        {
          name: `Team ${prev.length + 1}`,
          players: ['Player 1', 'Player 2']
        }
      ];
    });
  };

  const removeTeam = (teamIndex: number) => {
    setTeams((prev) => {
      if (prev.length <= MIN_TEAMS) {
        return prev;
      }
      return prev.filter((_, index) => index !== teamIndex);
    });
  };

  const addPlayer = (teamIndex: number) => {
    setTeams((prev) =>
      prev.map((team, index) =>
        index === teamIndex
          ? {
              ...team,
              players: [...team.players, `Player ${team.players.length + 1}`]
            }
          : team
      )
    );
  };

  const removePlayer = (teamIndex: number, playerIndex: number) => {
    setTeams((prev) =>
      prev.map((team, index) => {
        if (index !== teamIndex || team.players.length <= 2) {
          return team;
        }
        return {
          ...team,
          players: team.players.filter((_, idx) => idx !== playerIndex)
        };
      })
    );
  };

  const handleStart = () => {
    if (!canStart) {
      return;
    }

    onStart({
      teams: teams.map((team) => ({
        name: team.name.trim(),
        players: team.players.map((player) => player.trim())
      })),
      targetScore: Number.parseInt(targetScore, 10),
      turnSeconds: Number.parseInt(turnSeconds, 10),
      partyPlayEnabled
    });
  };

  return (
    <section className="panel setup-panel">
      <h2>Voice Charades Setup</h2>
      <p className="muted">Official mode: 2-4 teams, minimum 2 players per team.</p>

      <div className="settings-grid">
        <label>
          Target score
          <input
            type="number"
            min={1}
            value={targetScore}
            onChange={(event) => setTargetScore(event.target.value)}
          />
        </label>

        <label>
          Turn timer (seconds)
          <input
            type="number"
            min={1}
            value={turnSeconds}
            onChange={(event) => setTurnSeconds(event.target.value)}
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={partyPlayEnabled}
            onChange={(event) => setPartyPlayEnabled(event.target.checked)}
          />
          Enable Party Play mode
        </label>
      </div>

      <div className="team-actions">
        <button type="button" onClick={addTeam} disabled={teams.length >= MAX_TEAMS}>
          Add Team
        </button>
      </div>

      <div className="team-list">
        {teams.map((team, teamIndex) => (
          <article key={`team-${teamIndex}`} className="team-card">
            <div className="row-between">
              <label>
                Team name
                <input
                  value={team.name}
                  onChange={(event) => updateTeamName(teamIndex, event.target.value)}
                />
              </label>
              <button type="button" onClick={() => removeTeam(teamIndex)}>
                Remove Team
              </button>
            </div>

            <h4>Players</h4>
            {team.players.map((player, playerIndex) => (
              <div className="row-between" key={`team-${teamIndex}-player-${playerIndex}`}>
                <input
                  value={player}
                  onChange={(event) =>
                    updatePlayerName(teamIndex, playerIndex, event.target.value)
                  }
                />
                <button type="button" onClick={() => removePlayer(teamIndex, playerIndex)}>
                  Remove
                </button>
              </div>
            ))}

            <button type="button" onClick={() => addPlayer(teamIndex)}>
              Add Player
            </button>
          </article>
        ))}
      </div>

      {validationErrors.length > 0 && (
        <ul className="error-list">
          {validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <button type="button" className="primary" onClick={handleStart} disabled={!canStart}>
        Start Voice Charades
      </button>
    </section>
  );
}
