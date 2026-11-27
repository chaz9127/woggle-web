// Wins / Losses / Ties as stat cards, styled like the daily recap.
export default function ChallengeRecord({ record }) {
  if (!record) return null;
  return (
    <div className="start__recap start__recap--three">
      <div className="start__recap-win">
        <span>Wins</span>
        <strong>{record.wins}</strong>
      </div>
      <div className="start__recap-loss">
        <span>Losses</span>
        <strong>{record.losses}</strong>
      </div>
      <div>
        <span>Ties</span>
        <strong>{record.draws}</strong>
      </div>
    </div>
  );
}
