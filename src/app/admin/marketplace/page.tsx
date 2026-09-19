import React from 'react';
import Link from 'next/link';

export default function MarketplaceDashboard() {
  const cards = [
    { title: 'Categories', desc: 'Manage wedding service categories, icons, and discovery visibility.', link: '/admin/marketplace/categories', color: 'bg-blue-50 text-blue-700' },
    { title: 'Listings & Promotion', desc: 'Review vendor readiness and toggle Featured/Sponsored tags.', link: '/admin/marketplace/listings', color: 'bg-emerald-50 text-emerald-700' },
    { title: 'Ranking Configuration', desc: 'Configure search radius and organic ranking signal weights.', link: '/admin/marketplace/configuration', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Marketplace Controls</h1>
      <p className="text-slate-600">Configure how vendors and services are discovered and ranked by customers.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {cards.map(c => (
          <Link href={c.link} key={c.title} className="block group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full transition-all hover:shadow-md hover:border-slate-300">
              <div className={\`w-12 h-12 rounded-lg flex items-center justify-center font-bold mb-4 \${c.color}\`}>
                {c.title.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 mb-2">{c.title}</h2>
              <p className="text-sm text-slate-500">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
