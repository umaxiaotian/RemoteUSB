# Architecture

RemoteUSB keeps the renderer separate from Windows process, file and driver operations. The renderer can request typed operations, but only the main process can invoke a backend or access the operating system.

```mermaid
flowchart LR
    Renderer[React renderer] --> Preload[Sandboxed preload]
    Preload --> IPC[Validated typed IPC]
    IPC --> Main[Electron main process]
    Main --> Service[USB service]
    Main --> Store[Settings and history store]
    Main --> Logger[Redacted rotating logger]
    Service --> Backend{USB backend}
    Backend --> Mock[Mock backend]
    Backend --> Client[USB/IP client]
    Backend --> Server[USB/IP server]
    Client --> Windows[Windows USB stack]
    Server --> Windows
```

## Request boundary

```mermaid
sequenceDiagram
    participant UI as React renderer
    participant Bridge as Preload bridge
    participant Main as Main process
    participant Service as USB service
    participant OS as Windows / USB/IP

    UI->>Bridge: Typed request
    Bridge->>Main: Context-isolated IPC
    Main->>Main: Validate sender and request
    Main->>Service: Execute operation
    Service->>OS: Validated process or file operation
    OS-->>Service: Result
    Service-->>Main: Snapshot or typed error
    Main-->>Bridge: Validated response
    Bridge-->>UI: Render state
```

The main process validates request and response schemas, checks the IPC sender and never exposes arbitrary shell commands. Backend processes use fixed argument arrays, `execFile`, `shell: false`, timeouts and output limits.

## State and persistence

```mermaid
stateDiagram-v2
    [*] --> Available
    Available --> Connecting: connect
    Connecting --> Connected: backend success
    Connecting --> Error: backend failure
    Connected --> Disconnecting: disconnect
    Disconnecting --> Available: backend success
    Disconnecting --> Error: backend failure
    Error --> Connecting: retry
    Connected --> Reconnecting: connection lost
    Reconnecting --> Connected: retry success
    Reconnecting --> Error: retry failure
```

Device operations are serialized per device. Refresh operations are coalesced and do not overwrite an operation already in progress. Settings are schema-validated, written to a temporary file and atomically renamed. Invalid existing data is preserved with an `.invalid-<timestamp>` suffix.

The mock backend uses the same typed boundary and service flow, so Demo Mode does not need USB/IP executables or drivers.
