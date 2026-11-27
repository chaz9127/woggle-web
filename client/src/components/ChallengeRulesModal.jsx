import Modal from './Modal';

export default function ChallengeRulesModal({ open, onClose }) {
  return (
    <Modal open={open} title="Challenge Rules" onClose={onClose}>
      <ul className="rules">
        <li>
          Start a challenge to get a 4-character code, then share the link or
          code with one friend. Each challenge has exactly two players.
        </li>
        <li>
          You both play the same private board, separate from the daily puzzle,
          each in your own 2-minute run whenever suits you.
        </li>
        <li>
          You get one run. Once you press Play the clock is running, even if you
          close or refresh the page.
        </li>
        <li>
          Scores and words stay hidden until you've both finished. Highest score
          wins; a tied score goes to whoever found more words, and if that's
          tied too it's a draw.
        </li>
        <li>
          The creator can retract a challenge any time before it finishes. A
          retracted challenge ends for both players and no results are shown.
        </li>
        <li>
          If you're challenged, you can reject it any time before you start your
          run. It ends for both players, no results are shown, and it stays in
          both players' history without counting toward anyone's wins, losses or
          ties.
        </li>
        <li>
          Challenges don't count toward your daily streak, stats or the
          leaderboard.
        </li>
      </ul>
    </Modal>
  );
}
