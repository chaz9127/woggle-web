import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Tile from './Tile';

export default function Board({ board, selection, onSelect }) {
  const containerRef = useRef(null);
  const tileRefs = useRef({});
  const [points, setPoints] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const computePoints = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setSize({ w: cRect.width, h: cRect.height });
    const pts = selection.map((tile) => {
      const el = tileRefs.current[tile.id];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cRect.left + r.width / 2,
        y: r.top - cRect.top + r.height / 2,
      };
    }).filter(Boolean);
    setPoints(pts);
  };

  useLayoutEffect(() => {
    computePoints();
  }, [selection, board]);

  useEffect(() => {
    const onResize = () => computePoints();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  const selectionMap = new Map(selection.map((t, i) => [t.id, i]));
  const lastId = selection.length ? selection[selection.length - 1].id : null;

  return (
    <div className="board" ref={containerRef}>
      <svg
        className="board__overlay"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        aria-hidden="true"
      >
        {points.length > 1 && (
          <polyline
            className="board__path"
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} className="board__node" cx={p.x} cy={p.y} r={6} />
        ))}
      </svg>
      <div className="board__grid">
        {board.map((tile) => (
          <Tile
            key={tile.id}
            ref={(el) => {
              if (el) tileRefs.current[tile.id] = el;
              else delete tileRefs.current[tile.id];
            }}
            tile={tile}
            selected={selectionMap.has(tile.id)}
            selectionIndex={selectionMap.get(tile.id) ?? -1}
            last={tile.id === lastId}
            onClick={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
