import { prisma } from '@/lib/db';
import { recipeCost, applyMarkup } from '@/lib/cost';

export const dynamic = 'force-dynamic';

export default async function PrintSheet({ params, searchParams }: { params: { vid: string }; searchParams: { guests?: string } }) {
  const v = await prisma.recipeVersion.findUnique({
    where: { id: params.vid },
    include: { ingredients: { include: { product: true } }, recipe: true }
  });
  if (!v) return <p>לא נמצא.</p>;
  const guests = Number(searchParams.guests ?? v.servings);
  const scale = guests / v.servings;
  const cost = await recipeCost(v.id, scale);
  const sale = applyMarkup(cost.total, v.recipe.markupPct);

  return (
    <div className="print-page bg-white p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-baseline justify-between border-b pb-2 mb-4">
        <h1 className="text-3xl font-bold">{v.recipe.name}</h1>
        <div className="text-sm text-stone-600">{v.tier} · {v.label}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <div><strong>מנות:</strong> {Math.round(v.servings * scale)}</div>
        <div><strong>זמן הכנה:</strong> {Math.ceil(v.prepMinutes * Math.sqrt(scale))} דק'</div>
        <div><strong>זמן בישול:</strong> {v.cookMinutes} דק'</div>
      </div>

      <h2 className="font-semibold text-lg mb-2">חומרי גלם</h2>
      <table className="w-full text-sm border mb-4">
        <thead className="bg-stone-100"><tr><th className="text-right p-2">מוצר</th><th>כמות</th><th>יחידה</th></tr></thead>
        <tbody>
          {v.ingredients.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="p-2">{i.product.name}</td>
              <td className="text-center">{(i.qty * scale).toFixed(2)}</td>
              <td className="text-center">{i.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-semibold text-lg mb-2">הוראות הכנה</h2>
      <pre className="whitespace-pre-wrap text-sm font-sans bg-stone-50 p-3 rounded mb-4">{v.instructions || '—'}</pre>

      <div className="border-t pt-2 text-sm grid grid-cols-2">
        <div>עלות כוללת: <strong>{cost.total.toFixed(2)} ₪</strong></div>
        <div>עלות למנה: <strong>{cost.perServing.toFixed(2)} ₪</strong></div>
        <div>Markup: <strong>{v.recipe.markupPct}%</strong></div>
        <div>מחיר מכירה למנה: <strong>{(sale / (v.servings * scale)).toFixed(2)} ₪</strong></div>
      </div>

      <div className="no-print mt-6 text-center">
        <button onClick={() => (typeof window !== 'undefined') && window.print()} className="btn">הדפסה</button>
      </div>
    </div>
  );
}
