const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  let word = '';
  let scaleIndex = 0;
  while (num > 0) {
    const part = num % 1000;
    if (part !== 0) {
      const partWord = convertToWords(part);
      word = partWord + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + ' ' + word;
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  return word.trim();
}

function convertToWords(num: number): string {
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  return (
    ones[Math.floor(num / 100)] +
    ' Hundred' +
    (num % 100 !== 0 ? ' ' + convertToWords(num % 100) : '')
  );
}
