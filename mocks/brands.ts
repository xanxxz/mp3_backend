export interface Brand {
  id: string;
  name: string;
  productCount: number;
  categoryIds: string[]; // в каких категориях есть товары бренда
}

export const brands: Brand[] = [
  {
    id: 'bosch',
    name: 'Bosch',
    productCount: 120,
    categoryIds: ['2', '4', '5', '6', '7'],
  },
  {
    id: 'makita',
    name: 'Makita',
    productCount: 98,
    categoryIds: ['2', '4', '5', '6'],
  },
  {
    id: 'dewalt',
    name: 'DeWalt',
    productCount: 76,
    categoryIds: ['2', '7', '8'],
  },
  {
    id: 'metabo',
    name: 'Metabo',
    productCount: 54,
    categoryIds: ['3', '6', '7'],
  },
];
