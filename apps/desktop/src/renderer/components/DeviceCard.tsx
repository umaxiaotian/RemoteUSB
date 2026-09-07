import { Alert, Badge, Button, Card, Collapse, Descriptions, Flex, Switch, Typography } from 'antd';
import { Cable, HardDrive, Printer, Camera, Headphones, Mouse, CreditCard, Cpu, Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RemoteUsbDevice, UsbConnection } from '../../../../../packages/core/models';
const icons = { Serial: Cable, Storage: HardDrive, Printer, Camera, Audio: Headphones, HID: Mouse, 'Smart Card': CreditCard, 'Debug Probe': Cpu, Unknown: Usb };
/** Ant Designの状態表示・折りたたみ・操作部品を組み合わせる。 */
export function DeviceCard({ device, connection, autoReconnect, technical, waiting, onConnect, onDisconnect, onReconnect }: {
  device: RemoteUsbDevice; connection?: UsbConnection; autoReconnect: boolean; technical: boolean; waiting?: boolean;
  onConnect: () => void; onDisconnect: () => void; onReconnect: (enabled: boolean) => void;
}) {
  const { t } = useTranslation(); const Icon = icons[device.type];
  const busy = ['Connecting', 'Disconnecting'].includes(device.state);
  const items = [{ key: 'ids', label: t('Vendor / Product'), children: device.vid + ':' + device.pid }, { key: 'bus', label: t('Bus ID'), children: device.busId }, ...(connection ? [{ key: 'port', label: t('Local port'), children: connection.port }] : [])];
  return <article aria-label={device.name} aria-busy={busy}><Card size="small" className={`device-card ${connection ? 'connected' : ''}`}>
    <Flex gap={12} align="center"><div className="device-icon"><Icon size={26} strokeWidth={1.5} /></div><div><Typography.Text strong>{device.name}</Typography.Text><div><Typography.Text type="secondary">{device.manufacturer}</Typography.Text></div></div></Flex>
    <Flex justify="space-between" align="center" className="device-status"><span role="status"><Badge status={busy ? 'processing' : device.state === 'Error' ? 'error' : connection || device.state === 'Available' ? 'success' : 'default'} text={t(waiting ? 'Waiting for server' : device.state)} /></span><Typography.Text type="secondary">{t(device.type)}</Typography.Text></Flex>
    {connection?.windowsDevice && <Typography.Paragraph type="secondary">{t('Windows device')}: {connection.windowsDevice}</Typography.Paragraph>}
    {device.error && <Alert type="error" showIcon title={t(device.error.code)} />}
    <Flex className="device-actions" justify="space-between" align="start" gap={12}><Collapse ghost size="small" defaultActiveKey={technical ? ['details'] : []} items={[{ key: 'details', label: t('Details'), children: <><Descriptions size="small" column={1} items={items} />{device.error && <pre>{device.error.code}{'\n'}{device.error.details}</pre>}</> }]} /><Button type={connection ? 'default' : 'primary'} aria-label={t(busy ? device.state : connection ? 'Disconnect' : device.state === 'Error' ? 'Retry' : 'Connect')} loading={busy} disabled={device.state === 'Unavailable' || busy} onClick={connection ? onDisconnect : onConnect}>{t(busy ? device.state : connection ? 'Disconnect' : device.state === 'Error' ? 'Retry' : 'Connect')}</Button></Flex>
    {(connection || autoReconnect) && <Flex className="reconnect-row" justify="space-between" align="center"><Typography.Text type="secondary">{t('Auto reconnect')}</Typography.Text><Switch size="small" aria-label={t('Auto reconnect')} checked={autoReconnect} onChange={onReconnect} /></Flex>}
  </Card></article>;
}
