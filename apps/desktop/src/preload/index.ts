import { contextBridge, ipcRenderer } from 'electron';
import { IPC, requestSchema, responseSchema, type RemoteUsbApi } from '../../../../packages/shared/ipc';
const api: RemoteUsbApi = {
  request: async request => responseSchema.parse(await ipcRenderer.invoke(IPC.request, requestSchema.parse(request))),
  subscribe: listener => { const callback = () => listener(); ipcRenderer.on(IPC.changed, callback); return () => { ipcRenderer.removeListener(IPC.changed, callback); }; }
};
contextBridge.exposeInMainWorld('remoteUsb', api);
