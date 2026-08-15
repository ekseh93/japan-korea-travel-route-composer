import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const { URL, URLSearchParams, fetch, console } = globalThis;
const repositoryRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const outputRoot = join(repositoryRoot, "data", "catalog-v1");
const checkedAt = process.env.CATALOG_CHECKED_AT ?? "2026-08-16";
const reviewDueAt = process.env.CATALOG_REVIEW_DUE_AT ?? "2026-11-16";
const overpassEndpoint = "https://overpass-api.de/api/interpreter";

const citySpecs = [
  {
    cityId: "TOKYO",
    directory: "tokyo",
    timezone: "Asia/Tokyo",
    bbox: "35.60,139.65,35.75,139.85",
    zones: {
      TOKYO_SHIBUYA_HARAJUKU: [35.665, 139.705],
      TOKYO_SHINJUKU: [35.695, 139.705],
      TOKYO_GINZA_MARUNOUCHI: [35.675, 139.765],
      TOKYO_ASAKUSA_UENO: [35.715, 139.795],
      TOKYO_AKIHABARA_KANDA: [35.7, 139.775],
      TOKYO_ROPPONGI_AKASAKA: [35.67, 139.735],
      TOKYO_ODAIBA_TOYOSU: [35.645, 139.795],
      TOKYO_NAKAMEGURO_DAIKANYAMA: [35.645, 139.705],
    },
  },
  {
    cityId: "SEOUL",
    directory: "seoul",
    timezone: "Asia/Seoul",
    bbox: "37.48,126.88,37.62,127.12",
    zones: {
      SEOUL_HONGDAE_YEONNAM: [37.56, 126.925],
      SEOUL_MYEONGDONG_NAMSAN: [37.56, 126.985],
      SEOUL_JONGNO_BUKCHON: [37.58, 126.995],
      SEOUL_GANGNAM: [37.505, 127.04],
      SEOUL_SEONGSU_SEOULFOREST: [37.545, 127.055],
      SEOUL_ITAEWON_HANNAM: [37.54, 127.0],
      SEOUL_JAMSIL: [37.51, 127.095],
      SEOUL_YEOUIDO: [37.525, 126.935],
    },
  },
];

const sourceRecord = {
  sourceId: "geo_osm",
  providerName: "OpenStreetMap contributors",
  baseUrl: "https://www.openstreetmap.org",
  termsUrl: "https://www.openstreetmap.org/copyright",
  robotsUrl: "https://www.openstreetmap.org/robots.txt",
  licenseId: "ODbL-1.0",
  collectionMode: "API",
  allowedFields: ["NAME", "COORDINATES", "CATEGORY"],
  forbiddenFields: [
    "REVIEW_TEXT",
    "USER_PROFILE",
    "USER_NAME",
    "PHOTO_BINARY",
    "RATING_AGGREGATE",
    "HTML_SNAPSHOT",
    "SEARCH_SNIPPET",
  ],
  attributionTemplate:
    "© OpenStreetMap contributors; data available under the Open Database License (ODbL)",
  reviewStatus: "APPROVED_OPEN",
  checkedAt,
  nextReviewAt: reviewDueAt,
  removalContact: "https://www.openstreetmap.org/fixthemap",
  reviewNotes: `Checked ${checkedAt}. Queried the public Overpass API for named tourism, historic, leisure, amenity, and shop objects within the defined Tokyo and Seoul bounding boxes. Only name, coordinates, and OSM tag-derived category are imported. Reviews, photos, user data, HTML, snippets, opening hours, prices, and accessibility claims are excluded. Attribution and ODbL share-alike obligations are recorded in data/catalog-v1/NOTICE.md.`,
};

