import { Receipt } from '../types';

export const DEMO_RECEIPTS: Omit<Receipt, 'id' | 'scannedAt'>[] = [
  {
    merchant: 'Carrefour Market',
    date: '2026-05-28',
    totalAmount: 43.85,
    taxAmount: 2.45,
    currency: 'EUR',
    rawResponse:
      "Panier d'alimentation équilibré. Pour optimiser votre budget, privilégiez l'achat en vrac de certains ingrédients secs et préparez vos menus à l'avance pour éviter tout gaspillage.",
    items: [
      {
        id: 'item-1-1',
        name: 'Baguette de Campagne Bio',
        quantity: 2,
        price: 2.4,
        category: 'Alimentation',
      },
      {
        id: 'item-1-2',
        name: 'Filets de Saumon Atlantique x2',
        quantity: 1,
        price: 12.9,
        category: 'Alimentation',
      },
      {
        id: 'item-1-3',
        name: 'Tomates Cerises Grappe (500g)',
        quantity: 2,
        price: 4.8,
        category: 'Alimentation',
      },
      {
        id: 'item-1-4',
        name: 'Avocats Prêts à Manger x2',
        quantity: 1,
        price: 2.99,
        category: 'Alimentation',
      },
      {
        id: 'item-1-5',
        name: 'Eau Minérale Evian (6x1.5L)',
        quantity: 1,
        price: 4.2,
        category: 'Alimentation',
      },
      {
        id: 'item-1-6',
        name: 'Lessive Liquide Concentrée',
        quantity: 1,
        price: 11.5,
        category: 'Santé & Hygiène',
      },
      {
        id: 'item-1-7',
        name: 'Chocolat Noir 70% Équitable',
        quantity: 2,
        price: 5.06,
        category: 'Alimentation',
      },
    ],
  },
  {
    merchant: 'Darty Lyon',
    date: '2026-05-25',
    totalAmount: 189.99,
    taxAmount: 31.66,
    currency: 'EUR',
    rawResponse:
      "Achat technologique important. Pour ce type de matériel, l'achat en version reconditionnée ou l'utilisation d'extensions de garantie gratuites de vos cartes bancaires permet d'économiser jusqu'à 30% du coût initial.",
    items: [
      {
        id: 'item-2-1',
        name: 'Enceinte Connectée Bluetooth Smart-X',
        quantity: 1,
        price: 159.99,
        category: 'Électronique & Maison',
      },
      {
        id: 'item-2-2',
        name: 'Câble USB-C Haute Vitesse Nylon (1.5m)',
        quantity: 2,
        price: 19.98,
        category: 'Électronique & Maison',
      },
      {
        id: 'item-2-3',
        name: 'Piles Rechargeables AAA (Pack de 4)',
        quantity: 1,
        price: 10.02,
        category: 'Électronique & Maison',
      },
    ],
  },
  {
    merchant: 'Pharmacie de la Bastille',
    date: '2026-05-20',
    totalAmount: 32.4,
    taxAmount: 0.0,
    currency: 'EUR',
    rawResponse:
      "Dépense de parapharmacie. Pensez à comparer les prix des formats familiaux ou l'achat en ligne pour économiser sur les produits cosmétiques et de protection solaire de saison.",
    items: [
      {
        id: 'item-3-1',
        name: 'Crème Solaire Haute Protection SPF 50',
        quantity: 1,
        price: 18.5,
        category: 'Santé & Hygiène',
      },
      {
        id: 'item-3-2',
        name: 'Pastilles de Vitamine C Effervescentes',
        quantity: 2,
        price: 7.8,
        category: 'Santé & Hygiène',
      },
      {
        id: 'item-3-3',
        name: 'Pansements Elastiques Imperméables (Boite de 20)',
        quantity: 1,
        price: 6.1,
        category: 'Santé & Hygiène',
      },
    ],
  },
  {
    merchant: 'Fnac Saint-Lazare',
    date: '2026-05-15',
    totalAmount: 51.5,
    taxAmount: 2.8,
    currency: 'EUR',
    rawResponse:
      "Dépenses culturelles de loisirs. Astuce budget : l'inscription en bibliothèque municipale ou l'utilisation du pass Culture offre l'accès gratuit à de nombreux livres, romans et revues d'actualité.",
    items: [
      {
        id: 'item-4-1',
        name: "Roman 'L'Empire des Chimères'",
        quantity: 1,
        price: 22.0,
        category: 'Loisirs & Culture',
      },
      {
        id: 'item-4-2',
        name: "Livre d'Art Moderne Début du Siècle",
        quantity: 1,
        price: 24.5,
        category: 'Loisirs & Culture',
      },
      {
        id: 'item-4-3',
        name: 'Magazine Science & Culture N°843',
        quantity: 1,
        price: 5.0,
        category: 'Loisirs & Culture',
      },
    ],
  },
];

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; accent: string }
> = {
  Alimentation: {
    bg: 'bg-emerald-50/70',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    accent: 'bg-emerald-500',
  },
  'Loisirs & Culture': {
    bg: 'bg-indigo-50/70',
    text: 'text-indigo-700',
    border: 'border-indigo-100',
    accent: 'bg-indigo-500',
  },
  'Santé & Hygiène': {
    bg: 'bg-teal-50/70',
    text: 'text-teal-700',
    border: 'border-teal-100',
    accent: 'bg-teal-500',
  },
  'Mode & Habillement': {
    bg: 'bg-pink-50/70',
    text: 'text-pink-700',
    border: 'border-pink-100',
    accent: 'bg-pink-500',
  },
  'Électronique & Maison': {
    bg: 'bg-purple-50/70',
    text: 'text-purple-700',
    border: 'border-purple-100',
    accent: 'bg-purple-500',
  },
  'Transport & Carburant': {
    bg: 'bg-amber-50/70',
    text: 'text-amber-700',
    border: 'border-amber-100',
    accent: 'bg-amber-500',
  },
  'Services & Factures': {
    bg: 'bg-sky-50/70',
    text: 'text-sky-700',
    border: 'border-sky-100',
    accent: 'bg-sky-500',
  },
  Autre: {
    bg: 'bg-slate-50/70',
    text: 'text-slate-600',
    border: 'border-slate-100',
    accent: 'bg-slate-400',
  },
};
