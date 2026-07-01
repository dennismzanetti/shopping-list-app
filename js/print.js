// js/print.js — pretty-print a shopping list for in-store use
import { state } from './state.js';

export function printList() {
  const list = state.allLists.find(l => l.id === state.currentListId);
  if (!list) return;

  const items = [...state.allItems];

  // Separate unchecked (to-get) and checked (already gotten)
  const todo = items.filter(i => !i.checked);
  const done = items.filter(i => i.checked);

  // Group by category
  function groupByCategory(arr) {
    const map = {};
    arr.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }

  function renderItemRow(item, checked) {
    const qty   = item.qty  ? `<span class="qty">${item.qty}${item.unit ? '\u00a0' + item.unit : ''}</span>` : '';
    const notes = item.notes ? `<div class="item-notes">${item.notes}</div>` : '';
    return `
      <tr class="${checked ? 'item-done' : ''}">
        <td class="check-col"><span class="checkbox${checked ? ' checked' : ''}"></span></td>
        <td class="name-col">
          <span class="item-name">${item.name}</span>
          ${notes}
        </td>
        <td class="qty-col">${qty}</td>
      </tr>`;
  }

  function renderSection(groupedItems, sectionClass) {
    return Object.entries(groupedItems).map(([cat, catItems]) => {
      const rows = catItems.map(i => renderItemRow(i, sectionClass === 'done')).join('');
      return `
        <tr class="cat-row"><td colspan="3" class="cat-label">${cat}</td></tr>
        ${rows}`;
    }).join('');
  }

  // Store names
  const storeIds   = list.stores || (list.store ? [list.store] : []);
  const storeNames = storeIds
    .map(sid => state.allStores.find(s => s.id === sid)?.name)
    .filter(Boolean)
    .join(', ');

  const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const todoGroups = groupByCategory(todo);
  const doneGroups = groupByCategory(done);

  const todoRows = todo.length  ? renderSection(todoGroups, 'todo') : `<tr><td colspan="3" class="empty-row">All items checked off — great shopping!</td></tr>`;
  const doneSection = done.length ? `
    <tr class="section-divider"><td colspan="3"><span>Already in cart (${done.length})</span></td></tr>
    ${renderSection(doneGroups, 'done')}
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${list.name} — ShopList</title>
  <style>
    @page { margin: 0.75in; size: letter portrait; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .list-title {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }
    .list-meta {
      font-size: 9pt;
      color: #555;
      margin-top: 4px;
    }
    .print-date {
      font-size: 9pt;
      color: #555;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .check-col { width: 28px; padding: 5px 6px 5px 0; vertical-align: top; }
    .name-col  { padding: 5px 8px; vertical-align: top; }
    .qty-col   { width: 80px; text-align: right; padding: 5px 0 5px 8px; vertical-align: top; font-size: 10pt; color: #444; white-space: nowrap; }
    .checkbox {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #555;
      border-radius: 3px;
      vertical-align: middle;
      margin-top: 1px;
    }
    .checkbox.checked {
      background: #888;
      border-color: #888;
      position: relative;
    }
    .checkbox.checked::after {
      content: '';
      position: absolute;
      left: 3px; top: 0px;
      width: 5px; height: 9px;
      border: 2px solid #fff;
      border-top: none;
      border-left: none;
      transform: rotate(45deg);
    }
    .item-name { font-size: 11pt; font-weight: 500; }
    .item-notes { font-size: 9pt; color: #777; margin-top: 1px; }
    .qty { font-variant-numeric: tabular-nums; }
    .cat-row td {
      padding: 10px 0 3px 0;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:not(.cat-row):not(.section-divider):not(.empty-row) td {
      border-bottom: 1px solid #f0f0f0;
    }
    .item-done .item-name {
      text-decoration: line-through;
      color: #aaa;
    }
    .item-done .item-notes { color: #bbb; }
    .item-done .qty { color: #ccc; }
    .item-done .checkbox.checked { background: #ccc; border-color: #ccc; }
    .section-divider td {
      padding: 14px 0 4px;
      text-align: center;
    }
    .section-divider span {
      font-size: 8.5pt;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 2px 10px;
      border: 1px solid #ddd;
      border-radius: 20px;
    }
    .empty-row td { padding: 16px 0; text-align: center; color: #aaa; font-style: italic; font-size: 10pt; }
    footer {
      margin-top: 24px;
      border-top: 1px solid #ddd;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #bbb;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="list-title">${list.emoji ? list.emoji + '\u2002' : ''}${list.name}</div>
      ${storeNames ? `<div class="list-meta">📍 ${storeNames}</div>` : ''}
    </div>
    <div class="print-date">${dateStr}<br>${todo.length} item${todo.length !== 1 ? 's' : ''} remaining</div>
  </header>
  <table>
    <tbody>
      ${todoRows}
      ${doneSection}
    </tbody>
  </table>
  <footer>
    <span>ShopList</span>
    <span>Printed ${dateStr}</span>
  </footer>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=850,height=1000');
  if (!win) {
    alert('Please allow pop-ups for this site to use the print feature.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