const categoryLabels = {
  ko: {
    DISTRICT_WALK: "거리 산책 장소",
    LANDMARK: "랜드마크",
    CULTURE_SITE: "문화 장소",
    MUSEUM_GALLERY: "박물관·갤러리",
    PARK_NATURE: "공원·자연 장소",
    MARKET_FOOD: "시장·먹거리 장소",
    RESTAURANT: "음식점",
    CAFE_DESSERT: "카페·디저트 장소",
    SHOPPING: "쇼핑 장소",
    VIEWPOINT: "전망 장소",
    EXPERIENCE: "체험 장소",
    NIGHTLIFE_AREA: "야간 지역",
  },
  ja: {
    DISTRICT_WALK: "街歩きスポット",
    LANDMARK: "ランドマーク",
    CULTURE_SITE: "文化スポット",
    MUSEUM_GALLERY: "博物館・ギャラリー",
    PARK_NATURE: "公園・自然スポット",
    MARKET_FOOD: "市場・飲食スポット",
    RESTAURANT: "飲食店",
    CAFE_DESSERT: "カフェ・デザートスポット",
    SHOPPING: "ショッピングスポット",
    VIEWPOINT: "展望スポット",
    EXPERIENCE: "体験スポット",
    NIGHTLIFE_AREA: "夜のエリア",
  },
  en: {
    DISTRICT_WALK: "district walk",
    LANDMARK: "landmark",
    CULTURE_SITE: "cultural site",
    MUSEUM_GALLERY: "museum or gallery",
    PARK_NATURE: "park or nature site",
    MARKET_FOOD: "market or food place",
    RESTAURANT: "restaurant",
    CAFE_DESSERT: "cafe or dessert place",
    SHOPPING: "shopping place",
    VIEWPOINT: "viewpoint",
    EXPERIENCE: "experience place",
    NIGHTLIFE_AREA: "nightlife area",
  },
};

function overpassQuery(bbox) {
  return `[out:json][timeout:180];(
  nwr["name"]["tourism"~"attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park|artwork"](${bbox});
  nwr["name"]["historic"](${bbox});
  nwr["name"]["leisure"~"park|garden|nature_reserve|sports_centre"](${bbox});
  nwr["name"]["amenity"~"marketplace|arts_centre|theatre|cinema|cafe|restaurant"](${bbox});
  nwr["name"]["shop"~"mall|department_store"](${bbox});
);out center tags;`;
}

async function fetchElements(city) {
  const response = await fetch(overpassEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "japan-korea-travel-route-composer/0.1 (portfolio catalog import)",
    },
    body: new URLSearchParams({ data: overpassQuery(city.bbox) }),
  });
  if (!response.ok) {
    throw new Error(
      `Overpass request failed for ${city.cityId}: ${response.status} ${response.statusText}`,
    );
  }
  const payload = await response.json();
  if (!Array.isArray(payload.elements))
    throw new Error(`Overpass response had no elements for ${city.cityId}.`);
  return payload.elements;
}

function coordinatesOf(element) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (
    element.center &&
    typeof element.center.lat === "number" &&
    typeof element.center.lon === "number"
  ) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return undefined;
}

function distanceSquared(coordinates, center) {
  const latitude = coordinates.latitude - center[0];
  const longitude = coordinates.longitude - center[1];
  return latitude * latitude + longitude * longitude;
}

function assignZone(coordinates, zones) {
  return Object.entries(zones).sort(
    ([, left], [, right]) =>
      distanceSquared(coordinates, left) - distanceSquared(coordinates, right),
  )[0][0];
}

function categoryOf(tags) {
  if (tags.tourism === "viewpoint") return "VIEWPOINT";
  if (["museum", "gallery"].includes(tags.tourism)) return "MUSEUM_GALLERY";
  if (["zoo", "aquarium", "theme_park"].includes(tags.tourism)) return "EXPERIENCE";
  if (["attraction", "artwork"].includes(tags.tourism)) return "LANDMARK";
  if (tags.historic) return "CULTURE_SITE";
  if (["park", "garden", "nature_reserve", "sports_centre"].includes(tags.leisure))
    return "PARK_NATURE";
  if (tags.amenity === "marketplace") return "MARKET_FOOD";
  if (tags.amenity === "cafe") return "CAFE_DESSERT";
  if (tags.amenity === "restaurant") return "RESTAURANT";
  if (["arts_centre", "theatre", "cinema"].includes(tags.amenity)) return "CULTURE_SITE";
  if (["mall", "department_store"].includes(tags.shop)) return "SHOPPING";
  return "DISTRICT_WALK";
}

function themeTagsFor(category) {
  const values = {
    DISTRICT_WALK: ["LOCAL_MOOD"],
    LANDMARK: ["CULTURE_HISTORY", "LOCAL_MOOD"],
    CULTURE_SITE: ["CULTURE_HISTORY", "ART_DESIGN"],
    MUSEUM_GALLERY: ["CULTURE_HISTORY", "ART_DESIGN"],
    PARK_NATURE: ["NATURE_PARK", "RELAXATION"],
    MARKET_FOOD: ["FOOD", "LOCAL_MOOD"],
    RESTAURANT: ["FOOD"],
    CAFE_DESSERT: ["CAFE", "RELAXATION"],
    SHOPPING: ["SHOPPING"],
    VIEWPOINT: ["NIGHT_VIEW", "LOCAL_MOOD"],
    EXPERIENCE: ["KIDS_FAMILY", "LOCAL_MOOD"],
    NIGHTLIFE_AREA: ["NIGHT_VIEW", "LOCAL_MOOD"],
  };
  return values[category];
}

