// Background Service Worker cho Scholar Extractor
// Dong bo trang thai Background Jobs tu backend, giu tien trinh khi dong popup hoac chuyen tab

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Scholar Extractor] Background Service Worker da khoi tao.");
  // Tao alarm kiem tra job moi 30 giay
  chrome.alarms.create("checkJobStatus", { periodInMinutes: 0.5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkJobStatus") {
    try {
      const res = await fetch("http://localhost:3001/api/jobs/active");
      if (!res.ok) return;

      const data = await res.json();
      const activeJob = data.activeJob;

      if (activeJob) {
        if (activeJob.status === "running") {
          chrome.action.setBadgeText({ text: `${activeJob.stage} ${activeJob.progress}%` });
          chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
        } else if (activeJob.status === "paused") {
          chrome.action.setBadgeText({ text: "PAUSE" });
          chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
        } else if (activeJob.status === "failed") {
          chrome.action.setBadgeText({ text: "ERR" });
          chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
        }
      } else {
        chrome.action.setBadgeText({ text: "" });
      }
    } catch {
      // Backend offline
      chrome.action.setBadgeText({ text: "" });
    }
  }
});
