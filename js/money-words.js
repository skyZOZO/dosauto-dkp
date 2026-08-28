const ONES = [
  "",
  "один",
  "два",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function triad(n, female) {
  const words = [];
  words.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest < 20) {
    let one = ONES[rest];
    if (female && rest === 1) one = "одна";
    if (female && rest === 2) one = "две";
    words.push(one);
  } else {
    words.push(TENS[Math.floor(rest / 10)]);
    let one = ONES[rest % 10];
    if (female && rest % 10 === 1) one = "одна";
    if (female && rest % 10 === 2) one = "две";
    words.push(one);
  }
  return words.filter(Boolean).join(" ");
}

function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function numberToRussianWords(value) {
  const n = Math.round(Math.abs(value));
  if (n === 0) return "ноль";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (millions) parts.push(triad(millions, false), plural(millions, ["миллион", "миллиона", "миллионов"]));
  if (thousands) parts.push(triad(thousands, true), plural(thousands, ["тысяча", "тысячи", "тысяч"]));
  if (rest) parts.push(triad(rest, false));
  return parts.filter(Boolean).join(" ");
}

const KK_ONES = ["", "бір", "екі", "үш", "төрт", "бес", "алты", "жеті", "сегіз", "тоғыз"];
const KK_TENS = ["", "он", "жиырма", "отыз", "қырық", "елу", "алпыс", "жетпіс", "сексен", "тоқсан"];

function kazakhBelowThousand(n) {
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  if (hundreds === 1) parts.push("жүз");
  else if (hundreds > 1) parts.push(`${KK_ONES[hundreds]} жүз`);
  if (rem >= 10) {
    parts.push(KK_TENS[Math.floor(rem / 10)]);
    if (rem % 10) parts.push(KK_ONES[rem % 10]);
  } else if (rem) {
    parts.push(KK_ONES[rem]);
  }
  return parts.join(" ");
}

export function numberToKazakhWords(value) {
  const n = Math.round(Math.abs(value));
  if (n === 0) return "нөл";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (millions) parts.push(millions === 1 ? "миллион" : `${kazakhBelowThousand(millions)} миллион`);
  if (thousands) parts.push(thousands === 1 ? "мың" : `${kazakhBelowThousand(thousands)} мың`);
  if (rest) parts.push(kazakhBelowThousand(rest));
  return parts.filter(Boolean).join(" ");
}

export function formatGroupedInt(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value)).replace(/\u00A0/g, " ");
}
