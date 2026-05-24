import { useEffect, useState } from 'react';
import { coa } from '../api/client';

const TYPE_LABEL = {
  ASSET: 'נכס',
  LIABILITY: 'התחייבות',
  EQUITY: 'הון',
  REVENUE: 'הכנסה',
  EXPENSE: 'הוצאה',
};

export default function CoA() {
  const [tree, setTree] = useState([]);
  const refresh = () => coa.tree().then((r) => setTree(r.data));
  useEffect(refresh, []);

  return (
    <>
      <h1 className="page-title">תוכנית חשבונות (CoA)</h1>
      <div className="card">
        <h2>מבנה חשבונות הירארכי</h2>
        <Tree nodes={tree} />
      </div>
    </>
  );
}

function Tree({ nodes }) {
  return (
    <div>
      {nodes.map((n) => (
        <div key={n.id} className="tree-node">
          <div className="row">
            <strong>{n.code}</strong>
            <span>—</span>
            <span>{n.nameHe}</span>
            <span className="tag neutral">{TYPE_LABEL[n.type]}</span>
          </div>
          {n.children?.length > 0 && (
            <div className="tree-children">
              <Tree nodes={n.children} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
