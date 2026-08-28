import { formatGroupedInt, numberToKazakhWords, numberToRussianWords } from "./money-words.js";

const SALE_VIN_PARTS = new Set(["Z", "94", "CT", "41", "DBBR", "043977"]);

function xmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function xmlUnescape(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"');
}

function plainText(xml) {
  return [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => xmlUnescape(match[1])).join("");
}

function kazakhParagraph(para) {
  return /теңге|Қазақ|[әғқңөұүһі]/i.test(para);
}

function joinAddress(city, street, apartment) {
  return [city, street, apartment].map((part) => part?.trim()).filter(Boolean).join(", ") || "—";
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(day)}.${pad(month)}.${year}`;
}

function engineVolumeText(volume) {
  if (volume == null) return "—";
  const raw = String(volume).trim();
  return raw || "—";
}

function salePhone(phone) {
  const digits = (phone ?? "").replace(/\D/g, "");
  let rest = digits;
  if ((rest.startsWith("7") || rest.startsWith("8")) && rest.length >= 11) rest = rest.slice(1);
  if (rest.length === 10) {
    return `8 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8, 10)}`;
  }
  return phone?.trim() || "—";
}

function saleInitials(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).map((part) => part[0]?.toUpperCase() ?? "").join(".")}`;
}

function replaceNamePlaceholders(xml, fullName) {
  const name = xmlEscape(fullName);
  return xml
    .replaceAll("Тегі Аты Әкесінің аты", name)
    .replaceAll("Тегі Аты Əкесінің аты", name)
    .replaceAll(">Фамилия Имя Отчество<", `>${name}<`)
    .replace(
      /(<w:t\b[^>]*>)Фамилия (<\/w:t>)([\s\S]*?<w:t\b[^>]*>)Имя(<\/w:t>)([\s\S]*?<w:t\b[^>]*>) (<\/w:t>)([\s\S]*?<w:t\b[^>]*>)Отчество(<\/w:t>)/g,
      `$1${name}$2$3$4$5$6$7$8`,
    );
}

function saleReplacement(green, para, ctx) {
  const token = green.trim();
  if (green === " " || green === "") return green;
  if (token === "Тегі Аты" || token === "Тегі Аты Əкесінің аты" || token === "Тегі Аты Әкесінің аты") {
    return ctx.fullName;
  }
  if (token === "Əкесінің" || token === "Әкесінің" || token === "аты") return "";
  if (token === "Фамилия Имя Отчество" || token === "ФИО" || token === "Фамилия") return ctx.fullName;
  if (token === "Имя" || token === "Отчество") return "";
  if (token === "*") return ctx.number;
  if (token === "Дата" || token === "дата") return ctx.date;
  if (green === "HYUNDAI ACCENT") return ctx.carTitle;
  if (green === "2011") return ctx.year;
  if (green === "АҚ") return ctx.colorKk;
  if (green === "WHITE") return ctx.colorRu;
  if (green === "Z94CT41DBBR043977") return ctx.vin;
  if (SALE_VIN_PARTS.has(green) || SALE_VIN_PARTS.has(token)) {
    if (!ctx.vinSpreadDone) {
      ctx.vinSpreadDone = true;
      return ctx.vin;
    }
    return "";
  }
  if (green === "1600") return ctx.volume;
  if (green === "1") return ctx.keys;
  if (token === "* *** ***") return ctx.priceGrouped;
  if (token === "*** ***") return ctx.pvGrouped;
  if (token === "цена прописью" || token === "цена") {
    return kazakhParagraph(para) ? ctx.priceWordsKk : ctx.priceWordsRu;
  }
  if (token === "пв") return kazakhParagraph(para) ? ctx.pvWordsKk : ctx.pvWordsRu;
  if (token === "прописью") return "";
  if (green === "Сейдуәли") return ctx.fullName;
  if (green === " Мәдина Нұрланқызы") return "";
  if (green === "031031650396") return ctx.iin;
  if (green === "Мкрн") return ctx.fullAddress;
  if (green === " 18,дом 24,кв 37") return "";
  if (green === "046940662") return ctx.idNumber;
  if (green === "МВД РК") return ctx.issuedBy;
  if (green === "8 776 507 57 88") return ctx.phone;
  if (green === "Сейдуәли.М.Н") return ctx.shortFio;
  return green;
}

