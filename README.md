# The Ultimate Workdesk v0.4.1

A light, white-and-sky-blue workspace for organising everyday work.

## Included
- Overview dashboard with task progress and due-date-sorted upcoming tasks
- Task manager with priority, due dates, completion, filtering and deletion
- Daily planner with date/time ordering
- Local client records and notes
- Manual lead tracker
- Proposal draft builder with copy action
- Manual opportunity tracker
- Local persistence using `chrome.storage.local`
- Save/load error feedback and safer handling of stored records

## Known limitations
Automatic lead collection from Maps or business directories, external opportunity monitoring, notifications, AI-powered proposal generation, AI trust scoring, cloud sync, accounts and multi-device access are not implemented. These require additional services, API access, backend infrastructure, permissions and security work. This release does not claim those integrations are active.

## Install in desktop Chrome
1. Extract the ZIP to a folder.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.

Chrome for Android does not directly support installing Chrome extensions. This package is intended for desktop Chrome testing.

## Data
This version stores workspace records locally in the browser profile through `chrome.storage.local`. Removing the extension or clearing its stored data may remove those records. There is no cloud backup in this release.
