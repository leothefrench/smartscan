import { Receipt, ReceiptCategory } from '../types';
import { CATEGORY_COLORS } from '../data/demoReceipts';
import { Sparkles, CreditCard, ShoppingBag, PieChart } from 'lucide-react';

interface StatsOverviewProps {
  receipts: Receipt[];
}

export default function StatsOverview({ receipts }: StatsOverviewProps) {
  // Compute analytics
  const totalSpent = receipts.reduce((acc, r) => acc + r.totalAmount, 0);
  const totalCount = receipts.length;
  const averageSpent = totalCount > 0 ? totalSpent / totalCount : 0;

  // Category sum calculation
  const categorySums = receipts.reduce((acc, r) => {
    r.items.forEach((item) => {
      const cat = item.category || 'Autre';
      acc[cat] = (acc[cat] || 0) + item.price;
    });
    return acc;
  }, {} as Record<string, number>);

  // Sort categories by amount spent
  const sortedCategories = (Object.keys(CATEGORY_COLORS) as ReceiptCategory[])
    .map((cat) => ({
      name: cat,
      amount: categorySums[cat] || 0,
      percentage:
        totalSpent > 0 ? ((categorySums[cat] || 0) / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory =
    sortedCategories[0]?.amount > 0 ? sortedCategories[0] : null;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      id="stats-container"
    >
      {/* Total Spent Bento Card */}
      <div
        className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-between"
        id="stat-card-total"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Dépenses Totales
          </span>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <CreditCard size={18} />
          </div>
        </div>
        <div className="my-4">
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {totalSpent.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Basé sur{' '}
            <span className="font-semibold text-zinc-200">
              {totalCount} ticket{totalCount > 1 ? 's' : ''}
            </span>{' '}
            numérisé{totalCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Panier moyen par ticket :</span>
          <span className="font-bold text-white">
            {averageSpent.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        </div>
      </div>

      {/* Main Focus / Top Spending Category */}
      <div
        className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-between"
        id="stat-card-focus"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Poste Principal
          </span>
          <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-300">
            <ShoppingBag size={18} />
          </div>
        </div>
        <div className="my-4">
          {topCategory ? (
            <>
              <div className="text-2xl font-bold text-white tracking-tight truncate">
                {topCategory.name}
              </div>
              <div className="text-base font-semibold text-emerald-400 mt-0.5">
                {topCategory.amount.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
                <span className="text-xs text-zinc-400 font-normal ml-1">
                  ({topCategory.percentage.toFixed(1)}%)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-medium text-zinc-500 italic">
                Aucun ticket encore scanné
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                Glissez un ticket d'exemple pour tester.
              </div>
            </>
          )}
        </div>
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Analyse :</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <Sparkles size={14} className="animate-pulse text-emerald-400" />{' '}
            Automatisée par l'IA
          </span>
        </div>
      </div>

      {/* Category Distribution Bento Card */}
      <div
        className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800"
        id="stat-card-categories"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Répartition des Coûts
          </span>
          <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300 border border-zinc-800">
            <PieChart size={16} />
          </div>
        </div>
        <div className="space-y-3 max-h-35 overflow-y-auto pr-1">
          {totalSpent > 0 ? (
            sortedCategories
              .filter((c) => c.amount > 0)
              .map((cat) => {
                const colors =
                  CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['Autre'];
                // Map background color values beautifully for high contrast in dark mode
                let customBg = 'bg-zinc-600';
                const catStr = String(cat.name);
                if (catStr.includes('Alimentation'))
                  customBg = 'bg-emerald-500';
                else if (catStr.includes('Transport')) customBg = 'bg-blue-500';
                else if (catStr.includes('Loisirs')) customBg = 'bg-purple-500';
                else if (catStr.includes('Maison')) customBg = 'bg-orange-500';
                else if (catStr.includes('Hygiène')) customBg = 'bg-cyan-500';
                else if (catStr.includes('Mode')) customBg = 'bg-pink-500';
                else if (catStr.includes('Services'))
                  customBg = 'bg-indigo-505';

                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-300">
                        {cat.name}
                      </span>
                      <span className="text-zinc-400 font-mono font-medium">
                        {cat.amount.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800/60">
                      <div
                        className={`h-full ${customBg} rounded-full transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-xs text-zinc-500 italic">
                Données de répartition inutilisées
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
