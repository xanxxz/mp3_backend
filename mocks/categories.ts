export interface Category {
  id: string;
  name: string;
  parentId?: string;
  productCount: number;
  path: string; // путь для ссылок
}

export const categories: Category[] = [
  { id: '1', name: 'Каталог', productCount: 0, path: '/catalog' },
  { id: '2', name: 'Электроинструмент', parentId: '1', productCount: 3457, path: '/catalog/electroinstrument' },
  { id: '3', name: 'Ручной инструмент', parentId: '1', productCount: 1280, path: '/catalog/hand-tools' },
  { id: '4', name: 'Садовая техника', parentId: '1', productCount: 532, path: '/catalog/garden-machinery' },

  // Подкатегории электроинструмента
  { id: '5', name: 'Дрели и шуруповерты', parentId: '2', productCount: 890, path: '/catalog/electroinstrument/drills' },
  { id: '6', name: 'Перфораторы', parentId: '2', productCount: 450, path: '/catalog/electroinstrument/hammer-drills' },
  { id: '7', name: 'Шлифмашины', parentId: '2', productCount: 670, path: '/catalog/electroinstrument/grinders' },
  { id: '8', name: 'Граверы', parentId: '2', productCount: 210, path: '/catalog/electroinstrument/engravers' },

  // Подкатегории ручного инструмента
  { id: '9', name: 'Молотки', parentId: '3', productCount: 320, path: '/catalog/hand-tools/hammers' },
  { id: '10', name: 'Отвёртки', parentId: '3', productCount: 410, path: '/catalog/hand-tools/screwdrivers' },
  { id: '11', name: 'Плоскогубцы', parentId: '3', productCount: 550, path: '/catalog/stroyoptorg/hand-tools/pliers' },

  // Подкатегории садовой техники
  { id: '12', name: 'Газонокосилки', parentId: '4', productCount: 220, path: '/catalog/garden-machinery/lawn-mowers' },
  { id: '13', name: 'Триммеры', parentId: '4', productCount: 180, path: '/catalog/garden-machinery/trimmers' },
];
