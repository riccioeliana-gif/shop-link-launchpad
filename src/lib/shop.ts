// The shop catalogue: everything the site knows about the shop's data files
// (src/data/links.csv, src/data/carousel.csv) and photos (src/assets/carousel/).
// Pages read resolved links, carousel items and photo URLs from here instead of
// parsing the CSVs themselves. A broken row fails the build with a clear message.
import { parseCsv } from "@/lib/csv";
import linksCsv from "@/data/links.csv?raw";
import carouselCsv from "@/data/carousel.csv?raw";

const photoFiles = import.meta.glob<{ default: string }>("../assets/carousel/*.webp", {
  eager: true,
});

/** URL of a photo in src/assets/carousel/, by filename. `usedBy` names the caller in errors. */
export function photoUrl(filename: string, usedBy: string): string {
  const entry = Object.entries(photoFiles).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`${usedBy} references "${filename}", but it isn't in src/assets/carousel/.`);
  }
  return entry[1].default;
}

export type ShopLinks = { instagram: string; vinted: string; email: string };

function readShopLinks(): ShopLinks {
  const values = Object.fromEntries(parseCsv(linksCsv).map((row) => [row["key"], row["value"]]));
  const get = (key: keyof ShopLinks) => {
    const value = values[key];
    if (!value) throw new Error(`links.csv is missing a value for "${key}".`);
    return value;
  };
  return { instagram: get("instagram"), vinted: get("vinted"), email: get("email") };
}

/** Site-wide links, editable in src/data/links.csv. */
export const SHOP_LINKS: ShopLinks = readShopLinks();

// `product` groups Vinted clicks by item even when two photos show the same
// piece (e.g. the product shot and the "worn" shot). Only Vinted links have it.
export type CarouselItem = {
  id: string;
  src: string;
  alt: string;
  href: string;
  kind: "vinted" | "instagram";
  product?: string;
};

/** Carousel photos in display order, editable in src/data/carousel.csv. */
export const CAROUSEL_ITEMS: CarouselItem[] = parseCsv(carouselCsv).map((row) => {
  const href = row["link"] === "instagram" ? SHOP_LINKS.instagram : (row["link"] ?? "");
  return {
    id: row["id"] ?? "",
    src: photoUrl(row["image"] ?? "", "carousel.csv"),
    alt: row["alt"] ?? "",
    href,
    kind: href.includes("vinted.") ? "vinted" : "instagram",
    ...(row["product"] ? { product: row["product"] } : {}),
  };
});
