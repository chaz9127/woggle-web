import { forwardRef } from 'react';

const Tile = forwardRef(function Tile({ tile, selected, selectionIndex, last, onClick }, ref) {
  const classes = ['tile'];
  if (selected) classes.push('tile--selected');
  if (last) classes.push('tile--last');
  return (
    <button
      ref={ref}
      type="button"
      data-tile-id={tile.id}
      className={classes.join(' ')}
      onClick={() => onClick(tile)}
      aria-label={`Letter ${tile.letter}${selected ? `, position ${selectionIndex + 1}` : ''}`}
    >
      <span className="tile__letter">{tile.letter}</span>
      <span className="tile__value">{tile.value}</span>
    </button>
  );
});

export default Tile;
