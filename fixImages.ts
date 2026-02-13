import fs from 'fs';
import path from 'path';

const inputFile = path.join(__dirname, 'mocks/products.ts'); // твой исходный файл
const outputFile = path.join(__dirname, 'mocks/products.clean.ts');

let content = fs.readFileSync(inputFile, 'utf-8');

// Заменяем все импорты картинок на строки с путями
content = content.replace(/import\s+\w+\s+from\s+['"](.+?)['"];?/g, (_, p1) => {
  // возвращаем пустую строку, импорты не нужны
  return '';
});

// Заменяем все упоминания переменных картинок на строки
// например: gnida -> '/images/products/gnida.png'
const replacements: Record<string, string> = {
  gnida: '/images/products/gnida.png',
  gnida1: '/images/products/gnida1.png',
};

for (const key in replacements) {
  const value = replacements[key];
  const regex = new RegExp(`\\b${key}\\b`, 'g');
  content = content.replace(regex, `'${value}'`);
}

// Записываем новый файл
fs.writeFileSync(outputFile, content, 'utf-8');
console.log('✅ Новый productData создан в productData.clean.ts');
