/**
 * columns: [{ key, header, render(row), align, tip }]
 * onRowClick makes rows clickable; `selectedKey` highlights one.
 */
export function Table({ columns, rows, rowKey, onRowClick, selectedKey, empty = 'Nothing to show.' }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.header}{c.tip}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]} className={`${onRowClick ? 'clickable' : ''} ${selectedKey === row[rowKey] ? 'selected' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'r num' : ''}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
