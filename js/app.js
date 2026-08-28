import { fillSaleDocx, saleFileName } from "./fill-docx.js?v=2";
import { numberToKazakhWords, numberToRussianWords } from "./money-words.js";

const form = document.querySelector("#deal-form");
const overlay = document.querySelector("#busy");
const errorBox = document.querySelector("#error");

function todayInput() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

form.elements.namedItem("dealDate").value = todayInput();

function parseAmount(value) {
  const n = Number(String(value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
  event.preventDefault();
});

function value(name) {
  return String(form.elements.namedItem(name)?.value ?? "").trim();
}

function optionalNumber(name) {
  const raw = value(name);
  if (!raw) return 0;
  const n = parseAmount(raw);
  return n == null ? 0 : n;
}

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const finalSalePrice = parseAmount(value("finalSalePrice"));
  const year = Number(value("year"));
  if (!form.reportValidity() || finalSalePrice === null || !Number.isFinite(year)) {
    showError("Заполните обязательные поля.");
    return;
  }

  const downPayment = optionalNumber("downPayment");
  const data = {
    id: value("dealNumber"),
    dealDate: value("dealDate"),
    finalSalePrice,
    downPayment,
    priceWordsKk: numberToKazakhWords(finalSalePrice),
    priceWordsRu: numberToRussianWords(finalSalePrice),
    buyer: {
      fullName: value("fullName"),
      iin: value("iin"),
      residenceCity: value("residenceCity"),
      residenceAddress: value("residenceAddress"),
      residenceApartment: value("residenceApartment"),
      idNumber: value("idNumber"),
      idIssuedBy: value("idIssuedBy"),
      mainPhone: value("mainPhone"),
    },
    car: {
      brand: value("brand"),
      model: value("model"),
      year,
      color: value("color"),
      colorKk: value("colorKk"),
      vin: value("vin"),
      engineVolume: value("engineVolume"),
      keyCount: optionalNumber("keyCount"),
    },
  };

  overlay.hidden = false;
  try {
    const response = await fetch("template/dkp.docx?v=1", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить шаблон");
    const template = await response.arrayBuffer();
    const blob = await fillSaleDocx(template, data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = saleFileName(data);
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : "Не удалось собрать документ");
  } finally {
    overlay.hidden = true;
  }
});
