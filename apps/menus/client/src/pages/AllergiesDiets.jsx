import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allergiesApi, dietsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';

const SEVERITIES = [
  { value: 'LOW', label: 'נמוך', color: 'success' },
  { value: 'MEDIUM', label: 'בינוני', color: 'warning' },
  { value: 'HIGH', label: 'גבוה', color: 'danger' },
];

export default function AllergiesDiets() {
  const qc = useQueryClient();
  const [newAllergy, setNewAllergy] = useState({ name: '', icon: '', severity: 'MEDIUM' });
  const [newDiet, setNewDiet] = useState({ name: '', description: '' });

  const { data: allergies = [] } = useQuery({ queryKey: ['allergies'], queryFn: allergiesApi.list });
  const { data: diets = [] } = useQuery({ queryKey: ['diets'], queryFn: dietsApi.list });

  const addAllergy = useMutation({
    mutationFn: () => allergiesApi.create(newAllergy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allergies'] });
      setNewAllergy({ name: '', icon: '', severity: 'MEDIUM' });
    },
  });
  const delAllergy = useMutation({
    mutationFn: (id) => allergiesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allergies'] }),
  });
  const addDiet = useMutation({
    mutationFn: () => dietsApi.create(newDiet),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diets'] });
      setNewDiet({ name: '', description: '' });
    },
  });
  const delDiet = useMutation({
    mutationFn: (id) => dietsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diets'] }),
  });

  return (
    <div>
      <PageHeader title="אלרגיות ודיאטות" subtitle="ניהול רשימות בסיס" />

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">⚠️ אלרגנים</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="form-input" placeholder="שם אלרגן" value={newAllergy.name}
              onChange={e => setNewAllergy({ ...newAllergy, name: e.target.value })} />
            <input className="form-input" style={{ width: 70 }} placeholder="🌾" value={newAllergy.icon}
              onChange={e => setNewAllergy({ ...newAllergy, icon: e.target.value })} />
            <select className="form-select" value={newAllergy.severity}
              onChange={e => setNewAllergy({ ...newAllergy, severity: e.target.value })}>
              {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => addAllergy.mutate()} disabled={!newAllergy.name}>+</button>
          </div>
          <table className="table">
            <thead><tr><th>שם</th><th>חומרה</th><th></th></tr></thead>
            <tbody>
              {allergies.map(a => (
                <tr key={a.id}>
                  <td>{a.icon} {a.name}</td>
                  <td><span className={`badge badge-${SEVERITIES.find(s => s.value === a.severity)?.color}`}>
                    {SEVERITIES.find(s => s.value === a.severity)?.label}
                  </span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delAllergy.mutate(a.id)}>מחק</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">🥗 דיאטות</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="form-input" placeholder="שם דיאטה" value={newDiet.name}
              onChange={e => setNewDiet({ ...newDiet, name: e.target.value })} />
            <input className="form-input" placeholder="תיאור" value={newDiet.description}
              onChange={e => setNewDiet({ ...newDiet, description: e.target.value })} />
            <button className="btn btn-primary" onClick={() => addDiet.mutate()} disabled={!newDiet.name}>+</button>
          </div>
          <table className="table">
            <thead><tr><th>שם</th><th>תיאור</th><th></th></tr></thead>
            <tbody>
              {diets.map(d => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td style={{ color: '#6b7280', fontSize: 13 }}>{d.description}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delDiet.mutate(d.id)}>מחק</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
