import { Alert, Badge, Button, Card, Flex, Popconfirm, Switch, Typography } from 'antd';
import { Server, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BackendError, UsbServer } from '../../../../../packages/core/models';
/** サーバー操作をAnt Designの確認・入力部品で表示する。 */
export function ServerCard({ server, error, onEdit, onRemove, onTest, onToggle }: { server: UsbServer; error?: BackendError; onEdit: () => void; onRemove: () => void; onTest: () => void; onToggle: () => void }) {
  const { t } = useTranslation();
  return <article aria-label={server.name}><Card size="small"><Flex gap={16} align="center" wrap><Server size={25} /><div className="grow"><Typography.Text strong>{server.name}</Typography.Text><div><Typography.Text type="secondary">{server.hostname}:{server.port}</Typography.Text></div><Badge status={error ? 'error' : server.enabled && server.lastSeenAt ? 'success' : 'default'} text={t(!server.enabled ? 'Disabled' : error ? 'Offline' : server.lastSeenAt ? 'Online' : 'Not checked')} /></div><Flex gap={8} align="center" wrap><Switch checked={server.enabled} aria-label={t('Enabled')} onChange={onToggle} /><Button onClick={onTest}>{t('Test Connection')}</Button><Button icon={<Pencil size={15} />} aria-label={t('Edit') + ' ' + server.name} onClick={onEdit} /><Popconfirm title={t('removeConfirm')} onConfirm={onRemove}><Button danger icon={<Trash2 size={15} />} aria-label={t('Remove') + ' ' + server.name} /></Popconfirm></Flex></Flex>{error && <Alert type="error" title={t(error.code)} />}</Card></article>;
}
