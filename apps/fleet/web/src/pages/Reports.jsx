import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => { api.get('/vehicles').then((r) => setVehicles(r.data)); }, []);

  function urlMonthly() { return `/api/reports/monthly.pdf?vehicleId=${vehicleId}&year=${year}&month=${month}`; }
  function urlAnnual() { return `/api/reports/annual.pdf?vehicleId=${vehicleId}&year=${year}`; }
  function urlMileage() { return `/api/reports/mileage-tax.pdf?year=${year}${vehicleId ? `&vehicleId=${vehicleId}` : ''}`; }

  return (
    <>
      <div className="page-header"><h2>דוחות PDF</h2></div>
      <div className="card">
        <div className="grid grid-3">
          <div><label>רכב</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">— הכל (לדוח נסועה) —</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} {v.make} {v.model}</option>)}
            </select>
          </div>
          <div><label>שנה</label><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
          <div><label>חודש</label><input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div>
        </div>
      </div>
      <div className="grid grid-3">
        <div className="card">
          <h3>דוח חודשי</h3>
          <p>הוצאות + נסועה לחודש מסוים</p>
          <a href={vehicleId ? urlMonthly() : '#'}><button disabled={!vehicleId}>הורד PDF</button></a>
        </div>
        <div className="card">
          <h3>דוח שנתי</h3>
          <p>פילוח הוצאות לפי חודשים, סך נסועה</p>
          <a href={vehicleId ? urlAnnual() : '#'}><button disabled={!vehicleId}>הורד PDF</button></a>
        </div>
        <div className="card">
          <h3>דוח נסועה למס</h3>
          <p>טופס מסכם נסיעות עסקיות לחישוב נכוי</p>
          <a href={urlMileage()}><button>הורד PDF</button></a>
        </div>
      </div>
    </>
  );
}