function makeFillCtx(data) {
  const city = data.buyer.residenceCity?.trim() || "";
  const street = data.buyer.residenceAddress?.trim() || "";
  const apartment = data.buyer.residenceApartment?.trim() || "";
  const price = data.finalSalePrice;
  const pv = data.downPayment || 0;
  return {
    number: String(data.id),
    date: formatDate(data.dealDate),
    carTitle: `${data.car.brand} ${data.car.model}`.trim() || "—",
    year: String(data.car.year),
    colorKk: data.car.colorKk?.trim() || data.car.color?.trim() || "—",
    colorRu: data.car.color?.trim() || "—",
    vin: data.car.vin?.trim() || "—",
    volume: engineVolumeText(data.car.engineVolume),
    keys: data.car.keyCount != null ? String(data.car.keyCount) : "—",
    priceGrouped: formatGroupedInt(price),
    priceWordsKk: numberToKazakhWords(price),
    priceWordsRu: numberToRussianWords(price),
    pvGrouped: formatGroupedInt(pv),
    pvWordsKk: numberToKazakhWords(pv),
    pvWordsRu: numberToRussianWords(pv),
    fullName: data.buyer.fullName || "—",
    iin: data.buyer.iin?.trim() || "—",
    fullAddress: joinAddress(city, street, apartment),
    idNumber: data.buyer.idNumber?.trim() || "—",
    issuedBy: data.buyer.idIssuedBy?.trim() || "—",
    phone: salePhone(data.buyer.mainPhone),
    shortFio: saleInitials(data.buyer.fullName || ""),
    vinSpreadDone: false,
  };
}

function fillXml(xml, ctx) {
  const filled = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => {
    const full = plainText(para);
    return para.replace(/<w:r\b[\s\S]*?<\/w:r>/g, (run) => {
      if (!/w:val="green"/.test(run)) return run;
      return run.replace(/<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g, (_match, attrs, text) => {
        return `<w:t${attrs}>${xmlEscape(saleReplacement(xmlUnescape(text), full, ctx))}</w:t>`;
      });
    });
  });
  return replaceNamePlaceholders(filled, ctx.fullName);
}

function stripGreenHighlight(xml) {
  return xml
    .replace(/<w:highlight\b[^>]*w:val="green"[^/]*\/>/gi, "")
    .replace(/<w:highlight\b[^>]*w:val="green"[^>]*>\s*<\/w:highlight>/gi, "");
}

function repairBrokenTags(xml) {
  return xml.replaceAll("<<w:", "<w:");
}

export async function fillSaleDocx(templateBuffer, data) {
  const zip = await window.JSZip.loadAsync(templateBuffer);
  const ctx = makeFillCtx(data);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml") || zip.files[name].dir) continue;
    const xml = await zip.file(name).async("string");
    const repaired = repairBrokenTags(xml);
    const shouldFill = repaired.includes('w:val="green"') || repaired.includes("Фамилия Имя Отчество");
    const filled = shouldFill ? fillXml(repaired, ctx) : repaired;
    const next = shouldFill ? stripGreenHighlight(filled) : repaired;
    if (next !== xml) zip.file(name, next);
  }
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function fileSafe(value) {
  return value.replace(/\s+/g, "").replace(/[\\/:*?"<>|]/g, "");
}

export function saleFileName(data) {
  return `№${data.id}_${fileSafe(data.car.brand)}${fileSafe(data.car.model)}_${data.car.year}.docx`;
}