function typicalDurationFor(category) {
  return {
    DISTRICT_WALK: 60,
    LANDMARK: 60,
    CULTURE_SITE: 90,
    MUSEUM_GALLERY: 120,
    PARK_NATURE: 75,
    MARKET_FOOD: 75,
    RESTAURANT: 75,
    CAFE_DESSERT: 60,
    SHOPPING: 120,
    VIEWPOINT: 45,
    EXPERIENCE: 120,
    NIGHTLIFE_AREA: 90,
  }[category];
}

function namesFor(tags) {
  const local = tags.name ?? tags.int_name;
  if (!local) return undefined;
  return {
    ...(tags["name:ko"] ? { ko: tags["name:ko"] } : {}),
    ...(tags["name:ja"] ? { ja: tags["name:ja"] } : {}),
    ...(tags["name:en"] ? { en: tags["name:en"] } : {}),
    ...(tags["name:ko"] || tags["name:ja"] || tags["name:en"] ? {} : { en: local }),
  };
}

function editorialSummary(city, category, names) {
  const label = categoryLabels.en[category];
  const name = names.en ?? names.ja ?? names.ko;
  return {
    ko: `OpenStreetMap에 등록된 ${label} ${name}입니다. 운영시간·요금·접근성은 여행 전에 공식 정보를 확인해야 합니다.`,
    ja: `OpenStreetMapに登録された${label}「${name}」です。営業時間・料金・アクセシビリティは旅行前に公式情報を確認してください。`,
    en: `${name} is listed in OpenStreetMap as a ${label} in ${city}. Verify opening hours, price, and accessibility with an official source before travel.`,
  };
}

