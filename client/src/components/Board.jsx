import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Tile from './Tile';

export default function Board({ board, selection, onSelect }) {
  const containerRef = useRef(null);
  const tileRefs = useRef({});
  const [points, setPoints] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef({ active: false, lastId: null, suppressClick: false });

  const tileFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const btn = el.closest('[data-tile-id]');
    if (!btn) return null;
    const id = btn.getAttribute('data-tile-id');
    return board.find((t) => String(t.id) === id) || null;
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const tile = tileFromPoint(e.clientX, e.clientY);
    if (!tile) return;
    e.preventDefault();
    dragRef.current = { active: true, lastId: tile.id, suppressClick: true };
    onSelect(tile);
    try { containerRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    const tile = tileFromPoint(e.clientX, e.clientY);
    if (!tile || tile.id === dragRef.current.lastId) return;
    dragRef.current.lastId = tile.id;
    dragRef.current.suppressClick = true;
    onSelect(tile);
  };

  const endDrag = (e) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try { containerRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handleClickCapture = (e) => {
    if (dragRef.current.suppressClick) {
      dragRef.current.suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

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
    <div
      className="board"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={handleClickCapture}
      style={{ touchAction: 'none' }}
    >
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
