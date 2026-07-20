# TVING Watch History Plus — Chrome Web Store Permissions

Chrome Web Store 심사 시 각 권한의 사용 이유를 설명합니다.

---

## permissions

| 권한 | 설명 |
|------|------|
| `cookies` | TVING 시청 내역 API 호출 시 로그인 인증 쿠키를 자동으로 포함하여 전송합니다. 사용자가 TVING에 로그인한 상태에서만 시청 내역을 불러올 수 있습니다. |
| `webNavigation` | TVING은 Next.js 기반 SPA(Single Page Application)로, 페이지 이동 시 URL만 변경되고 새로고침이 발생하지 않습니다. `webNavigation` 권한을 통해 URL 변경을 감지하여 해당 페이지에서 시청 내역을 표시합니다. |
| `scripting` | TVING SPA에서 URL 변경 시 새로운 페이지로 인식되어 content script를 자동 주입할 수 없습니다. `scripting` 권한을 통해 background script에서 동적으로 content script를 주입하여 SPA 네비게이션을 지원합니다. |

## host_permissions

| 권한 | 설명 |
|------|------|
| `https://api.tving.com/*` | TVING 시청 내역을 불러오기 위해 TVING API 서버에 HTTP 요청을 전송합니다. Manifest V3에서는 cross-origin 요청 시 host_permissions에 해당 호스트를 명시해야 합니다. |
| `https://www.tving.com/*` | `chrome.scripting.executeScript`로 content script를 주입하려면 해당 호스트에 대한 권한이 필요합니다. `content_scripts.matches`만으로는 SPA 내 동적 주입이 불가능합니다. |
