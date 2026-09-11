# RemoteUSB

[English](README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Electron, React, TypeScript, Ant Design으로 만든 Windows 11 스타일의 Windows용 USB/IP 데스크톱 클라이언트입니다.

현재 MVP 단계입니다. 드라이버 없이 데모 모드를 사용하거나 **usbip-win2 0.9.8.0** 백엔드로 공유 USB 장치에 연결할 수 있습니다. 실제 드라이버 설치와 USB 하드웨어 연결은 별도의 검증이 필요합니다.

## 주요 기능

- 장치 목록, 검색, 연결 상태, 연결/해제 및 진단 정보.
- 서버 추가, 편집, 삭제, 활성화/비활성화 및 연결 테스트.
- 장치별 자동 재연결. 지수 백오프의 최대 대기 시간은 5분입니다.
- 영어, 일본어, 한국어, 중국어 간체 지원. 트레이와 알림에도 적용되며 시스템 언어를 따를 수 있습니다.
- 밝게, 어둡게, 시스템 테마. Windows 11 빌드 22621 이상에서 네이티브 Mica 지원.
- 트레이, 알림, 설정, 기록, 창 위치와 크기 저장.
- 드라이버 없이 개발과 시연에 사용할 수 있는 모의 백엔드.

## 스크린샷

실제 Electron 앱을 모의 백엔드로 실행하여 촬영했습니다.

![밝은 테마](docs/screenshots/devices-light.png)
![어두운 테마](docs/screenshots/devices-dark.png)

## 요구 사항

- Windows 11 x64.
- 개발 환경: Node.js 24 LTS, pnpm 10.32.1.
- 실제 연결: 설치된 usbip-win2 클라이언트, DLL, 드라이버 및 별도로 구성한 USB/IP 서버.
- 데모 모드에는 드라이버, 관리자 권한 또는 USB 장치가 필요하지 않습니다.

## 설치

소스에서 Windows 설치 프로그램을 빌드합니다.

```powershell
pnpm install
pnpm package
```

NSIS 설치 프로그램이 `release/RemoteUSB-Setup-0.1.0.exe`에 생성됩니다. RemoteUSB 릴리스 빌드는 기본적으로 서명되지 않습니다.

**공식 USBip 0.9.8.0 x64 설치 프로그램을 수정 없이 포함**합니다. 설치 중 USBip 설치를 선택하면 SHA-256과 Authenticode 서명을 검증한 후 공식 설치 화면을 엽니다. 관리자 권한, 구성 요소 선택 및 재시작 안내를 따르세요. 무인 설치에서는 USBip 설치 프로그램을 실행하지 않습니다.

**USBip 설치 중 USB 허브가 재시작되어 USB 장치가 잠시 중단될 수 있습니다. USB 저장 장치 전송과 통화를 먼저 마치세요.** RemoteUSB는 Secure Boot나 테스트 서명 설정을 변경하지 않습니다. USBip은 독립적으로 설치되며 RemoteUSB를 제거해도 함께 제거되지 않습니다.

EXE, 설치 프로그램과 트레이에는 RemoteUSB 아이콘을 사용합니다. 설치 프로그램은 알림 이름을 RemoteUSB로 등록합니다. Electron으로 개발 실행할 때는 알림 발신자 표시가 다를 수 있습니다.

## 개발 및 데모 모드

```powershell
npm.cmd install -g pnpm@10.32.1
pnpm install
pnpm dev:mock
```

실제 백엔드는 `pnpm dev`로 실행합니다. PowerShell이 스크립트를 차단하면 `pnpm.cmd`와 `npm.cmd`를 사용하세요. 실행 정책을 변경할 필요는 없습니다.

데모에는 시리얼, Arduino, 디버그 프로브, 스마트 카드, 프린터 및 저장 장치 샘플이 있습니다. 작업에는 750 ms의 모의 지연이 적용됩니다. 설정의 데모 오류 확률을 변경하여 장애를 재현할 수 있습니다.

데모 설정은 `demo.json`, 실제 설정은 `settings.json`에 저장됩니다. 실제 백엔드로 돌아가려면 `--mock`과 `REMOTEUSB_BACKEND=mock` 없이 다시 시작하세요. 빌드된 앱은 `pnpm exec electron . --mock`으로도 실행할 수 있습니다.

## USB/IP 설정

1. RemoteUSB 설치 중 또는 설정/앱 정보의 동봉 도구에서 USBip 설치 프로그램을 실행합니다.
2. 실행 파일 경로를 비워 두면 `Program Files/USBip/usbip.exe`, 다음으로 `PATH`를 검색합니다. 사용자 지정 설치 위치는 절대 경로를 지정하세요. DLL은 CLI와 같은 위치에 두세요.
3. USB/IP 서버에서 장치를 공유하고 RemoteUSB에 호스트 이름과 포트를 추가합니다. 기본 포트는 3240입니다.
4. 연결을 테스트하고 장치 목록을 새로 고친 후 연결을 선택합니다.

usbip-win2는 서버가 아닌 **Windows 클라이언트**입니다. 기존 cezanne 클라이언트, `usbipd.exe`, `attacher.exe`는 포함하지 않습니다. CLI가 허용하는 TCP 포트 범위는 1024–65535입니다.

`pnpm vendor:fetch`는 고정된 배포 파일을 다시 다운로드하고, `pnpm vendor:verify`는 동봉 파일의 해시를 검증합니다. [동봉 소프트웨어 안내](vendor/usbip-win2/README.md), [매니페스트](vendor/usbip-win2/manifest.json), [백엔드 상세 문서](docs/usbip-backend.md)(일본어)를 참고하세요.

## 테스트 및 패키징

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm package
```

단위 테스트는 파싱, 입력 검증, 오류, 데이터 저장, 서비스, 프로세스 제한, i18n 및 React UI를 확인합니다. Electron E2E는 모의 백엔드로 서버 작업, 연결, 4개 언어, 테마 저장 및 125/150/200% 배율을 확인합니다. E2E에는 데스크톱 세션이 필요합니다.

Windows CI는 린트, 타입 검사, 테스트, 빌드 및 E2E를 실행합니다. 이 검증만으로 실제 USB 하드웨어 호환성을 보장하지는 않습니다.

## GitHub 릴리스

[Release 워크플로](.github/workflows/release.yml)는 두 가지 방법을 지원합니다.

- **수동 실행:** Actions → Release → Run workflow에서 배포할 브랜치를 선택하고 `package.json`과 일치하는 태그(예: `v0.1.0`)를 입력합니다. 검증 성공 후 테스트한 커밋에 태그를 만들고 릴리스를 게시합니다.
- **태그 푸시:** 버전이 일치하는 태그를 푸시하면 해당 커밋을 빌드하고 게시합니다.

설치 프로그램, SHA-256 목록, usbip-win2 소스와 라이선스를 첨부합니다. 버전 불일치, 다른 커밋을 가리키는 기존 태그 및 기존 릴리스 덮어쓰기는 거부합니다. 저장소에서 GitHub Actions를 활성화하세요. 저장소 쓰기 권한은 게시 작업에만 부여됩니다.

## 제한 사항

- 실제 드라이버 설치, 하드웨어 연결/해제, 드라이버 업데이트와 제거는 대상 환경에서 검증해야 합니다.
- 현재 앱 세션에서 시작한 연결만 관리합니다. 포트와 연결 대상을 비교하지만 외부 CLI 동시 사용이나 충돌 후 연결 복구는 지원하지 않습니다.
- COM/PnP 매칭과 커널 드라이버 서명 분류는 구현되지 않았습니다.
- 자동 재연결에는 앱이 실행 중이어야 합니다. 로그인 시 자동 시작은 설치된 빌드에 적용됩니다.
- 장치 종류가 표시된다고 호환성이 보장되는 것은 아닙니다. 웹캠, 오디오, 캡처, 허브 및 저장 장치의 실제 동작은 검증되지 않았습니다.
- 네이티브 알림, 접근성 설정 및 Mica는 대상 Windows 환경에서 확인해야 합니다.

## 문제 해결

| 문제                         | 확인 사항                                                             |
| ---------------------------- | --------------------------------------------------------------------- |
| USB 지원 설정 필요           | USBip 설치, CLI 경로, DLL 및 UDE 드라이버 확인                        |
| 서버 오프라인                | 주소, 포트, 방화벽과 공유 상태를 확인한 후 새로 고침                  |
| 연결 실패                    | 다른 PC의 사용 여부, 물리적 연결과 드라이버 권한 확인; 상세 정보 열기 |
| Electron의 “bad option” 오류 | 실행 환경에서 `ELECTRON_RUN_AS_NODE` 제거                             |
| 설정 파일 손상               | 원본을 `.invalid-*`로 보존하고 기본값으로 시작                        |

설정과 로그는 Electron의 `app.getPath('userData')` 아래에 저장됩니다. 별도 테스트 폴더는 `REMOTEUSB_DATA_DIR`로 지정할 수 있습니다.

## 구조 및 보안

- `apps/desktop/src/main`: 창, 트레이, IPC, 서비스, 저장 및 로그.
- `apps/desktop/src/preload`: 샌드박스 API 브리지.
- `apps/desktop/src/renderer`: React UI.
- `packages/core`, `packages/shared`, `packages/usb-backend`: 모델, IPC/i18n 및 실제/모의 백엔드.
- `tests`, `scripts`, `vendor`: 검증, 패키징 도구 및 동봉 소프트웨어.

[설계 문서](docs/architecture.md)(일본어)를 참고하세요. 컨텍스트 격리와 샌드박스를 활성화하고 Node 통합을 비활성화합니다. IPC를 검증하고 외부 링크를 허용 목록으로 제한합니다. CLI는 셸 없이 `execFile`과 검증된 인수를 사용하며, 기본 제한은 실행 시간 10초와 출력 1 MB입니다. USB/IP는 신뢰할 수 있는 LAN 또는 VPN에서 사용하세요.

## 라이선스

RemoteUSB는 [MIT 라이선스](LICENSE)입니다. usbip-win2는 BSD-2-Clause이며 저작권 표시, 라이선스, 수정하지 않은 설치 프로그램 및 해당 소스를 포함합니다. 소스 사본에서는 공개 개발용 서명 키를 제외했습니다. 재배포할 때 동봉된 고지 사항을 유지하세요. [타사 소프트웨어 고지](THIRD_PARTY_NOTICES.md)를 참고하세요.

## 로컬 USB 공유

**USB 공유** 화면에서 이 PC의 USB 장치를 확인하고 [usbipd-win](https://github.com/dorssel/usbipd-win)으로 공유하거나 공유를 중지할 수 있습니다. 공식 usbipd-win 5.3.0 MSI가 vendor/usbipd-win에 포함됩니다. 설치 마법사의 USB 구성 요소 화면에서 서버를 선택하거나 USB 공유 화면에서 동봉 도구를 여세요. 클라이언트와 서버는 순서대로 설치되며 기본적으로 둘 다 선택됩니다. 불필요한 항목은 해제할 수 있습니다. Program Files 또는 PATH에서 검색하며 Bus ID, VID:PID, 공유 상태 및 연결된 클라이언트를 표시합니다.

공유 작업은 화면 중앙의 확인 대화상자를 거쳐 해당 작업에만 Windows UAC 관리자 권한을 요청합니다. 앱을 종료해도 공유는 유지되며 공유 중지 시 원격 연결이 끊어질 수 있습니다. 신뢰할 수 있는 네트워크에서 usbipd 서비스와 방화벽을 구성하세요. 데모 모드는 PC를 변경하지 않습니다. 실제 하드웨어와 UAC 동작은 수동 검증이 필요합니다. [구현 메모](docs/usb-server.md)를 참고하세요.