function objectUrl(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function toRecord(city, element, index) {
  const tags = element.tags ?? {};
  const coordinates = coordinatesOf(element);
  const names = namesFor(tags);
  if (!coordinates || !names) return undefined;
  const category = categoryOf(tags);
  const suffix = `${element.type}_${element.id}`;
  const placeId = `pl_${city.directory}_osm_${suffix}`;
  const evidenceId = `ev_${city.directory}_osm_${suffix}`;
  return {
    place: {
      placeId,
      cityId: city.cityId,
      zoneId: assignZone(coordinates, city.zones),
      names,
      coordinates,
      category,
      themeTags: themeTagsFor(category),
      companionFit: ["SOLO", "FRIEND", "COUPLE", "FAMILY"],
      costBand: "UNKNOWN",
      indoorOutdoor: ["PARK_NATURE", "VIEWPOINT"].includes(category) ? "OUTDOOR" : "UNKNOWN",
      typicalDurationMinutes: typicalDurationFor(category),
      openingSchedule: {
        status: "UNKNOWN",
        timezone: city.timezone,
        weekly: {},
        exceptions: [],
        checkedAt,
      },
      accessibility: ["UNKNOWN"],
      evidenceRefs: [evidenceId],
      reviewPointers: [],
      officialUrl: null,
      editorialSummary: editorialSummary(
        city.cityId === "TOKYO" ? "Tokyo" : "Seoul",
        category,
        names,
      ),
      publicationStatus: "PUBLISHED",
      checkedAt,
    },
    evidence: {
      evidenceId,
      sourceId: sourceRecord.sourceId,
      placeId,
      evidenceTier: "A_OFFICIAL_OPEN",
      supportedClaims: ["NAME", "COORDINATES", "CATEGORY"],
      sourceUrl: objectUrl(element),
      sourceTitle: `OpenStreetMap ${element.type}/${element.id}: ${names.en ?? names.ja ?? names.ko}`,
      rightsBasis: "ODBL_OPEN_DATA_WITH_ATTRIBUTION",
      checkedAt,
      reviewDueAt,
      editorialSummary: editorialSummary(
        city.cityId === "TOKYO" ? "Tokyo" : "Seoul",
        category,
        names,
      ),
      publicationStatus: "APPROVED",
    },
    index,
  };
}

function selectRecords(city, elements) {
  const records = elements
    .map((element, index) => toRecord(city, element, index))
    .filter(Boolean)
    .sort((left, right) => {
      const leftKey = `${left.place.zoneId}:${left.place.category}:${left.place.placeId}`;
      const rightKey = `${right.place.zoneId}:${right.place.category}:${right.place.placeId}`;
      return leftKey.localeCompare(rightKey);
    });
  const unique = [];
  const keys = new Set();
  for (const record of records) {
    const key = `${record.place.names.en ?? record.place.names.ja ?? record.place.names.ko}:${record.place.coordinates.latitude.toFixed(5)}:${record.place.coordinates.longitude.toFixed(5)}`;
    if (keys.has(key)) continue;
    keys.add(key);
    unique.push(record);
  }
  const byZone = new Map();
  for (const record of unique) {
    const zoneRecords = byZone.get(record.place.zoneId) ?? [];
    zoneRecords.push(record);
    byZone.set(record.place.zoneId, zoneRecords);
  }
  const selected = [];
  const selectedIds = new Set();
  for (const zone of Object.keys(city.zones)) {
    for (const record of (byZone.get(zone) ?? []).slice(0, 6)) {
      selected.push(record);
      selectedIds.add(record.place.placeId);
    }
  }
  for (const record of unique) {
    if (selected.length >= 80) break;
    if (!selectedIds.has(record.place.placeId)) {
      selected.push(record);
      selectedIds.add(record.place.placeId);
    }
  }
  if (selected.length < 75)
    throw new Error(`${city.cityId} yielded only ${selected.length} usable records.`);
  return selected.slice(0, 80);
}

function haversineKm(left, right) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(right[0] - left[0]);
  const dLon = toRadians(right[1] - left[1]);
  const lat1 = toRadians(left[0]);
  const lat2 = toRadians(right[0]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeMatrix(city) {
  const zones = Object.keys(city.zones);
  const routes = [];
  for (const originZoneId of zones) {
    for (const destinationZoneId of zones) {
      if (originZoneId === destinationZoneId) continue;
      const distanceKm = haversineKm(city.zones[originZoneId], city.zones[destinationZoneId]);
      const durationMinutes = Math.max(10, Math.ceil((distanceKm * 2.5 + 10) / 5) * 5);
      routes.push({
        originZoneId,
        destinationZoneId,
        mode: "TRANSIT_ESTIMATE",
        durationMinutes,
        confidence: "LOW",
      });
    }
  }
  return {
    cityId: city.cityId,
    routeMatrixVersion: `route-osm-centroid-${checkedAt}`,
    checkedAt,
    methodology:
      "CURATED_ZONE_MATRIX_FROM_OSM_COORDINATES: directional estimates are conservative editorial bounds derived from zone centroids; they are not provider travel times.",
    sourceRefs: [sourceRecord.sourceId],
    zones,
    routes,
  };
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  await mkdir(join(outputRoot, "sources"), { recursive: true });
  await mkdir(join(outputRoot, "evidence", "tokyo"), { recursive: true });
  await mkdir(join(outputRoot, "evidence", "seoul"), { recursive: true });
  await mkdir(join(outputRoot, "catalog", "tokyo"), { recursive: true });
  await mkdir(join(outputRoot, "catalog", "seoul"), { recursive: true });
  await mkdir(join(outputRoot, "routes"), { recursive: true });
  await writeJson(join(outputRoot, "sources", `${sourceRecord.sourceId}.json`), sourceRecord);
  const counts = {};
  for (const city of citySpecs) {
    const elements = await fetchElements(city);
    const records = selectRecords(city, elements);
    counts[city.cityId] = records.length;
    for (const record of records) {
      await writeJson(
        join(outputRoot, "catalog", city.directory, `${record.place.placeId}.json`),
        record.place,
      );
      await writeJson(
        join(outputRoot, "evidence", city.directory, `${record.evidence.evidenceId}.json`),
        record.evidence,
      );
    }
    await writeJson(join(outputRoot, "routes", `${city.directory}.json`), routeMatrix(city));
  }
  await writeFile(
    join(outputRoot, "NOTICE.md"),
    `# Catalog data notice\n\nThis catalog imports only named OpenStreetMap objects' names, coordinates, and tag-derived categories. It does not import reviews, photos, user profiles, HTML, snippets, opening hours, prices, or accessibility claims.\n\nOpenStreetMap data is © OpenStreetMap contributors and is available under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright). The public application must display this attribution. Derived database distribution must preserve the applicable ODbL obligations.\n\nImport checked at: ${checkedAt}. Source query endpoint: ${overpassEndpoint}.\n`,
    "utf8",
  );
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total < 150 || total > 250) throw new Error(`Generated ${total} places; expected 150-250.`);
  console.log(JSON.stringify({ checkedAt, source: sourceRecord.sourceId, counts, total }, null, 2));
}

await main();
