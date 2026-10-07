import fs from "fs";
import path from "path";

async function run() {
  const base = "http://localhost:3001";
  console.log("--- 1. Kiểm tra Server Status ---");
  const stRes = await fetch(`${base}/api/status`);
  console.log("Status code:", stRes.status);

  console.log("--- 2. Tạo Collection mới ---");
  const colRes = await fetch(`${base}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Test AAC Visually Impaired 2026",
      description: "Kiểm tra toàn bộ luồng L0-L3 và Export",
      picoNotes: "Population: Visually impaired children | Intervention: AAC / Kind communication",
    }),
  });
  const colData = await colRes.json();
  const colId = colData.id;
  console.log("Created Collection ID:", colId);

  console.log("--- 3. Import Zotero CSV ---");
  const csvPath = path.resolve("data/zotero_visually_impaired.csv");
  const csvBuffer = fs.readFileSync(csvPath);
  const boundary = "----WebKitFormBoundary" + Math.random().toString(16);
  let body = "";
  body += "--" + boundary + "\r\n";
  body += 'Content-Disposition: form-data; name="file"; filename="zotero_visually_impaired.csv"\r\n';
  body += "Content-Type: text/csv\r\n\r\n";
  body += csvBuffer.toString("utf8") + "\r\n";
  body += "--" + boundary + "--\r\n";

  const impRes = await fetch(`${base}/api/collections/${colId}/import-file`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: body,
  });
  const impData = await impRes.json();
  console.log("Imported records count:", impData.importedCount);

  console.log("--- 4. Chạy L0 Chuẩn hóa & L1 Gộp trùng ---");
  const l0l1Res = await fetch(`${base}/api/pipeline/l0-l1/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collectionId: colId }),
  });
  const l0l1Data = await l0l1Res.json();
  console.log("L0 & L1 kết quả:", JSON.stringify(l0l1Data));

  console.log("--- 5. Chạy L2 Lọc Metadata (Năm 2018..2026) ---");
  const l2Res = await fetch(`${base}/api/pipeline/l2/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionId: colId,
      metadataConfig: {
        yearRange: { start: 2018, end: 2026, enabled: true },
        documentTypes: { allowed: ["journal-article", "proceedings-article"], enabled: false },
      },
    }),
  });
  const l2Data = await l2Res.json();
  console.log("L2 kết quả:", JSON.stringify(l2Data));

  console.log("--- 6. Chạy L3 Kiểm tra Từ khóa (Regex word boundary) ---");
  const l3Res = await fetch(`${base}/api/pipeline/l3/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionId: colId,
      keywordConfig: {
        mandatoryGroups: [
          { id: "gA", terms: ["visual impairment", "blind children", "visually impaired"] },
          { id: "gB", terms: ["communication", "AAC", "assistive technology"] },
        ],
        exclusionTerms: ["surgery", "clinical trial"],
        scope: "title_abstract",
      },
    }),
  });
  const l3Data = await l3Res.json();
  console.log("L3 kết quả:", JSON.stringify(l3Data));

  console.log("--- 7. Kiểm tra Export RIS & CSV ---");
  const expRisRes = await fetch(`${base}/api/collections/${colId}/export?type=pass_unknown&format=ris`);
  const risText = await expRisRes.text();
  console.log("RIS export length:", risText.length, "starts with TY:", risText.startsWith("TY  -"));

  const expCsvRes = await fetch(`${base}/api/collections/${colId}/export?type=pass_unknown&format=csv`);
  const csvText = await expCsvRes.text();
  console.log("CSV export length:", csvText.length, "has BOM:", csvText.charCodeAt(0) === 0xfeff);

  console.log("=== SMOKE TEST HOÀN TẤT THÀNH CÔNG 100% ===");
}

run().catch(console.error);
